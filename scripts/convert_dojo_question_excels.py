#!/usr/bin/env python3
"""Convert Samureye dojo question excels into runtime JSON files.

Usage:
  python3 scripts/convert_dojo_question_excels.py \
    --basic-input /path/to/samureye_basic_life_questions.xlsx \
    --professional-input /path/to/samureye_professional_questions.xlsx \
    --basic-output src/data/dojo_basic_life_questions.json \
    --professional-output src/data/dojo_professional_questions.json
"""

from __future__ import annotations

import argparse
import json
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from zipfile import ZipFile

NS_MAIN = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
NS_PKG = {"p": "http://schemas.openxmlformats.org/package/2006/relationships"}
RID_ATTR = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


@dataclass
class XlsxSheet:
    name: str
    rows: list[dict[str, str]]


class XlsxReader:
    def __init__(self, path: Path):
        self.path = path

    @staticmethod
    def _normalize_target(target: str) -> str:
        safe = target.replace("\\", "/").strip()
        while safe.startswith("./"):
            safe = safe[2:]
        if safe.startswith("/"):
            safe = safe[1:]
        if not safe.startswith("xl/"):
            safe = f"xl/{safe}"
        return safe

    @staticmethod
    def _col_letters(ref: str) -> str:
        return "".join(ch for ch in ref if ch.isalpha())

    def _read_shared_strings(self, zf: ZipFile) -> list[str]:
        if "xl/sharedStrings.xml" not in zf.namelist():
            return []

        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
        shared: list[str] = []

        for si in root.findall("m:si", NS_MAIN):
            t_node = si.find("m:t", NS_MAIN)
            if t_node is not None:
                shared.append(t_node.text or "")
                continue

            parts = [node.text or "" for node in si.findall(".//m:t", NS_MAIN)]
            shared.append("".join(parts))

        return shared

    def _read_sheet_names(self, zf: ZipFile) -> list[str]:
        workbook = ET.fromstring(zf.read("xl/workbook.xml"))
        return [sheet.attrib.get("name", "") for sheet in workbook.findall("m:sheets/m:sheet", NS_MAIN)]

    def read_sheet_rows(self, sheet_name: str) -> XlsxSheet:
        with ZipFile(self.path) as zf:
            workbook = ET.fromstring(zf.read("xl/workbook.xml"))
            relationships = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
            rel_map = {
                rel.attrib["Id"]: rel.attrib["Target"]
                for rel in relationships.findall("p:Relationship", NS_PKG)
            }
            shared = self._read_shared_strings(zf)

            target = None
            for sheet in workbook.findall("m:sheets/m:sheet", NS_MAIN):
                if sheet.attrib.get("name") != sheet_name:
                    continue
                rid = sheet.attrib.get(RID_ATTR)
                if rid:
                    target = self._normalize_target(rel_map[rid])
                    break

            if target is None:
                names = ", ".join(filter(None, self._read_sheet_names(zf)))
                raise ValueError(f"Sheet '{sheet_name}' not found in {self.path} (available: {names})")

            root = ET.fromstring(zf.read(target))
            row_nodes = root.findall("m:sheetData/m:row", NS_MAIN)
            rows: list[dict[str, str]] = []

            for row in row_nodes:
                cells: dict[str, str] = {}
                for cell in row.findall("m:c", NS_MAIN):
                    ref = cell.attrib.get("r", "")
                    col = self._col_letters(ref)
                    typ = cell.attrib.get("t")
                    value = ""

                    if typ == "s":
                        value_node = cell.find("m:v", NS_MAIN)
                        if value_node is not None and value_node.text is not None:
                            idx = int(value_node.text)
                            if 0 <= idx < len(shared):
                                value = shared[idx]
                    elif typ == "inlineStr":
                        value_node = cell.find("m:is/m:t", NS_MAIN)
                        value = value_node.text if value_node is not None and value_node.text is not None else ""
                    else:
                        value_node = cell.find("m:v", NS_MAIN)
                        value = value_node.text if value_node is not None and value_node.text is not None else ""

                    if value is not None and str(value).strip() != "":
                        cells[col] = str(value).strip()

                rows.append(cells)

            return XlsxSheet(name=sheet_name, rows=rows)


def detect_header_row(rows: list[dict[str, str]], required_headers: set[str]) -> tuple[int, dict[str, str]]:
    for index, row in enumerate(rows):
        value_to_col = {value.strip(): col for col, value in row.items() if str(value).strip() != ""}
        if required_headers.issubset(set(value_to_col.keys())):
            return index, value_to_col
    missing = ", ".join(sorted(required_headers))
    raise ValueError(f"Unable to detect header row with required columns: {missing}")


def parse_bool(value: Any) -> bool:
    text = str(value or "").strip().lower()
    return text in {"1", "true", "yes", "y", "t", "enable", "enabled"}


def parse_int(value: Any, default: int = 0) -> int:
    text = str(value or "").strip()
    if text == "":
        return default
    try:
        return int(float(text))
    except ValueError:
        return default


def parse_answer_index(raw_value: Any) -> int:
    text = str(raw_value or "").strip().upper()
    if not text:
        return 0

    if text.isdigit():
        numeric = int(text)
        if 1 <= numeric <= 4:
            return numeric - 1

    mapping = {"A": 0, "B": 1, "C": 2, "D": 3}
    return mapping.get(text, 0)


def to_question_records(sheet: XlsxSheet) -> list[dict[str, Any]]:
    required = {
        "id",
        "category",
        "mode",
        "question",
        "option_a",
        "option_b",
        "option_c",
        "option_d",
        "answer",
        "difficulty",
        "explanation",
        "source",
        "enabled",
    }

    header_index, header_map = detect_header_row(sheet.rows, required)
    records: list[dict[str, Any]] = []

    for row in sheet.rows[header_index + 1 :]:
        def get(header: str) -> str:
            col = header_map.get(header)
            return row.get(col, "").strip() if col else ""

        question_id = get("id")
        if not question_id:
            continue

        if not parse_bool(get("enabled")):
            continue

        options = [get("option_a"), get("option_b"), get("option_c"), get("option_d")]
        answer_index = parse_answer_index(get("answer"))
        if answer_index < 0 or answer_index >= len(options):
            answer_index = 0

        records.append(
            {
                "id": question_id,
                "category": get("category"),
                "mode": get("mode"),
                "subtopic": get("subtopic"),
                "question": get("question"),
                "options": options,
                "answerIndex": answer_index,
                "difficulty": parse_int(get("difficulty"), default=1),
                "explanation": get("explanation"),
                "source": get("source"),
                "enabled": True,
            }
        )

    if not records:
        raise ValueError(f"No enabled question rows found in sheet '{sheet.name}'.")

    return records


def convert(input_path: Path, output_path: Path) -> int:
    reader = XlsxReader(input_path)
    sheet = reader.read_sheet_rows("Questions")
    records = to_question_records(sheet)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(records)


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert dojo question excels into JSON files")
    parser.add_argument("--basic-input", required=True, type=Path)
    parser.add_argument("--professional-input", required=True, type=Path)
    parser.add_argument("--basic-output", required=True, type=Path)
    parser.add_argument("--professional-output", required=True, type=Path)
    args = parser.parse_args()

    basic_count = convert(args.basic_input, args.basic_output)
    professional_count = convert(args.professional_input, args.professional_output)

    print(f"Converted basic questions: {basic_count}")
    print(f"Converted professional questions: {professional_count}")


if __name__ == "__main__":
    main()
