"""Generate Mike's 5-day hypertrophy plan from `5-day-hypertrophy-program.md`.

The source program prescribes rep ranges and reps-in-reserve, not percentages. It is a
double-progression program, so the generated data holds one percentage per lift across
the four build weeks of a mesocycle and climbs the rep target instead; the deload week
drops to 60% of that working weight at half the sets, and the next mesocycle restarts a
notch heavier.

Two lifts have no 1RM of their own (barbell row, incline bench). Rather than widening
LIFT_KEYS -- which would make the app's maxes schema reject Blair's and Erik's already
stored maxes -- they borrow a related max and print the basis in a note row.
"""

import datetime, json, math, pathlib
from typing import NamedTuple

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "data" / "hypertrophy.json"

START = datetime.date(2026, 8, 17)
WEEKS = 10
WEEKS_PER_MESO = 5
BUILD_WEEKS_PER_MESO = 4
DELOAD_LOAD_FRACTION = 0.6

DEFAULT_MAXES = {
    "backSquat": 275, "frontSquat": 225, "bench": 195, "strictPress": 135,
    "deadlift": 315, "cleanJerk": 205, "snatch": 145,
}

LIFTS = [
    {"key": "backSquat", "name": "Back Squat", "isEstimate": False},
    {"key": "frontSquat", "name": "Front Squat", "isEstimate": False},
    {"key": "bench", "name": "Bench Press", "isEstimate": False},
    {"key": "strictPress", "name": "Strict Press", "isEstimate": False},
    {"key": "deadlift", "name": "Deadlift", "isEstimate": False},
    {"key": "cleanJerk", "name": "Clean & Jerk", "isEstimate": False},
    {"key": "snatch", "name": "Snatch", "isEstimate": False},
]

DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
DOW_TITLE = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

EFFORT = {
    1: "Stop 2 reps short of failure",
    2: "Stop 2 reps short of failure",
    3: "Stop 1–2 reps short — the weight should feel familiar now",
    4: "Peak week — last set 0–1 reps short",
    5: "Nowhere near failure. This week is for recovering, not proving anything",
}

WEEK_FOCUS = {
    1: "Baseline — pick weights you can live with for four weeks. Bottom of every rep range, 2 in reserve.",
    2: "Same weights, one more rep per set. Add a set to two or three lagging exercises.",
    3: "Reps still climbing. Push closer to failure — 1–2 in reserve.",
    4: "Peak week — top of every rep range, 0–1 in reserve on the last set.",
    5: "Deload — half the sets, ~60% of the weight, nowhere near failure.",
}
MESO_2_OPENER = "New baseline — everything a notch heavier than week 1. Back to 2 in reserve."

WEEK_NOTES = {
    1: "Week 1 sets the trend line for the whole mesocycle. Pick weights you could still "
       "hit the top of the range with in four weeks, not weights that impress you today.\n"
       "Write down weight and reps for every set. If the numbers stop climbing over a "
       "month, the problem is food or sleep, not the program.",
    2: "Same weights as last week, one more rep per set. If an exercise felt easy, add a "
       "set to it — pick two or three, not everything.",
    3: "You should be within a rep or two of the top of each range. Add load only where "
       "you already own the top of the range on every set.",
    4: "Peak week. Take the last set of each exercise to 0–1 reps in reserve. Everything "
       "before that last set still stops short.",
    5: "Deload. Half the sets, roughly 60% of the weight, nothing near failure. The point "
       "is to show up in week 1 of the next block fresher and stronger.",
}

FUNDAMENTALS = (
    "Weekly check — training is about 40% of this:\n"
    "Bodyweight up 0.5–0.75 lb this week? If the scale hasn't moved in two weeks, add 200 calories.\n"
    "Protein at ~0.8–1.0 g per lb of bodyweight, every day, across 4+ meals.\n"
    "Sleeping 7–9 hours. Short sleep measurably blunts muscle gain — nothing supplements around it.\n"
    "Creatine monohydrate, 5 g, any time of day.\n"
    "Every set logged. Numbers climbing over the month?"
)


