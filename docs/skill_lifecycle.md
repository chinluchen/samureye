# Skill Lifecycle Spec

## Goal
All skills must follow one shared lifecycle pipeline.  
No skill is allowed to only apply damage/heal/status without animation and lifecycle stages.

## Required Lifecycle Stages
Every skill cast must emit the following stages:

1. `cast_request`
2. `cast_result`
3. `cast_feedback`
4. `cast_start_animation`
5. `apply_effect`
6. `effect_duration`
7. `effect_end`
8. `cast_end_animation`
9. `resume_battle`
10. `battle_end_check`

## Runtime Rules
- The pipeline entry for PvP is unified:
  - request path: `handlePlayerSkillUse` / `handleSkillCastRequest`
  - execution path: `tryStartQueuedSkillCast`
- `cast_result` is host-authoritative.
- `cast_feedback` must show success/failed text on caster side.
- `cast_start_animation` must always run (or explicit fallback animation if missing config).
- `apply_effect` must run through shared engines (`SkillEngine` / `StatusEffectEngine` / `SkillVisualEngine`), not ad-hoc direct mutations.
- `battle_end_check` is host-authoritative. Only host broadcasts `battle_end`.

## Persistent Effects
- Persistent skills (status effects) still follow the same stages.
- `resume_battle` can happen before `effect_end` for persistent effects.
- `effect_end` is emitted when the effect actually expires and state is restored.
- In PvP, effect duration uses synchronized battle time (paused skill windows do not consume duration).

## Data Contract
Each skill must have (or derive with fallback + warning):
- `skillId`
- `effectType`
- `target`
- `animationKey`
- `castFeedback`
- `effectStart`
- `effectEnd`
- `pvp.syncMode`

If missing, the game must warn in development mode:
- `Missing animation config for skillId=...`
- `Missing checklist fields for skillId=...`

## Prism Break Rule
- `prism-break` is `visual_disrupt`, target opponent.
- Host decides success/failure, offset, duration, start/end timestamps.
- Caster side: feedback text only.
- Target side: snap displacement at start, snap-back at end.
- It still must emit all lifecycle stages above.
