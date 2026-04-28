# SAMUREYE 紙娃娃分層製作索引（v1）

## 1) 畫布規格
- 單層尺寸：`768 x 1024 px`
- 格式：`WebP`（透明背景，品質約 80）
- 母檔：可用 `PSD / Krita`
- 基準點：角色腳底中心固定在 `(384, 920)`
- 朝向：預設面向右前方
- 安全邊界：四周至少留 `24px`

## 2) 分層結構（由下到上）
1. `01_shadow`：地面陰影
2. `02_body_base`：身體/膚色基底
3. `03_legs`：腿部服裝
4. `04_torso`：上身服裝
5. `05_arms`：手臂
6. `06_hair_back`：後髮
7. `07_head`：頭部/五官基底
8. `08_eyes`：眼睛（可切換表情）
9. `09_glasses`：眼鏡/護目鏡
10. `10_hair_front`：前髮
11. `11_accessory`：配件
12. `12_weapon`：武器（刀）
13. `13_fx_optional`：可選特效

## 3) 命名規則
- 規則：`samureye_[layer]_[variant].webp`
- 範例：
  - `samureye_02_body_base_default.webp`
  - `samureye_09_glasses_optic_lv2.webp`
  - `samureye_12_weapon_katana_basic.webp`

## 4) 可替換欄位（v1）
- `eyes`：`default / focus / rage`
- `glasses`：`none / basic / optic_lv2 / optic_lv3`
- `weapon`：`basic / glow`
- `accessory`：`none / badge / cape`

## 5) 對位規則
- 所有層都必須用同一畫布：`768 x 1024`
- 不可改變角色整體比例與腳底基準點
- 每個 variant 只改該層內容，不移動畫布與角色座標

## 6) 建議輸出目錄
- `/characters/samureye/base/*.webp`
- `/characters/samureye/eyes/*.webp`
- `/characters/samureye/glasses/*.webp`
- `/characters/samureye/weapon/*.webp`

## 7) manifest.json 範例
```json
{
  "canvas": { "w": 768, "h": 1024, "anchor": [384, 920] },
  "slots": {
    "eyes": ["default", "focus", "rage"],
    "glasses": ["none", "basic", "optic_lv2", "optic_lv3"],
    "weapon": ["basic", "glow"],
    "accessory": ["none", "badge", "cape"]
  },
  "defaultLoadout": {
    "eyes": "default",
    "glasses": "basic",
    "weapon": "basic",
    "accessory": "none"
  }
}
```
