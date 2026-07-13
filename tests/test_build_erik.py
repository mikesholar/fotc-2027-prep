import json, subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
ERIK = ROOT / "src" / "data" / "erik.json"


def load_erik():
    subprocess.run(["python3", "scripts/build-erik.py"], cwd=ROOT, check=True)
    return json.loads(ERIK.read_text())


def test_erik_maxes_are_the_seven_provided():
    e = load_erik()
    assert e["defaultMaxes"] == {
        "backSquat": 350, "frontSquat": 325, "bench": 250, "strictPress": 175,
        "deadlift": 385, "cleanJerk": 250, "snatch": 165,
    }
    assert all(isinstance(v, int) and v > 0 for v in e["defaultMaxes"].values())


def test_solid_count_is_eleven_novice_yeses():
    assert load_erik()["solidCount"] == 11


def test_skills_lead_with_conditioning_then_wall_walk_and_double_unders():
    e = load_erik()
    assert [s["movement"] for s in e["skills"]] == ["Conditioning", "Wall walk", "Double-unders"]
    assert [s["status"] for s in e["skills"]] == ["No", "Some", "Some"]


def test_every_skill_has_a_nonempty_progression():
    for s in load_erik()["skills"]:
        assert isinstance(s["progression"], list) and len(s["progression"]) >= 1
        for step in s["progression"]:
            assert isinstance(step, dict) and step.get("move")
            assert step.get("rx") and step.get("gate")


def test_qualifier_block_is_b3():
    assert load_erik()["qualifierBlock"] == "B3 Qualifier"