class Lift(NamedTuple):
    label: str
    name: str
    key: str
    basis: str
    sets: int
    rep_lo: int
    rep_hi: int
    pct: float
    meso_bump: float
    cue: str


class Accessory(NamedTuple):
    name: str
    sets: int
    reps: str
    unit: str
    cue: str


class Skill(NamedTuple):
    name: str
    sets: int
    per_set: str      # "" -> "N sets"; otherwise "N × <per_set>"
    lead_note: str
    rows: tuple       # ((row label, note), ...)


class Session(NamedTuple):
    title: str
    prep: str
    lifts: tuple
    accessories: tuple
    skill: object          # Skill or None
    skill_before_lifts: bool


TOES_TO_BAR = Skill(
    name="Toes-to-bar",
    sets=4, per_set="",
    lead_note="at your current rung on the Skills screen",
    rows=(("Rest", "90s — this is practice, not a finisher"),
          ("Finish", "3 × 20s hollow hold"),
          ("Cue", "stop each set 1–2 reps before the shape breaks")),
)

TOES_TO_BAR_TIRED_GRIP = Skill(
    name="Toes-to-bar",
    sets=3, per_set="",
    lead_note="at your current rung on the Skills screen",
    rows=(("Finish", "3 × 20s hollow hold"),
          ("Cue", "grip is already tired from pulling — quality over reps, and drop a "
                  "rung tonight if the shape goes")),
)

PULL_UP = Skill(
    name="Pull-up",
    sets=4, per_set="",
    lead_note="at your current rung on the Skills screen",
    rows=(("Rest", "2–3 min — do this fresh, before the pulling work"),
          ("Cue", "full hang at the bottom of every rep; stop the set while it still "
                  "looks good")),
)

PULL_UP_SECOND_DOSE = Skill(
    name="Pull-up",
    sets=2, per_set="",
    lead_note="second dose, same rung on the Skills screen",
    rows=(("Cue", "half of Thursday's volume — quality only, stop well short"),),
)

HANG = Skill(
    name="Grip work (optional)",
    sets=3, per_set="30–45s",
    lead_note="active dead hang — feeds both Skills ladders",
    rows=(("Between", "20s hollow hold"),
          ("Cue", "5 min, free progress toward pull-ups and toes-to-bar")),
)


