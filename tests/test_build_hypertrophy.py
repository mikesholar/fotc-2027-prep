import json, math, subprocess, pathlib, collections

ROOT = pathlib.Path(__file__).resolve().parents[1]
PLAN = ROOT / "src" / "data" / "hypertrophy.json"

WEEKDAY_SESSIONS = {
    "MON": "Lower A — Squat",
    "TUE": "Upper A — Push",
    "WED": "Off — walk & mobility",
    "THU": "Upper B — Pull",
    "FRI": "Lower B — Hinge",
    "SAT": "Upper C — Delts & Arms",
    "SUN": "Off — rest",
}
BUILD_WEEKS = (1, 2, 3, 4, 6, 7, 8, 9)
DELOAD_WEEKS = (5, 10)


def round5(x):
    # Round-half-UP to the nearest 5, matching the app's TS Math.round.
    return int(math.floor(x / 5 + 0.5)) * 5


def load_plan():
    subprocess.run(["python3", "scripts/build-hypertrophy.py"], cwd=ROOT, check=True)
    return json.loads(PLAN.read_text())


def main_lifts(day):
    return [s for s in day["sections"] if s["type"] == "mainLift"]


def work_sets(section):
    return [s for s in section["sets"] if "pct" in s]


def by_week(plan):
    weeks = collections.defaultdict(list)
    for day in plan["days"]:
        weeks[day["week"]].append(day)
    return weeks


def lift_rows(plan):
    """(week, liftName) -> the single percentage work set for that lift."""
    rows = {}
    for day in plan["days"]:
        for section in main_lifts(day):
            for s in work_sets(section):
                rows[(day["week"], section["liftName"])] = s
    return rows


def test_runs_ten_weeks_of_seven_days_starting_the_monday_after_today():
    plan = load_plan()
    days = plan["days"]
    assert len(days) == 70
    assert days[0]["date"] == "2026-08-17"
    assert days[-1]["date"] == "2026-10-25"
    assert [d["date"] for d in days] == sorted(d["date"] for d in days)


def test_every_day_carries_the_metadata_the_app_renders():
    for day in load_plan()["days"]:
        assert day["dow"] in WEEKDAY_SESSIONS
        assert day["sessionTitle"] == WEEKDAY_SESSIONS[day["dow"]]
        assert day["dateLabel"] and day["weekDates"] and day["weekFocus"]
        assert day["block"] in {"Meso 1", "Meso 2"}
        assert isinstance(day["week"], int) and 1 <= day["week"] <= 10
        assert day["sections"]


def test_mesocycles_split_the_ten_weeks_in_half():
    weeks = by_week(load_plan())
    assert {d["block"] for w in range(1, 6) for d in weeks[w]} == {"Meso 1"}
    assert {d["block"] for w in range(6, 11) for d in weeks[w]} == {"Meso 2"}
    assert all(len(weeks[w]) == 7 for w in range(1, 11))


def test_the_five_training_days_program_the_source_sessions():
    weeks = by_week(load_plan())
    titles = [d["sessionTitle"] for d in weeks[1]]
    assert titles.count("Off — walk & mobility") == 1
    assert titles.count("Off — rest") == 1
    named = [t for t in titles if not t.startswith("Off")]
    assert named == ["Lower A — Squat", "Upper A — Push", "Upper B — Pull",
                     "Lower B — Hinge", "Upper C — Delts & Arms"]


def test_every_percentage_set_resolves_to_the_printed_load():
    plan = load_plan()
    maxes = plan["defaultMaxes"]
    seen = 0
    for day in plan["days"]:
        for section in main_lifts(day):
            for s in work_sets(section):
                assert s["expectedLoad"] == round5(s["pct"] * maxes[section["liftKey"]])
                assert s["expectedLoad"] > 0
                seen += 1
    assert seen == 7 * 10  # seven barbell lifts, every one of the ten weeks


def test_each_main_lift_names_its_percentage_basis():
    for day in load_plan()["days"]:
        for section in main_lifts(day):
            notes = [s["note"] for s in section["sets"] if "note" in s]
            assert notes, f"{section['liftName']} has no note row"
            assert any("1RM" in n for n in notes)


def test_derived_lifts_borrow_a_related_max_rather_than_adding_a_lift_key():
    rows = lift_rows(load_plan())
    assert ("Barbell Row" in name for _, name in rows)
    plan = load_plan()
    keys = {s["liftKey"] for d in plan["days"] for s in main_lifts(d)}
    assert keys <= {"backSquat", "frontSquat", "bench", "strictPress", "deadlift"}
    for day in plan["days"]:
        for section in main_lifts(day):
            if section["liftName"] == "Barbell Row":
                assert section["liftKey"] == "deadlift"
            if section["liftName"] == "Incline Barbell Press":
                assert section["liftKey"] == "bench"


def test_double_progression_holds_the_weight_and_climbs_the_reps():
    rows = lift_rows(load_plan())
    lifts = {name for _, name in rows}
    for lift in lifts:
        pcts = {rows[(w, lift)]["pct"] for w in (1, 2, 3, 4)}
        assert len(pcts) == 1, f"{lift} changes load mid-mesocycle"
        reps = [int(rows[(w, lift)]["scheme"].split("×")[1]) for w in (1, 2, 3, 4)]
        assert reps == sorted(reps) and reps[0] < reps[-1], f"{lift} reps do not climb"


