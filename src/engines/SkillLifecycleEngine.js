const SKILL_LIFECYCLE_STAGES = Object.freeze([
  'cast_request',
  'cast_result',
  'cast_feedback',
  'cast_start_animation',
  'apply_effect',
  'effect_duration',
  'effect_end',
  'cast_end_animation',
  'skill_exit_start',
  'skill_exit_complete',
  'resume_battle',
  'battle_end_check'
]);

const STAGE_SET = new Set(SKILL_LIFECYCLE_STAGES);

function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value : String(value ?? '');
  return text.trim() || fallback;
}

function normalizeBool(value, fallback = null) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function resolveCastResult(cast = null) {
  const payload = cast && typeof cast === 'object' ? cast : {};
  const castResult = payload?.castResult && typeof payload.castResult === 'object'
    ? payload.castResult
    : {};
  const result = payload?.result && typeof payload.result === 'object'
    ? payload.result
    : {};
  const outcome = safeString(
    castResult?.outcome
      || result?.outcome,
    ''
  );
  const success = normalizeBool(
    castResult?.success,
    normalizeBool(
      result?.success,
      outcome ? outcome !== 'failed' : null
    )
  );
  const failReason = safeString(
    castResult?.failReason
      || result?.failReason,
    ''
  );
  return {
    outcome,
    success,
    failReason
  };
}

export function createSkillLifecycleEngine({
  onStage = null
} = {}) {
  function emitStage(stage = '', cast = null, detail = {}) {
    const normalizedStage = safeString(stage);
    if (!normalizedStage || !STAGE_SET.has(normalizedStage)) return null;
    const source = cast && typeof cast === 'object' ? cast : {};
    const castResult = resolveCastResult(source);
    const payload = detail && typeof detail === 'object' ? detail : {};
    const event = {
      ts: Date.now(),
      stage: normalizedStage,
      castId: safeString(source?.castId),
      skillId: safeString(source?.skillId),
      casterPlayerId: safeString(source?.casterPlayerId),
      targetPlayerId: safeString(source?.targetPlayerId),
      localRole: safeString(source?.localRole),
      outcome: castResult.outcome,
      success: castResult.success,
      failReason: castResult.failReason,
      detail: payload
    };
    if (typeof onStage === 'function') {
      onStage(event);
    }
    return event;
  }

  return {
    stages: SKILL_LIFECYCLE_STAGES,
    emitStage
  };
}

export {
  SKILL_LIFECYCLE_STAGES
};
