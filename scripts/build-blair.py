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
# `display` renames the raw label to the competition movement.
GAP_PROGRESSIONS = {
    "Pull ups": {
        "display": "Pull-ups",
        "progression": [
            "Ring rows · 3–4 × 8–10", "Banded pull-ups",
            "Negatives · 3–5s lower", "Kip swing → kipping pull-up",
        ],
        "cue": "Slot into warm-up on pull days.",
    },
    "Wall walk": {
        "display": "Wall walk",
        "progression": [
            "Incline shoulder taps", "Partial wall walk (¾)",
            "Full wall walk · nose to wall",
        ],
    },
    "Knee to chest": {
        "display": "Toes-to-bar",
        "progression": ["Hanging knee raise", "Knee-to-elbow", "Toes-to-bar"],
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
