import json, pathlib
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[1]
XLSX = ROOT / "erik.xlsx"
OUT = ROOT / "src" / "data" / "erik.json"

# Erik's real 1RMs (provided by Mike).
ERIK_MAXES = {
    "backSquat": 350, "frontSquat": 325, "bench": 250, "strictPress": 175,
    "deadlift": 385, "cleanJerk": 250, "snatch": 165,
}

# "Training Answers" sheet, 0-indexed columns for the Novice division:
# A = ERIK movement (0), B = Have? (1).
NOVICE_MOVEMENT_COL, NOVICE_HAVE_COL = 0, 1

# Erik competes Novice — his lifts clear it comfortably, so the strength side is
# solid. The coaching focus is his conditioning engine, plus the two Novice
# skills he only half-owns: wall walks and double-unders. Each rung is a stage
# with a prescription (`rx`) and an advancement gate (`gate`) — the measurable
# standard to hit before climbing. Aerobic/interval targets follow published
# base-building guidance; wall-walk / double-under shapes are standards-based.
FOCUS_SKILLS = [
    {
        "movement": "Conditioning",
        "status": "No",
        "progression": [
            {"move": "Zone 2 base (row / bike / run)", "rx": "2× 20–30 min · nasal-breathing, conversational pace",
             "gate": "30 min continuous, can talk the whole way"},
            {"move": "Aerobic intervals", "rx": "6–8 × 2 min work / 1 min easy · repeatable pace",
             "gate": "8 rounds holding pace, no round >5% slower"},
            {"move": "Threshold intervals", "rx": "5 × 3–4 min hard / 2 min easy",
             "gate": "Hold splits across all 5 with <10% drop-off"},
            {"move": "Mixed-modal EMOM", "rx": "12–15 min · cardio + light barbell/bodyweight, unbroken",
             "gate": "Every minute finished with rest to spare"},
            {"move": "Qualifier-pace pieces", "rx": "8–12 min AMRAP / for-time at goal pace",
             "gate": "Two efforts at target pace, steady breathing"},
        ],
        "cue": "Build the engine 2–3×/week on non-lifting days. Zone 2 first — it raises the ceiling everything else sits under. Keep hard days truly hard and easy days truly easy.",
    },
    {
        "movement": "Wall walk",
        "status": "Some",
        "progression": [
            {"move": "Elevated plank + shoulder taps", "rx": "3 × 20 taps · feet on a box",
             "gate": "20 steady taps, no hip sway"},
            {"move": "Wall plank (feet low)", "rx": "3 × 30–60s hold",
             "gate": "60s controlled, shoulders stacked"},
            {"move": "Weight shifts", "rx": "3 × 10 · rock hand to hand",
             "gate": "10 clean shifts each side"},
            {"move": "Half wall walk", "rx": "3 × 3 · to a mid tape line, 3–5s hold",
             "gate": "Walk to the mid line 3 × 3 confidently"},
            {"move": "Full wall walk", "rx": "build to 3–5 reps · chest to wall",
             "gate": "5 unbroken, controlled down"},
        ],
        "cue": "Add distance with tape lines; feet leave the wall before the hands move. 2–3×/week.",
    },
    {
        "movement": "Double-unders",
        "status": "Some",
        "progression": [
            {"move": "Relaxed singles", "rx": "3 × 50 · low bounce, wrists turn the rope",
             "gate": "50 unbroken with a quiet, low bounce"},
            {"move": "Penguin taps", "rx": "3 × 20 · tap thighs twice per jump, no rope",
             "gate": "20 unbroken double taps in one bounce"},
            {"move": "Single–single–double", "rx": "5 × 10 · slip one DU into the rhythm",
             "gate": "10 clean DU insertions in a set"},
            {"move": "Small DU sets", "rx": "build 2 → 3 → 5 unbroken · reset between",
             "gate": "5 unbroken doubles, relaxed shoulders"},
            {"move": "Sustained doubles", "rx": "accumulate 30–50 across the session",
             "gate": "30 unbroken at a steady rhythm"},
        ],
        "cue": "Wrists do the work, not the arms — jump only slightly higher and keep the elbows in. Short frequent bursts, 2–3×/week; stop the set before form falls apart.",
    },
]


def count_novice_yeses():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb["Training Answers"]
    yeses = 0
    for r in ws.iter_rows(values_only=True):
        movement = r[NOVICE_MOVEMENT_COL] if len(r) > NOVICE_MOVEMENT_COL else None
        have = r[NOVICE_HAVE_COL] if len(r) > NOVICE_HAVE_COL else None
        if not isinstance(movement, str):
            continue
        have = have.strip() if isinstance(have, str) else ""
        if have == "Yes":
            yeses += 1
    return yeses


def build_erik():
    return {
        "defaultMaxes": ERIK_MAXES,
        "skills": FOCUS_SKILLS,
        "solidCount": count_novice_yeses(),
        "qualifierBlock": "B3 Qualifier",
    }


def main():
    data = build_erik()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"Wrote {len(data['skills'])} skills, solidCount={data['solidCount']} to {OUT}")


if __name__ == "__main__":
    main()