SESSIONS = {
    "MON": Session(
        title="Lower A — Squat",
        prep="3 rounds: 10 goblet squats · 10 leg swings per side · 20 walking lunge steps · 10 bodyweight good mornings",
        lifts=(
            Lift("Main Lift", "Back Squat", "backSquat", "back squat",
                 4, 5, 8, 0.73, 0.035,
                 "Brace before you unrack, sit between the hips"),
        ),
        accessories=(
            Accessory("Bulgarian Split Squat (DB)", 3, "8–12", "per leg", "rear foot on the bench, brutal, don't skip"),
            Accessory("Romanian Deadlift", 3, "8–10", "", "push the hips back, stretch the hamstring, flat back"),
            Accessory("DB Walking Lunge", 3, "10–12", "per leg", "reverse lunge if space is tight"),
            Accessory("Standing Calf Raise", 4, "10–15", "", "toes on a plate, pause at the top"),
        ),
        skill=TOES_TO_BAR,
        skill_before_lifts=False,
    ),
    "TUE": Session(
        title="Upper A — Push",
        prep="2 rounds: 15 band pull-aparts · 10 scap push-ups · 10 arm circles each way · 8 push-ups",
        lifts=(
            Lift("Main Lift", "Bench Press", "bench", "bench",
                 4, 5, 8, 0.73, 0.025,
                 "Feet planted, bar to the lower chest"),
            Lift("Secondary Lift", "Overhead Press", "strictPress", "strict press",
                 3, 6, 10, 0.72, 0.025,
                 "Strict, standing, no leg drive"),
        ),
        accessories=(
            Accessory("Incline DB Press", 3, "8–12", "", "bench at about 30°"),
            Accessory("DB Lateral Raise", 4, "12–20", "", "light and slow, side delts live on volume"),
            Accessory("DB Flye or Deficit Push-up", 3, "10–15", "", "deep stretch at the bottom"),
            Accessory("Overhead Triceps Extension (DB/EZ)", 3, "10–15", "", "overhead loads the long head"),
        ),
        skill=None,
        skill_before_lifts=False,
    ),
    "WED": Session(
        title="Off — walk & mobility",
        prep="",
        lifts=(),
        accessories=(),
        skill=HANG,
        skill_before_lifts=True,
    ),
    "THU": Session(
        title="Upper B — Pull",
        prep="2 rounds: 15 band pull-aparts · 10 scap pull-ups · 30s active dead hang · 10 cat-cows",
        lifts=(
            Lift("Main Lift", "Barbell Row", "deadlift", "deadlift",
                 4, 6, 10, 0.45, 0.025,
                 "Torso around 45°, row to the lower ribs"),
        ),
        accessories=(
            Accessory("Chest-Supported DB Row", 3, "10–12", "", "face-down on an incline bench, takes the low back out"),
            Accessory("DB Pullover", 3, "10–15", "", "the best free-weight lat stretch you have"),
            Accessory("DB Rear Delt Flye or Band Face Pull", 4, "15–20", "", ""),
            Accessory("Barbell or DB Curl", 3, "8–12", "", ""),
            Accessory("Incline DB Curl", 3, "10–15", "", "arms hanging back, biceps stretched"),
        ),
        skill=PULL_UP,
        skill_before_lifts=True,
    ),
    "FRI": Session(
        title="Lower B — Hinge",
        prep="3 rounds: 10 dowel hip hinges · 12 glute bridges · 10 bodyweight squats · 12 calf raises",
        lifts=(
            Lift("Main Lift", "Deadlift", "deadlift", "deadlift",
                 4, 3, 6, 0.78, 0.035,
                 "Conventional or trap bar. End the set the moment the back rounds"),
            Lift("Secondary Lift", "Front Squat", "frontSquat", "front squat",
                 3, 6, 10, 0.68, 0.035,
                 "Elbows high — quad work that spares the low back after pulls"),
        ),
        accessories=(
            Accessory("Barbell Hip Thrust", 3, "8–12", "", "shoulders on the bench, pad the bar"),
            Accessory("Nordic Curl or Single-Leg RDL", 3, "8–12", "", "your hamstring-curl replacement, lower slow"),
            Accessory("Seated Calf Raise (DB on knees)", 4, "12–20", "", "different fibers than standing"),
        ),
        skill=TOES_TO_BAR_TIRED_GRIP,
        skill_before_lifts=False,
    ),
    "SAT": Session(
        title="Upper C — Delts & Arms",
        prep="2 rounds: 15 band pull-aparts · 10 scap push-ups · 12 external rotations per side",
        lifts=(
            Lift("Main Lift", "Incline Barbell Press", "bench", "bench",
                 4, 6, 10, 0.56, 0.025,
                 "Upper chest is usually the lagging area — own it"),
        ),
        accessories=(
            Accessory("Seated DB Shoulder Press", 3, "8–12", "", ""),
            Accessory("Meadows Row or Chest-Supported Row", 4, "8–12", "", "landmine setup if you have a corner"),
            Accessory("DB Lateral Raise", 4, "15–20", "", "last set, drop the weight and keep going to failure"),
            Accessory("Curl + Triceps Extension superset", 4, "10–15", "each movement", "minimal rest between the two"),
            Accessory("Barbell Shrug", 3, "10–15", "", ""),
        ),
        skill=PULL_UP_SECOND_DOSE,
        skill_before_lifts=True,
    ),
    "SUN": Session(
        title="Off — rest",
        prep="",
        lifts=(),
        accessories=(),
        skill=None,
        skill_before_lifts=False,
    ),
}

OFF_DAY_NOTES = {
    "WED": "20–30 min easy walk. 10 min on hips and shoulders — couch stretch, thoracic "
           "rotations, lat stretch on a rack.\n"
           "No lifting. The Thursday pull session is the one that suffers if you burn today.",
    "SUN": FUNDAMENTALS,
}

