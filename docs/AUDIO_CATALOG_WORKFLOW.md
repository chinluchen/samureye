# Audio Catalog Workflow

## Template File
- `docs/audio_catalog.xlsx`

## How we use it
1. Put new audio files into:
   - `src/assets/audio/bgm/` for music
   - `src/assets/audio/sfx/` for sound effects
2. Tell Codex which file is for which scene/skill.
3. Codex fills one row per audio item in `audio_catalog.xlsx`.
4. Codex updates runtime mapping files as needed.

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
