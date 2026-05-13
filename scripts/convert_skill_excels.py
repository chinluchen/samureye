#!/usr/bin/env python3
"""
Convert Samureye skill control excels into runtime JSON assets.

Input:
  1) samureye_skills_final_skill_data.xlsx
  2) samureye_skill_animations.xlsx

Output:
  1) src/data/skills.json
  2) src/data/skill_animations.json
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zipfile import ZipFile
import xml.etree.ElementTree as ET


NS_MAIN = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
NS_PKG = {"p": "http://schemas.openxmlformats.org/package/2006/relationships"}
RID_ATTR = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def normalize_zip_target(target: str) -> str:
    safe = target.replace("\\", "/").strip()
    while safe.startswith("./"):
        safe = safe[2:]
    if safe.startswith("/"):
        safe = safe[1:]
    if not safe.startswith("xl/"):
        safe = f"xl/{safe}"
    return safe


def parse_bool(value: Any) -> bool:
    if value is None:
        return False
    text = str(value).strip().lower()
    if text in {"true", "1", "yes", "y", "t", "是", "可", "可顯示", "讀取", "實裝"}:
        return True
    return False


def parse_number(value: Any, default: float = 0) -> float:
    if value is None:
        return default
    text = str(value).strip()
    if text == "":
        return default
    try:
        return float(text)
    except ValueError:
        return default


def parse_int(value: Any, default: int = 0) -> int:
    return int(round(parse_number(value, default=default)))


def split_skill_ids(raw: Any) -> list[str]:
    if raw is None:
        return []
    text = str(raw).strip()
    if not text:
        return []
    for sep in ["；", ";", "、", ","]:
        text = text.replace(sep, "|")
    items = [item.strip() for item in text.split("|")]
    return [item for item in items if item and item.lower() not in {"n/a", "na", "-"}]


def parse_hit_pattern(raw: Any) -> dict[str, Any]:
    if raw is None:
        return {}
    text = str(raw).strip()
    if not text:
        return {}

    result: dict[str, Any] = {}
    segments = [segment.strip() for segment in text.replace("；", ";").split(";")]
    for segment in segments:
        if not segment or "=" not in segment:
            continue
        key, value = segment.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue
        lower = value.lower()
        if lower in {"true", "false"}:
            result[key] = lower == "true"
            continue
        try:
            if "." in value:
                result[key] = float(value)
            else:
                result[key] = int(value)
            continue
        except ValueError:
            result[key] = value
    return result


def sanitize_nullable_text(raw: Any) -> str:
    if raw is None:
        return ""
    text = str(raw).strip()
    if text.lower() in {"n/a", "na", "-", "none"}:
        return ""
    return text


@dataclass
class XlsxSheet:
    name: str
    rows: list[dict[str, str]]


class XlsxReader:
    def __init__(self, path: Path):
        self.path = path

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

    @staticmethod
    def _col_letters(ref: str) -> str:
        return "".join(ch for ch in ref if ch.isalpha())

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
                if sheet.attrib.get("name") == sheet_name:
                    rid = sheet.attrib.get(RID_ATTR)
                    if rid:
                        target = normalize_zip_target(rel_map[rid])
                    break
            if target is None:
                raise ValueError(f"Sheet '{sheet_name}' not found in {self.path}")

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
                        v = cell.find("m:v", NS_MAIN)
                        if v is not None and v.text is not None:
                            idx = int(v.text)
                            if 0 <= idx < len(shared):
                                value = shared[idx]
                    elif typ == "inlineStr":
                        t = cell.find("m:is/m:t", NS_MAIN)
                        value = t.text if t is not None and t.text is not None else ""
                    else:
                        v = cell.find("m:v", NS_MAIN)
                        value = v.text if v is not None and v.text is not None else ""
                    if value is not None and str(value).strip() != "":
                        cells[col] = str(value).strip()
                rows.append(cells)
            return XlsxSheet(name=sheet_name, rows=rows)


def detect_header_row(rows: list[dict[str, str]], required_keys: set[str]) -> tuple[int, dict[str, str]]:
    for idx, row in enumerate(rows):
        reverse = {value: col for col, value in row.items()}
        if required_keys.issubset(set(reverse.keys())):
            return idx, reverse
    raise ValueError(f"Unable to find header row containing: {', '.join(sorted(required_keys))}")


def build_table_rows(rows: list[dict[str, str]], header_index: int, header_map: dict[str, str]) -> list[dict[str, str]]:
    table: list[dict[str, str]] = []
    for row in rows[header_index + 1 :]:
        normalized: dict[str, str] = {}
        for header, col in header_map.items():
            normalized[header] = row.get(col, "").strip()
        if all(not value for value in normalized.values()):
            continue
        table.append(normalized)
    return table


def normalize_skill_row(row: dict[str, str]) -> dict[str, Any]:
    skill_id = row.get("skillId", "").strip()
    if not skill_id:
        return {}

    implementation_status = row.get("實裝狀態", "")
    read_status = row.get("程式讀取", "")
    display_status = row.get("顯示狀態", "")
    tree_display = row.get("技能樹顯示", "")

    effect_type = row.get("效果類型", "").strip() or "damage"
    target_rule = row.get("目標規則", "").strip() or "opponent"

    base_effect_value = parse_int(row.get("基礎效果值"), 0)
    value_per_hit = parse_int(row.get("每次效果值"), 0)
    pvp_authoritative_value = parse_int(row.get("PvP權威總值"), base_effect_value)
    hit_count = max(1, parse_int(row.get("攻擊次數"), 1))

    status_effect_id = sanitize_nullable_text(row.get("持續效果ID"))
    has_status_effect = status_effect_id.lower() not in {"", "n/a", "na", "-"}

    return {
        "order": parse_int(row.get("項次"), 0),
        "skillId": skill_id,
        "name": row.get("招式名稱", "").strip(),
        "enName": row.get("英文名稱", "").strip(),
        "animationKey": row.get("animationKey", "").strip() or skill_id,
        "runtime": {
            "implementationStatus": implementation_status,
            "displayStatus": display_status,
            "programRead": read_status,
            "skillTreeDisplay": tree_display,
            "isImplemented": implementation_status == "實裝",
            "isProgramReadable": read_status == "讀取",
            "isTreeVisible": tree_display == "可顯示",
        },
        "unlock": {
            "spCost": parse_int(row.get("SP學習花費"), 0),
            "prerequisites": split_skill_ids(row.get("前置技能")),
            "unlockCondition": row.get("解鎖條件", "").strip(),
            "defaultUnlocked": parse_bool(row.get("是否預設解鎖")),
            "learnable": parse_bool(row.get("玩家是否可學習")),
        },
        "cost": {
            "mp": max(0, parse_int(row.get("MP花費"), 0)),
            "cooldownSec": max(0, parse_number(row.get("CD(s)"), 0)),
        },
        "logic": {
            "skillType": row.get("技能類型", "").strip(),
            "targetRule": target_rule,
            "effectType": effect_type,
            "effectMode": row.get("傷害/回復模式", "").strip(),
            "baseEffectValue": base_effect_value,
            "hitCount": hit_count,
            "valuePerHit": value_per_hit,
            "pvpAuthoritativeValue": pvp_authoritative_value,
            "timing": {
                "startAtMs": max(0, parse_int(row.get("第一擊/效果時間(ms)"), 0)),
                "intervalMs": max(0, parse_int(row.get("每擊間隔(ms)"), 0)),
                "pauseDurationMs": max(0, parse_int(row.get("技能暫停時間(ms)"), 0)),
                "timeSyncField": row.get("時間校正欄位", "").strip(),
                "resolveMode": row.get("resolveMode", "").strip(),
            },
            "hitPattern": parse_hit_pattern(row.get("hitPattern設定")),
            "statusEffects": {
                "id": status_effect_id,
            "target": sanitize_nullable_text(row.get("持續效果目標")),
            "durationMs": max(0, parse_int(row.get("持續效果時間(ms)"), 0)),
            "tickMs": max(0, parse_int(row.get("tick間隔(ms)"), 0)),
            "hasStatusEffect": has_status_effect,
            },
        },
        "execution": {
            "pveStrategy": row.get("PvE執行策略", "").strip(),
            "pvpStrategy": row.get("PvP執行策略", "").strip(),
            "pvpAuthoritySource": row.get("PvP權威來源", "").strip(),
            "sendSkillDamagePacket": parse_bool(row.get("是否送source=skill damage封包")),
            "generateHitEvents": parse_bool(row.get("是否產生hitEvents")),
            "targetView": row.get("targetView", "").strip(),
            "skillEndCondition": row.get("技能結束條件", "").strip(),
            "battleOutcomeTiming": row.get("勝負判定時機", "").strip(),
            "pvpPacketRule": row.get("PvP施放封包規則", "").strip(),
        },
        "visualBinding": {
            "castVisualKey": row.get("castVisualKey", "").strip(),
            "hitVisualKey": sanitize_nullable_text(row.get("hitVisualKey") or row.get("onHitVisualKey")),
            "impactVisualKey": row.get("impactVisualKey", "").strip(),
            "durationVisualKey": row.get("durationVisualKey", "").strip(),
            "damageTextMode": row.get("damageTextMode", "").strip(),
            "textColor": row.get("textColor", "").strip(),
            "audioKey": row.get("audioKey", "").strip(),
            "hapticMode": row.get("hapticMode", "").strip(),
            "animationStyle": row.get("動畫樣式", "").strip(),
        },
        "description": row.get("技能說明", "").strip(),
        "devNotes": row.get("開發備註", "").strip(),
    }


def normalize_animation_row(row: dict[str, str]) -> dict[str, Any]:
    animation_key = row.get("animationKey", "").strip()
    if not animation_key:
        return {}

    status_effect_id = sanitize_nullable_text(row.get("statusEffectId"))
    has_status_effect = status_effect_id.lower() not in {"", "n/a", "na", "-"}

    return {
        "order": parse_int(row.get("項次"), 0),
        "skillId": row.get("skillId", "").strip(),
        "skillName": row.get("技能名稱", "").strip(),
        "animationKey": animation_key,
        "implementationStatus": row.get("實裝狀態", "").strip(),
        "type": row.get("動畫類型", "").strip(),
        "durationMs": max(0, parse_int(row.get("總時長(ms)"), 0)),
        "requiresSkillAnimationLayer": parse_bool(row.get("需要SkillAnimationLayer")),
        "castStart": {
            "visualKey": row.get("castVisualKey", "").strip(),
            "casterDescription": row.get("caster開始演出", "").strip(),
            "targetDescription": row.get("target開始演出", "").strip(),
        },
        "onHit": {
            "visualKey": row.get("onHitVisualKey", "").strip(),
            "impactVisualKey": row.get("impactVisualKey", "").strip(),
            "damageTextMode": row.get("damageTextMode", "").strip(),
            "textColor": row.get("文字顏色", "").strip(),
            "useHitEvents": parse_bool(row.get("是否依hitEvents觸發")),
        },
        "audio": {
            "key": row.get("audioKey", "").strip(),
        },
        "haptic": {
            "mode": row.get("hapticMode", "").strip(),
        },
        "durationEffect": {
            "visualKey": sanitize_nullable_text(row.get("durationEffectKey")),
        },
        "statusEffect": {
            "id": status_effect_id,
            "target": sanitize_nullable_text(row.get("effectTarget")),
            "durationMs": max(0, parse_int(row.get("effectDuration(ms)"), 0)),
            "hasStatusEffect": has_status_effect,
        },
        "castEnd": {
            "visualKey": row.get("endVisualKey", "").strip(),
            "clearTiming": row.get("清除時機", "").strip(),
        },
        "roleMappingRule": row.get("roleMapping規則", "").strip(),
        "sharedEntrypoints": {
            "pve": row.get("PvE共用入口", "").strip(),
            "pvp": row.get("PvP共用入口", "").strip(),
        },
        "fallbackAllowed": parse_bool(row.get("fallbackAllowed")),
        "codexCheck": row.get("Codex實作檢查", "").strip(),
        "notes": row.get("備註", "").strip(),
        "jsonPathHint": row.get("JSON物件層級", "").strip(),
    }


def run_conversion(
    skills_excel: Path,
    animations_excel: Path,
    skills_output: Path,
    animations_output: Path,
) -> int:
    warnings: list[str] = []

    skill_reader = XlsxReader(skills_excel)
    skill_sheet = skill_reader.read_sheet_rows("技能資料表")
    skill_header_index, skill_header_map = detect_header_row(
        skill_sheet.rows, required_keys={"skillId", "animationKey", "實裝狀態"}
    )
    skill_rows = build_table_rows(skill_sheet.rows, skill_header_index, skill_header_map)

    skills: list[dict[str, Any]] = []
    seen_skill_ids: set[str] = set()
    for row in skill_rows:
        normalized = normalize_skill_row(row)
        if not normalized:
            continue
        skill_id = normalized["skillId"]
        if skill_id in seen_skill_ids:
            warnings.append(f"[skills] Duplicate skillId found: {skill_id}")
            continue
        seen_skill_ids.add(skill_id)
        skills.append(normalized)

    animation_reader = XlsxReader(animations_excel)
    animation_sheet = animation_reader.read_sheet_rows("動畫資料表")
    animation_header_index, animation_header_map = detect_header_row(
        animation_sheet.rows, required_keys={"skillId", "animationKey", "動畫類型"}
    )
    animation_rows = build_table_rows(animation_sheet.rows, animation_header_index, animation_header_map)

    animations: list[dict[str, Any]] = []
    seen_animation_keys: set[str] = set()
    for row in animation_rows:
        normalized = normalize_animation_row(row)
        if not normalized:
            continue
        key = normalized["animationKey"]
        if key in seen_animation_keys:
            warnings.append(f"[animations] Duplicate animationKey found: {key}")
            continue
        seen_animation_keys.add(key)
        animations.append(normalized)

    animations_by_key = {entry["animationKey"]: entry for entry in animations}
    skills_by_id = {entry["skillId"]: entry for entry in skills}

    for skill in skills:
        animation_key = skill.get("animationKey", "")
        if animation_key and animation_key not in animations_by_key:
            warnings.append(
                f"[mapping] skillId='{skill['skillId']}' animationKey='{animation_key}' has no animation config"
            )

    for animation in animations:
        skill_id = animation.get("skillId", "")
        if skill_id and skill_id not in skills_by_id:
            warnings.append(
                f"[mapping] animationKey='{animation['animationKey']}' skillId='{skill_id}' not found in skills"
            )
        if skill_id in skills_by_id:
            expected = skills_by_id[skill_id].get("animationKey", "")
            actual = animation.get("animationKey", "")
            if expected and actual and expected != actual:
                warnings.append(
                    f"[mapping] skillId='{skill_id}' expects animationKey='{expected}', but animation table row uses '{actual}'"
                )

    generated_at = datetime.now(timezone.utc).isoformat()
    skills_json = {
        "meta": {
            "generatedAtUtc": generated_at,
            "sourceExcel": str(skills_excel),
            "sheetName": skill_sheet.name,
            "schemaVersion": 1,
            "runtimeRule": "Only skills where runtime.isImplemented=true and runtime.isProgramReadable=true should be loaded in game.",
        },
        "skills": skills,
    }

    animations_json = {
        "meta": {
            "generatedAtUtc": generated_at,
            "sourceExcel": str(animations_excel),
            "sheetName": animation_sheet.name,
            "schemaVersion": 1,
        },
        "animations": animations,
    }

    skills_output.parent.mkdir(parents=True, exist_ok=True)
    animations_output.parent.mkdir(parents=True, exist_ok=True)
    skills_output.write_text(json.dumps(skills_json, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    animations_output.write_text(json.dumps(animations_json, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote skills JSON: {skills_output}")
    print(f"Wrote animations JSON: {animations_output}")
    print(f"Skills: {len(skills)} entries, Animations: {len(animations)} entries")
    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"- {warning}")
    else:
        print("\nNo mapping warnings.")

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert Samureye skill excels into runtime JSON files.")
    parser.add_argument(
        "--skills-excel",
        type=Path,
        default=Path("/Users/chin/Desktop/samureye_skills_final_skill_data.xlsx"),
        help="Path to samureye_skills_final_skill_data.xlsx",
    )
    parser.add_argument(
        "--animations-excel",
        type=Path,
        default=Path("/Users/chin/Desktop/samureye_skill_animations.xlsx"),
        help="Path to samureye_skill_animations.xlsx",
    )
    parser.add_argument(
        "--skills-output",
        type=Path,
        default=Path("src/data/skills.json"),
        help="Output path for skills.json",
    )
    parser.add_argument(
        "--animations-output",
        type=Path,
        default=Path("src/data/skill_animations.json"),
        help="Output path for skill_animations.json",
    )
    args = parser.parse_args()

    return run_conversion(
        skills_excel=args.skills_excel,
        animations_excel=args.animations_excel,
        skills_output=args.skills_output,
        animations_output=args.animations_output,
    )


if __name__ == "__main__":
    raise SystemExit(main())