def test_deload_weeks_halve_the_sets_at_sixty_percent_of_the_working_weight():
    rows = lift_rows(load_plan())
    for work_week, deload_week in ((4, 5), (9, 10)):
        for lift in {name for _, name in rows}:
            work, deload = rows[(work_week, lift)], rows[(deload_week, lift)]
            assert deload["pct"] == round(work["pct"] * 0.6, 3)
            work_sets_n = int(work["scheme"].split("×")[0])
            assert int(deload["scheme"].split("×")[0]) <= math.ceil(work_sets_n / 2)


def test_the_second_mesocycle_starts_heavier_than_the_first():
    rows = lift_rows(load_plan())
    for lift in {name for _, name in rows}:
        assert rows[(6, lift)]["pct"] > rows[(1, lift)]["pct"], lift


def skills_in(day):
    return [s for s in day["sections"] if s["label"] == "Skill"]


def test_skill_work_lands_four_times_a_week_and_names_both_movements():
    weeks = by_week(load_plan())
    skill_days = [d for d in weeks[1] if skills_in(d)]
    assert len(skill_days) == 5  # four training doses + the optional Wednesday hang
    names = [s["moveName"] for d in weeks[1] for s in skills_in(d)]
    assert names.count("Toes-to-bar") == 2
    assert names.count("Pull-up") == 2


def test_skill_sections_are_laid_out_like_lifts():
    for day in load_plan()["days"]:
        for section in skills_in(day):
            assert section["type"] == "movement"
            assert section["moveName"]
            assert "text" not in section
            for row in section["rows"]:
                assert set(row) == {"scheme", "note"}


def test_skill_sections_point_at_the_skills_screen_instead_of_naming_a_rung():
    for day in load_plan()["days"]:
        for section in skills_in(day):
            assert "Skills" in section["rows"][0]["note"]


def test_skill_doses_shrink_on_deload_weeks():
    weeks = by_week(load_plan())

    def opening_scheme(week, move):
        return next(s["rows"][0]["scheme"] for d in weeks[week]
                    for s in skills_in(d) if s["moveName"] == move)

    assert opening_scheme(4, "Toes-to-bar") == "4 sets"
    assert opening_scheme(5, "Toes-to-bar") == "2 sets"


def test_both_ladders_are_present_and_every_rung_is_actionable():
    plan = load_plan()
    assert [s["movement"] for s in plan["skills"]] == ["Pull-up", "Toes-to-bar"]
    for skill in plan["skills"]:
        assert skill["status"] in {"No", "Some"}
        assert len(skill["progression"]) >= 5
        for step in skill["progression"]:
            assert step["move"] and step["rx"] and step["gate"]
        assert skill["cue"]


def test_the_skills_note_replaces_the_qualifier_wording():
    plan = load_plan()
    assert "Qualifier" not in plan["skillsNote"]
    assert "qualifierBlock" not in plan
    assert "solidCount" not in plan


def test_all_seven_maxes_ship_and_none_is_flagged_an_estimate():
    plan = load_plan()
    assert plan["defaultMaxes"] == {
        "backSquat": 275, "frontSquat": 225, "bench": 195, "strictPress": 135,
        "deadlift": 315, "cleanJerk": 205, "snatch": 145,
    }
    assert len(plan["lifts"]) == 7
    assert all(lift["isEstimate"] is False for lift in plan["lifts"])


def test_training_days_open_with_prep_then_a_main_lift_and_accessories():
    for day in load_plan()["days"]:
        if day["sessionTitle"].startswith("Off"):
            continue
        labels = [s["label"] for s in day["sections"]]
        assert labels[0] == "Prep"
        assert "Main Lift" in labels
        assert "Accessory" in labels


def accessories(day):
    return [s for s in day["sections"] if s["label"] == "Accessory"]


def test_each_accessory_is_its_own_section_shaped_like_a_lift():
    weeks = by_week(load_plan())
    per_session = {d["sessionTitle"]: len(accessories(d)) for d in weeks[1]}
    assert per_session["Lower A — Squat"] == 4
    assert per_session["Upper A — Push"] == 4
    assert per_session["Upper B — Pull"] == 5
    assert per_session["Lower B — Hinge"] == 3
    assert per_session["Upper C — Delts & Arms"] == 5
    assert per_session["Off — rest"] == 0

    for day in load_plan()["days"]:
        for section in accessories(day):
            assert section["type"] == "movement"
            assert section["moveName"]
            assert "text" not in section


def test_every_accessory_opens_with_a_sets_by_reps_row():
    for day in load_plan()["days"]:
        for section in accessories(day):
            first = section["rows"][0]
            sets, reps = first["scheme"].split(" × ")
            assert int(sets) >= 1
            assert reps
            for row in section["rows"]:
                assert set(row) == {"scheme", "note"}


def test_accessory_cues_ride_in_a_labelled_row_rather_than_the_movement_name():
    bulgarian = None
    for day in load_plan()["days"]:
        for section in accessories(day):
            if section["moveName"] == "Bulgarian Split Squat (DB)":
                bulgarian = section
                break
        if bulgarian:
            break
    assert bulgarian is not None
    assert bulgarian["rows"][0] == {"scheme": "3 × 8–12", "note": "per leg"}
    assert bulgarian["rows"][-1]["scheme"] == "Cue"
    assert "rear foot on the bench" in bulgarian["rows"][-1]["note"]


def test_deload_weeks_cut_accessory_volume_too():
    weeks = by_week(load_plan())

    def accessory_sets(week):
        return sum(
            int(s["rows"][0]["scheme"].split(" × ")[0])
            for d in weeks[week]
            for s in accessories(d)
        )

    assert accessory_sets(5) < accessory_sets(4)
    assert accessory_sets(10) < accessory_sets(9)