SKILLS = [
    {
        "movement": "Pull-up",
        "status": "Some",
        "progression": [
            {"move": "Scapular pull-ups", "rx": "3 × 8–10 · 2s hold at the top, arms straight",
             "gate": "3 × 10 clean, plus a 45s active hang"},
            {"move": "Eccentric pull-ups", "rx": "4 × 4 · jump to the top, lower for 5s",
             "gate": "4 × 4 with a controlled 5s descent, no drop at the end"},
            {"move": "Strict singles on the minute", "rx": "8 × 1 EMOM · full hang each rep",
             "gate": "8 quality singles in 8 minutes"},
            {"move": "Strict sets of five", "rx": "4 × 5 · 2–3 min rest",
             "gate": "4 × 5 strict, chin clearly over the bar, no kip"},
            {"move": "Strict sets of eight to ten", "rx": "4 × 8 · add a rep a week",
             "gate": "One set of 10 strict"},
            {"move": "Weighted pull-ups", "rx": "4 × 5 · belt or dumbbell between the feet",
             "gate": "5 reps at +25 lb"},
        ],
        "cue": "Two doses a week — Thursday fresh, Saturday light. Full hang at the bottom of "
               "every rep; a half rep trains a half range. Stop the set while it still looks good.",
    },
    {
        "movement": "Toes-to-bar",
        "status": "No",
        "progression": [
            {"move": "Active hang + hollow hold", "rx": "3 × 30s hang · 3 × 30s hollow on the floor",
             "gate": "45s active hang and a 30s locked hollow"},
            {"move": "Hanging knee raises", "rx": "4 × 10 · strict, zero swing",
             "gate": "4 × 10 with the knees above the hip crease, dead still"},
            {"move": "Knees to elbows", "rx": "4 × 6 · drive the knees past the hips",
             "gate": "4 × 6 strict, knees touching"},
            {"move": "Straight-leg raise to 90°", "rx": "4 × 8 · legs locked, lower slow",
             "gate": "8 controlled reps with the legs straight"},
            {"move": "Strict toes-to-bar", "rx": "build to 4 × 3 · toes to the bar between the hands",
             "gate": "5 strict unbroken"},
            {"move": "Kipping toes-to-bar", "rx": "3 × 8–10 · hollow ↔ arch rhythm",
             "gate": "10 unbroken in rhythm"},
        ],
        "cue": "Strict first — the kip is a way to do more of a thing you already own, not a "
               "shortcut to owning it. Twice a week, Monday and Friday, at the end of the lower days.",
    },
]

SKILLS_NOTE = ("Two ladders to close over these 10 weeks. Clear a rung's gate, then tick it. "
               "The day view tells you when to work them — this screen tells you what to work on.")


def round5(x):
    """Round half UP to the nearest 5, matching the app's TS Math.round."""
    return int(math.floor(x / 5 + 0.5)) * 5


def round_half_up(x):
    return int(math.floor(x + 0.5))


def meso_of(week):
    return (week - 1) // WEEKS_PER_MESO + 1


def week_in_meso(week):
    return (week - 1) % WEEKS_PER_MESO + 1


def is_deload(week):
    return week_in_meso(week) > BUILD_WEEKS_PER_MESO


def working_pct(lift, week):
    return round(lift.pct + (meso_of(week) - 1) * lift.meso_bump, 3)


def target_reps(lift, week):
    span = lift.rep_hi - lift.rep_lo
    step = (week_in_meso(week) - 1) / (BUILD_WEEKS_PER_MESO - 1)
    return lift.rep_lo + round_half_up(span * step)


def deload_sets(sets):
    return max(2, round_half_up(sets / 2))


def main_lift_section(lift, week, maxes):
    pct = working_pct(lift, week)
    if is_deload(week):
        pct = round(pct * DELOAD_LOAD_FRACTION, 3)
        sets, reps = deload_sets(lift.sets), lift.rep_lo
        load_note = (f"% is of your {lift.basis} 1RM — 60% of your working weight, "
                     "half the sets")
    else:
        sets, reps = lift.sets, target_reps(lift, week)
        load_note = (f"% is of your {lift.basis} 1RM — hold this weight through week "
                     f"{meso_of(week) * WEEKS_PER_MESO - 1} and add reps instead")
    return {
        "type": "mainLift",
        "label": lift.label,
        "liftName": lift.name,
        "liftKey": lift.key,
        "sets": [
            {"scheme": f"{sets}×{reps}", "pct": pct,
             "expectedLoad": round5(pct * maxes[lift.key])},
            {"scheme": "Load", "note": load_note},
            {"scheme": "Effort", "note": f"{EFFORT[week_in_meso(week)]} · {lift.cue}"},
        ],
    }


