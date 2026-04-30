# Audio Catalog Workflow

## Template File
- `docs/audio_catalog.xlsx`

## How we use it
1. Put original source files into:
   - `assets/source/audio/bgm/` for music source
   - `assets/source/audio/sfx/` for sfx source
2. Tell Codex which file is for which scene/skill.
3. Codex converts runtime files automatically:
   - BGM: `m4a (AAC 128 kbps)` to `src/assets/audio/bgm/`
   - SFX: `m4a (AAC 64-96 kbps)` to `src/assets/audio/sfx/`
4. Codex fills one row per audio item in `audio_catalog.xlsx`.
5. Codex updates runtime mapping files as needed.

## Required fields per row
- `id`
- `type` (`bgm` or `sfx`)
- `name`
- `file_name`
- `scene_or_trigger`
- `volume`
- `loop`
- `platform`
- `enabled`

## Trigger examples
- Scene BGM: `home`, `stageSelect`, `battle`, `study`, `settings`
- Skill SFX: `skill:astig`, `skill:macular`
- Basic slash: `basic_slash`
