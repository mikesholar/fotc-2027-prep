import json, subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
PLAN = ROOT / "src" / "data" / "plan.json"


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
