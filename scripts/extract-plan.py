import json, re, pathlib, datetime, math
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[1]
XLSX = ROOT / "FOTC_2027_26-Week_Prep_Mike-2.xlsx"
OUT = ROOT / "src" / "data" / "plan.json"

BLOCK_SHEETS = [
    "B1 Base W1-5", "B2 Build W6-10", "B3 Qualifier W11-15",
    "B4 Rebuild W16-20", "B5 Champ Prep W21-24", "B6 Peak W25-26",
]
BLOCK_LABEL = {
    "B1 Base W1-5": "B1 Base", "B2 Build W6-10": "B2 Build",
    "B3 Qualifier W11-15": "B3 Qualifier", "B4 Rebuild W16-20": "B4 Rebuild",
    "B5 Champ Prep W21-24": "B5 Champ Prep", "B6 Peak W25-26": "B6 Peak",
}

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
    {"key": "cleanJerk", "name": "Clean & Jerk", "isEstimate": True},
    {"key": "snatch", "name": "Snatch", "isEstimate": True},
]

MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], start=1)}

WEEK_HDR = re.compile(r"WEEK\s+(\d+)\s*·\s*([^—]+?)\s*—\s*(.*)", re.UNICODE)


def plan_year_for_month(month):
    # Plan runs Jul 2026 -> Jan 2027. Jan-Jun => 2027, Jul-Dec => 2026.
    return 2027 if month <= 6 else 2026


def parse_date_label(label):
    # label like "Mon Jul 20" ; returns (iso, dow)
    m = re.match(r"([A-Za-z]{3})\s+([A-Za-z]{3})\s+(\d+)", label.strip())
    dow, mon, day = m.group(1).upper(), m.group(2), int(m.group(3))
    year = plan_year_for_month(MONTHS[mon])
    iso = datetime.date(year, MONTHS[mon], day).isoformat()
    return iso, dow


def session_title(text):
    first = text.strip().splitlines()[0].strip()
    first = re.split(r"\s—\s|\s·\s", first)[0].strip()
    return first.title() if first.isupper() else first


def extract_block_days():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    days = []
    for sheet in BLOCK_SHEETS:
        ws = wb[sheet]
        week_num, week_dates, week_focus = None, "", ""
        for row in ws.iter_rows(values_only=True):
            cells = [c for c in row]
            first = cells[0]
            if not any(c is not None for c in cells):
                continue
            if isinstance(first, str) and first.startswith("WEEK "):
                m = WEEK_HDR.match(first)
                if m:
                    week_num = int(m.group(1))
                    week_dates = m.group(2).strip()
                    week_focus = m.group(3).strip()
                continue
            if isinstance(first, str) and re.match(r"[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d+", first):
                iso, dow = parse_date_label(first)
                session = (cells[2] or "").strip()
                load_cell = (cells[3] or "") if len(cells) > 3 and cells[3] else ""
                days.append({
                    "date": iso, "dow": dow, "dateLabel": first.strip(),
                    "block": BLOCK_LABEL[sheet], "week": week_num,
                    "weekDates": week_dates, "weekFocus": week_focus,
                    "sessionTitle": session_title(session),
                    "sections": [],
                    "_session": session,
                    "_loadCell": load_cell,
                })
    return days


def build_plan():
    days = extract_block_days()
    days.sort(key=lambda d: d["date"])
    return {"lifts": LIFTS, "defaultMaxes": DEFAULT_MAXES, "days": days}


def strip_scratch(plan):
    for d in plan["days"]:
        for k in ("_session", "_loadCell", "_mainLift"):
            d.pop(k, None)
    return plan


def main():
    plan = build_plan()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(strip_scratch(plan), indent=2, ensure_ascii=False))
    print(f"Wrote {len(plan['days'])} days to {OUT}")


if __name__ == "__main__":
    main()
