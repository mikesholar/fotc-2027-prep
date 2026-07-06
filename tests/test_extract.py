import json, math, subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
PLAN = ROOT / "src" / "data" / "plan.json"

LIFT_MAX = {  # mirror DEFAULT_MAXES
    "backSquat": 275, "frontSquat": 225, "bench": 195, "strictPress": 135,
    "deadlift": 315, "cleanJerk": 205, "snatch": 145,
}


def round5(x):
    # Round-half-UP to the nearest 5, matching the spreadsheet (Excel ROUND) and
    # the app's TS Math.round. Python's built-in round() is banker's rounding,
    # which diverges from the sheet at .5 boundaries (e.g. 202.5 -> 205, not 200).
    return int(math.floor(x / 5 + 0.5)) * 5


def load_plan():
    subprocess.run(["python3", "scripts/extract-plan.py"], cwd=ROOT, check=True)
    return json.loads(PLAN.read_text())


def test_block_days_have_core_metadata():
    plan = load_plan()
    days = [d for d in plan["days"] if d["block"] != "Ramp-In"]
    # 6 blocks; every day carries required fields and ISO date
    assert len(days) >= 90
    for d in days:
        assert d["date"] and d["date"][4] == "-" and d["date"][7] == "-"
        assert d["dow"] in {"MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"}
        assert d["sessionTitle"]
        assert isinstance(d["week"], int)
        assert d["weekFocus"] is not None


def test_days_are_date_sorted():
    plan = load_plan()
    dates = [d["date"] for d in plan["days"]]
    assert dates == sorted(dates)


def test_main_lift_loads_match_sheet_for_default_maxes():
    plan = load_plan()
    checked = 0
    for d in plan["days"]:
        for s in d["sections"]:
            if s["type"] != "mainLift":
                continue
            mx = LIFT_MAX[s["liftKey"]]
            for st in s["sets"]:
                if "pct" in st:
                    assert round5(st["pct"] * mx) == st["expectedLoad"], (d["date"], st)
                    checked += 1
    assert checked > 50  # sanity: we verified a meaningful number of sets


def find_day(plan, iso):
    return next(d for d in plan["days"] if d["date"] == iso)


def test_lower_a_day_has_prep_main_accessory_boxes():
    plan = load_plan()
    d = find_day(plan, "2026-07-20")  # Mon Jul 20, Lower A
    types = [s["type"] for s in d["sections"]]
    assert types[0] == "prep"
    assert "mainLift" in types
    assert types.index("prep") < types.index("mainLift")
    assert any(t == "text" for t in types)  # accessory work
    assert d["sessionTitle"].lower().startswith("lower")


def test_conditioning_day_has_only_text_sections():
    plan = load_plan()
    d = find_day(plan, "2026-07-22")  # Wed, engine test day, no barbell %
    assert all(s["type"] == "text" for s in d["sections"])
    assert len(d["sections"]) >= 1


def test_rampin_days_exist_and_are_text_only():
    plan = load_plan()
    r = [d for d in plan["days"] if d["block"] == "Ramp-In"]
    assert len(r) >= 40  # ~6 weeks x 7 days
    assert any(d["date"] == "2026-07-06" for d in r)  # today falls in ramp-in
    for d in r:
        assert all(s["type"] == "text" for s in d["sections"])
    # ramp-in sorts before block days
    first_block = min(d["date"] for d in plan["days"] if d["block"] != "Ramp-In")
    assert min(d["date"] for d in r) < first_block