def accessory_section(accessory, week):
    """One box per movement, laid out like a main lift: name, then a set table."""
    sets = deload_sets(accessory.sets) if is_deload(week) else accessory.sets
    rows = [{"scheme": f"{sets} × {accessory.reps}", "note": accessory.unit}]
    if is_deload(week):
        rows.append({"scheme": "Load", "note": "~60% of your usual working weight"})
    if accessory.cue:
        rows.append({"scheme": "Cue", "note": accessory.cue})
    return {
        "type": "movement",
        "label": "Accessory",
        "moveName": accessory.name,
        "rows": rows,
    }


def skill_section(skill, week):
    """Same box and table as a lift — the dose is a prescription like any other."""
    sets = deload_sets(skill.sets) if is_deload(week) else skill.sets
    scheme = f"{sets} × {skill.per_set}" if skill.per_set else f"{sets} sets"
    rows = [{"scheme": scheme, "note": skill.lead_note}]
    rows.extend({"scheme": label, "note": note} for label, note in skill.rows)
    return {"type": "movement", "label": "Skill", "moveName": skill.name, "rows": rows}


def week_focus(week):
    if week == WEEKS_PER_MESO + 1:
        return MESO_2_OPENER
    return WEEK_FOCUS[week_in_meso(week)]


def sections_for(dow, week, maxes):
    session = SESSIONS[dow]
    sections = []
    if session.prep:
        sections.append({"type": "prep", "label": "Prep", "text": session.prep})
    if session.skill and session.skill_before_lifts:
        sections.append(skill_section(session.skill, week))
    sections.extend(main_lift_section(lift, week, maxes) for lift in session.lifts)
    if session.skill and not session.skill_before_lifts:
        sections.append(skill_section(session.skill, week))
    sections.extend(accessory_section(a, week) for a in session.accessories)
    if dow in OFF_DAY_NOTES:
        sections.append({"type": "text", "label": "Notes", "text": OFF_DAY_NOTES[dow]})
    if dow == "MON":
        sections.append({"type": "text", "label": "Notes", "text": WEEK_NOTES[week_in_meso(week)]})
    return sections


def date_label(d):
    return f"{DOW_TITLE[d.weekday()]} {MONTHS[d.month - 1]} {d.day}"


def week_dates(monday):
    sunday = monday + datetime.timedelta(days=6)
    return (f"{MONTHS[monday.month - 1]} {monday.day}–"
            f"{MONTHS[sunday.month - 1]} {sunday.day}")


def build_days(maxes):
    days = []
    for week in range(1, WEEKS + 1):
        monday = START + datetime.timedelta(weeks=week - 1)
        dates = week_dates(monday)
        focus = week_focus(week)
        for offset in range(7):
            d = monday + datetime.timedelta(days=offset)
            dow = DOW[offset]
            days.append({
                "date": d.isoformat(),
                "dow": dow,
                "dateLabel": date_label(d),
                "block": f"Meso {meso_of(week)}",
                "week": week,
                "weekDates": dates,
                "weekFocus": focus,
                "sessionTitle": SESSIONS[dow].title,
                "sections": sections_for(dow, week, maxes),
            })
    return days


def build_plan():
    return {
        "lifts": LIFTS,
        "defaultMaxes": DEFAULT_MAXES,
        "days": build_days(DEFAULT_MAXES),
        "skills": SKILLS,
        "skillsNote": SKILLS_NOTE,
    }


def main():
    plan = build_plan()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(plan['days'])} days and {len(plan['skills'])} skill ladders to {OUT}")


if __name__ == "__main__":
    main()
