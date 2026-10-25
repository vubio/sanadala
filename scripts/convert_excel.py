"""Convert an HSK 3.0 workbook into compact, per-level JSON for GitHub Pages.

Usage:
    python scripts/convert_excel.py path/to/HSK_workbook.xlsx

The original workbook is never placed in the published data directory.
Running this script again replaces only levels found in that workbook, so future
HSK 7–9 files can be added without replacing HSK 1–6.
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
REQUIRED_COLUMNS = [
    "Level", "STT", "Vocabulary", "Sino-Vietnamese", "Pinyin", "Vietnamese",
    "Example_Simplified", "Example_Traditional", "Example_Pinyin",
    "Example_Sino-Vietnamese", "Example_Vietnamese2", "Review_Notes",
]


def clean(value):
    return "" if value is None else str(value).strip()


def convert(path):
    workbook = load_workbook(path, read_only=True, data_only=True)
    groups = defaultdict(list)
    for sheet in workbook:
        iterator = sheet.values
        header = next(iterator)
        positions = {clean(name): index for index, name in enumerate(header)}
        missing = [name for name in REQUIRED_COLUMNS if name not in positions]
        if missing:
            print(f"Skipping {sheet.title}: missing columns {', '.join(missing)}")
            continue
        for row in iterator:
            get = lambda key: row[positions[key]] if positions[key] < len(row) else None
            level_match = re.search(r"\d+", clean(get("Level")))
            if not level_match or not clean(get("Vocabulary")):
                continue
            level = int(level_match.group())
            try:
                number = int(get("STT"))
            except (TypeError, ValueError):
                print(f"Skipping row with invalid STT: {get('Vocabulary')}")
                continue
            groups[level].append([
                number,
                clean(get("Vocabulary")), clean(get("Sino-Vietnamese")),
                clean(get("Pinyin")), clean(get("Vietnamese")),
                clean(get("Example_Simplified")), clean(get("Example_Traditional")),
                clean(get("Example_Pinyin")), clean(get("Example_Sino-Vietnamese")),
                clean(get("Example_Vietnamese2")), clean(get("Review_Notes")),
            ])
    if not groups:
        raise SystemExit("No recognized HSK vocabulary rows were found.")

    DATA.mkdir(parents=True, exist_ok=True)
    catalog_path = DATA / "catalog.json"
    catalog = {"version": 1, "levels": [], "total": 0}
    if catalog_path.exists():
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    levels = {entry["level"]: entry for entry in catalog.get("levels", [])}
    for level, rows in sorted(groups.items()):
        rows.sort(key=lambda row: row[0])
        ids = [row[0] for row in rows]
        if len(ids) != len(set(ids)):
            raise SystemExit(f"Duplicate STT values found within HSK {level}.")
        filename = f"hsk-{level}.json"
        (DATA / filename).write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        levels[level] = {"level": level, "file": filename, "count": len(rows)}
        print(f"HSK {level}: {len(rows)} entries -> {filename}")
    catalog = {
        "version": 1,
        "levels": [levels[key] for key in sorted(levels)],
        "total": sum(item["count"] for item in levels.values()),
    }
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Total published entries: {catalog['total']}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/convert_excel.py path/to/workbook.xlsx")
    convert(Path(sys.argv[1]))
