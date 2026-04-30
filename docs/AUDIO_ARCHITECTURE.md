# Audio Architecture

## Folders
- BGM files: `src/assets/audio/bgm/`
- SFX files: `src/assets/audio/sfx/`

## Routing
- Scene to BGM scene mapping: `src/data/audioCatalog.js` -> `SCREEN_BGM_SCENE`
- BGM synth presets by scene: `src/data/audioCatalog.js` -> `BGM_SCENE_PRESETS`
- Skill to SFX profile mapping: `src/data/audioCatalog.js` -> `SKILL_SFX_PROFILE`

## Runtime Integration
- App screen changes call `sfx.setBgmScene(sceneId)` in `src/App.vue`.
- Skill cast uses `sfx.playSkillCast(skill)` in `src/composables/useBattleGame.js`.
- Current implementation uses synth SFX/BGM and is ready to swap to file-based audio later.

## Safe Edit Rule
- If you only want to rebalance audio style, edit `audioCatalog.js` only.
- Avoid editing battle logic for audio tuning to reduce regression risk.
