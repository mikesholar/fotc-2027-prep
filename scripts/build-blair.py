import json, pathlib
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[1]
XLSX = ROOT / "blair.xlsx"
OUT = ROOT / "src" / "data" / "blair.json"

# Blair's real 1RMs (provided by Mike).
BLAIR_MAXES = {
    "backSquat": 205, "frontSquat": 150, "bench": 125, "strictPress": 100,
    "deadlift": 215, "cleanJerk": 135, "snatch": 110,
}

# "Training Answers" sheet, 0-indexed columns: D = BLAIR movement (3), E = Have? (4).
MOVEMENT_COL, HAVE_COL = 3, 4

# Authored progressions per gap movement, keyed by the sheet's raw label.
# `display` renames the raw label to the competition movement. Each rung is a
# stage with a prescription (`rx`) and an advancement gate (`gate`) — the
# measurable standard to hit before climbing to the next rung. Pull-up targets
# follow published beginner programs; wall-walk / toes-to-bar use the same
# standards-based shape (tune later).
GAP_PROGRESSIONS = {
    "Pull ups": {
        "display": "Pull-ups",
        "progression": [
            {"move": "Active dead hang", "rx": "3 × max hold · 90s rest",
             "gate": "Hold 45s × 3 on two sessions"},
            {"move": "Scapular pull-ups", "rx": "3 × 8–12 · 2s hold at top",
             "gate": "3 × 12 with 2s hold, two sessions"},
            {"move": "Tempo ring rows", "rx": "3 × 8–10 · 1s up · 1s squeeze · 3s down",
             "gate": "3 × 10 near-horizontal, clean tempo"},
            {"move": "Eccentric (negative) pull-ups", "rx": "3–4 × 3–5 · 5–8s lower",
             "gate": "4 × 5 with an 8s descent → try a strict rep"},
            {"move": "Band-assisted pull-ups", "rx": "2–3 × 5–8 · thin the band",
             "gate": "3 × 6 on your lightest band"},
            {"move": "Strict → kipping", "rx": "5×1 → 4×2 → 3×3 → 3×4 → 3×5",
             "gate": "3 × 5 strict, then start kipping"},
        ],
        "cue": "5 min, 3–4×/week on non-consecutive days. Eccentrics drive the strength; hold kipping until 5 strict.",
    },
    "Wall walk": {
        "display": "Wall walk",
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
    "Knee to chest": {
        "display": "Toes-to-bar",
        "progression": [
            {"move": "Scapular pull-ups", "rx": "3 × 8–10 · active shoulder",
             "gate": "30s active hang + 10 reps"},
            {"move": "Hollow hold", "rx": "3 × 20–30s · tight core",
             "gate": "30s locked hollow"},
            {"move": "Beat swings", "rx": "3 × 8–10 · hollow ↔ arch",
             "gate": "10 rhythmic swings unbroken"},
            {"move": "Knee raises", "rx": "3 × 8 · in the swing",
             "gate": "8 unbroken in rhythm"},
            {"move": "Knees to elbows", "rx": "3 × 5 · drive higher",
             "gate": "5 unbroken"},
            {"move": "Toes-to-bar", "rx": "build to 3 × 3",
             "gate": "5 unbroken to the bar"},
        ],
        "cue": "Own the hollow-to-arch swing before adding range; keep lats engaged and core tight. 2–3×/week.",
    },
}

STATUS_ORDER = {"No": 0, "Some": 1}


def read_novice_rows():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb["Training Answers"]
    rows = []
    for r in ws.iter_rows(values_only=True):
        movement = r[MOVEMENT_COL] if len(r) > MOVEMENT_COL else None
        have = r[HAVE_COL] if len(r) > HAVE_COL else None
        if not isinstance(movement, str):
            continue
        have = have.strip() if isinstance(have, str) else ""
        if have in {"Yes", "Some", "No"}:
            rows.append((movement.strip(), have))
    return rows


def build_blair():
    rows = read_novice_rows()
    solid = [m for m, h in rows if h == "Yes"]
    gaps = [(m, h) for m, h in rows if h in {"No", "Some"}]
    skills = []
    for movement, have in gaps:
        prog = GAP_PROGRESSIONS.get(movement)
        if prog is None:
            raise ValueError(f"No authored progression for gap movement {movement!r}")
        entry = {"movement": prog["display"], "status": have,
                 "progression": prog["progression"]}
        if "cue" in prog:
            entry["cue"] = prog["cue"]
        skills.append(entry)
    skills.sort(key=lambda s: STATUS_ORDER[s["status"]])  # "No" gaps first
    return {
        "defaultMaxes": BLAIR_MAXES,
        "skills": skills,
        "solidCount": len(solid),
        "qualifierBlock": "B3 Qualifier",
    }


def main():
    data = build_blair()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"Wrote {len(data['skills'])} skills, solidCount={data['solidCount']} to {OUT}")


if __name__ == "__main__":
    main()
