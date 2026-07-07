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


def find_day(plan, iso):
    return next(d for d in plan["days"] if d["date"] == iso)


def test_main_lift_loads_match_printed_sheet_values():
    # Independent gate: liftKey comes from the NAMED lead line, the load from that
    # lift's max, cross-checked against the SEPARATELY printed sheet load cell.
    plan = load_plan()
    checked = 0
    for d in plan["days"]:
        for s in d["sections"]:
            if s["type"] != "mainLift":
                continue
            mx = LIFT_MAX[s["liftKey"]]
            printed = {round(pct, 5): load for pct, load in s["printedLoads"]}
            for st in s["sets"]:
                if "pct" not in st:
                    continue
                key = round(st["pct"], 5)
                if key in printed:
                    assert round5(st["pct"] * mx) == printed[key], (d["date"], st, printed[key])
                    checked += 1
    assert checked > 50  # sanity: a meaningful number of sets cross-checked vs the sheet


def test_normal_day_main_lift_is_back_squat_with_pinned_loads():
    plan = load_plan()
    d = find_day(plan, "2026-07-20")  # Mon Jul 20, Lower A
    main = next(s for s in d["sections"] if s["type"] == "mainLift")
    assert main["liftKey"] == "backSquat"
    loads = [st["expectedLoad"] for st in main["sets"] if "expectedLoad" in st]
    assert loads == [220, 225, 235, 180]


def test_push_press_day_is_strict_press_not_deadlift():
    plan = load_plan()
    d = find_day(plan, "2026-09-04")  # lead work PUSH PRESS; load cell is a DL accessory
    mains = [s for s in d["sections"] if s["type"] == "mainLift"]
    assert len(mains) == 1
    assert mains[0]["liftKey"] == "strictPress"
    assert all("expectedLoad" not in st for st in mains[0]["sets"])  # no % work, all notes
    assert [s["label"] for s in d["sections"]].count("Main Lift") == 1
    assert any(s["type"] == "text" and "deadlift @ 75%" in s["text"] for s in d["sections"])


def test_dec29_primer_main_lift_is_bench_not_cleanjerk():
    plan = load_plan()
    d = find_day(plan, "2026-12-29")  # "BENCH 3x2 @ 80% · E2MOM ... C&J @ 70%"
    main = next(s for s in d["sections"] if s["type"] == "mainLift")
    assert main["liftKey"] == "bench"


def _main_pct_loads(day):
    main = next(s for s in day["sections"] if s["type"] == "mainLift")
    return main["liftKey"], [st["expectedLoad"] for st in main["sets"] if "expectedLoad" in st]


def test_prose_buried_front_squat_sim_is_recovered():
    plan = load_plan()
    # "... FS first: FRONT SQUAT 3x3 @ 80%", load cell "80% -> 180"
    key, loads = _main_pct_loads(find_day(plan, "2026-08-29"))
    assert key == "frontSquat" and 180 in loads


def test_front_squat_sim_with_heavy_single_is_recovered():
    plan = load_plan()
    # "FS first: FRONT SQUAT 1x1 heavy for day + 3x3 @ 80%"
    key, loads = _main_pct_loads(find_day(plan, "2026-09-05"))
    assert key == "frontSquat" and 180 in loads


def test_backoff_deadlift_line_is_recovered():
    plan = load_plan()
    # title "DEADLIFT + BOX JUMP...", "BACK-OFF BARBELL: E:30 x 10: 1 deadlift @ 80%"
    key, loads = _main_pct_loads(find_day(plan, "2026-12-18"))
    assert key == "deadlift" and 250 in loads


def test_scheme_first_lowercase_back_squat_is_recovered():
    plan = load_plan()
    # "3x2 back squat @ 70% · EMOM 4: ..."  (lowercase, scheme before the lift name)
    key, loads = _main_pct_loads(find_day(plan, "2027-01-11"))
    assert key == "backSquat" and 195 in loads


def test_main_lift_day_count_is_pinned():
    # Guards against a silent lead-line/backsolve regression.
    plan = load_plan()
    n = sum(1 for d in plan["days"] for s in d["sections"] if s["type"] == "mainLift")
    assert n == 72


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
