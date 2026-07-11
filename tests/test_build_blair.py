import json, subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
BLAIR = ROOT / "src" / "data" / "blair.json"


def load_blair():
    subprocess.run(["python3", "scripts/build-blair.py"], cwd=ROOT, check=True)
    return json.loads(BLAIR.read_text())


def test_blair_maxes_are_seven_positive_ints():
    b = load_blair()
    assert set(b["defaultMaxes"]) == {
        "backSquat", "frontSquat", "bench", "strictPress",
        "deadlift", "cleanJerk", "snatch",
    }
    assert b["defaultMaxes"]["backSquat"] == 205
    assert b["defaultMaxes"]["snatch"] == 110
    assert all(isinstance(v, int) and v > 0 for v in b["defaultMaxes"].values())


def test_solid_count_is_nine():
    assert load_blair()["solidCount"] == 9


def test_skills_are_the_three_novice_gaps_no_first():
    b = load_blair()
    assert [s["movement"] for s in b["skills"]] == ["Pull-ups", "Wall walk", "Toes-to-bar"]
    assert [s["status"] for s in b["skills"]] == ["No", "No", "Some"]


def test_every_skill_has_a_nonempty_progression():
    for s in load_blair()["skills"]:
        assert isinstance(s["progression"], list) and len(s["progression"]) >= 1
        assert all(isinstance(step, str) and step for step in s["progression"])


def test_qualifier_block_is_b3():
    assert load_blair()["qualifierBlock"] == "B3 Qualifier"
