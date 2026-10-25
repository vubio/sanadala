"""Convert the six original HSK 2.0 books to a consistent, loss-aware dataset.

Usage:
    python scripts/convert_hsk2.py /path/to/HSK-folder

The original Excel files are intentionally excluded from the public website.
The CSV/JSON intermediate written to output/ is for the merged personal workbook.
"""

import json
import re
import sys
from collections import Counter
from pathlib import Path

import openpyxl


LEVEL_FILES = {
    1: "150 HSK1.xlsx",
    2: "150 HSK2.xlsx",
    3: "300 HSK3.xlsx",
    4: "600 HSK4.xlsx",
    5: "1300 HSK5.xlsx",
    6: "2500 HSK6.xlsx",
}


def cleaned(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).replace("\xa0", " ")).strip()


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("upload")
    root = Path(__file__).resolve().parents[1]
    target = root / "data"
    target.mkdir(exist_ok=True)
    intermediate = root.parent / "outputs" / "sanadala-hsk2"
    intermediate.mkdir(parents=True, exist_ok=True)
    all_rows = []
    catalog = {"version": 2, "edition": "2.0", "total": 0, "levels": []}
    for level, filename in LEVEL_FILES.items():
        workbook = openpyxl.load_workbook(source / filename, data_only=True, read_only=True)
        sheet = workbook.active
        rows = list(sheet.values)
        assert cleaned(rows[0][0]).lower() == "no" and cleaned(rows[0][1]).lower() == "chinese", filename
        converted = []
        for row in rows[1:]:
            if not any(value is not None for value in row):
                continue
            number = int(row[0])
            # Columns A-D are official list metadata; F-L are richer learning
            # content with their own Chinese word / pinyin fields. M-R consist
            # of unlabeled worksheet helpers and aren't part of the vocabulary.
            official, official_pinyin, english = cleaned(row[1]), cleaned(row[2]), cleaned(row[3])
            word, pinyin, definition_cn = cleaned(row[5]), cleaned(row[6]), cleaned(row[7])
            vietnamese, example, example_pinyin, example_vi = map(cleaned, row[8:12])
            assert word and pinyin and vietnamese and example and example_pinyin and example_vi, (level, number)
            converted.append([number, word, pinyin, vietnamese, example, example_pinyin, example_vi,
                              definition_cn, english, official, official_pinyin])
            # Preserve otherwise-unlabeled original M–R columns for the
            # downloadable archive; they are not used by the learning site.
            extras = [row[i] if i < len(row) else None for i in range(12, 18)]
            all_rows.append([level, number, official, official_pinyin, english, word, pinyin,
                             definition_cn, vietnamese, example, example_pinyin, example_vi] + extras)
        assert len(converted) == int(filename.split(' ')[0]), (filename, len(converted))
        assert [row[0] for row in converted] == list(range(1, len(converted) + 1)), filename
        # Split larger levels to keep each GitHub Pages asset compact.
        files = []
        for offset in range(0, len(converted), 500):
            part = converted[offset:offset + 500]
            filename_part = f"hsk2-{level}-{offset // 500 + 1}.json" if len(converted) > 500 else f"hsk2-{level}.json"
            (target / filename_part).write_text(json.dumps(part, ensure_ascii=False, separators=(',', ':')), encoding="utf8")
            files.append(filename_part)
        catalog["levels"].append({"level": level, "files": files, "count": len(converted)})
        catalog["total"] += len(converted)
        print(f"HSK 2.0 level {level}: {len(converted)} entries, complete.")
    assert catalog["total"] == 5000
    (target / 'catalog2.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    # Intermediate retained off the public repository to generate personal XLSX.
    (intermediate / 'merged.json').write_text(json.dumps(all_rows, ensure_ascii=False), encoding='utf8')
    print('TOTAL:', len(all_rows), 'unique IDs:', len(set((r[0], r[1]) for r in all_rows)))


if __name__ == '__main__':
    main()
