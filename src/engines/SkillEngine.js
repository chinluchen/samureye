function toNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function toInt(value, fallback = 0) {
  return Math.round(toNumber(value, fallback));
}

function clampInt(value, min = 0, fallback = 0) {
  return Math.max(min, toInt(value, fallback));
}

function clampNumber(value, min = 0, max = 1, fallback = 0) {
  const n = toNumber(value, fallback);
  return Math.max(min, Math.min(max, n));
}

function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value : String(value ?? '');
  return text.trim() || fallback;
}

const DEFAULT_CAST_FEEDBACK = Object.freeze({
  success: '技能施放成功',
  failed: '技能施放失敗'
});

export function resolveSkillEffectType(skill = null) {
  return safeString(skill?.effectType || skill?.logic?.effectType, 'damage');
}

export function resolveSkillTargetRule(skill = null) {
  return safeString(skill?.targetRule || skill?.logic?.targetRule, 'opponent');
}

export function parseSkillHitPattern(skill = null) {
  const pattern = skill?.hitPattern && typeof skill.hitPattern === 'object'
    ? skill.hitPattern
    : {};

  const type = safeString(pattern.type || skill?.effectMode, 'single_hit');
  const hitCount = clampInt(pattern.hitCount ?? skill?.hitCount, 1, 1);
  const valuePerHit = clampInt(
    pattern.damagePerHit ?? pattern.valuePerHit ?? pattern.amountPerHit ?? skill?.valuePerHit,
    0,
    0
  );
  const startAtMs = clampInt(pattern.startAtMs ?? skill?.startAtMs, 0, 0);
  const intervalMs = clampInt(pattern.intervalMs ?? skill?.intervalMs, 0, 0);
  const amount = clampInt(pattern.amount ?? skill?.baseEffectValue, 0, 0);
  return {
    ...pattern,
    type,
    hitCount,
    valuePerHit,
    startAtMs,
    intervalMs,
    amount
  };
}

export function shouldUseHitEventsForSkill(skill = null) {
  const hitPattern = parseSkillHitPattern(skill);
  const strategy = safeString(skill?.pvpStrategy);
  if (strategy === 'host_hit_events') return true;
  if (skill?.generateHitEvents) return true;
  if (hitPattern.type.includes('multi_hit')) return true;
  if (hitPattern.type.includes('dot')) return true;
  return false;
}

function resolveDamageTotal(skill = null) {
  const pvpValue = clampInt(skill?.pvpAuthoritativeValue, 0, 0);
  if (pvpValue > 0) return pvpValue;
  const baseValue = clampInt(skill?.baseEffectValue ?? skill?.damage, 0, 0);
  return baseValue;
}

function resolveHealTotal(skill = null) {
  const pvpValue = clampInt(skill?.pvpAuthoritativeValue, 0, 0);
  if (pvpValue > 0) return pvpValue;
  return clampInt(skill?.baseEffectValue ?? skill?.healValue, 0, 0);
}

export function buildDamageHitEvents({
  skill = null,
  castStartAtMs = Date.now(),
  targetHp = 0
} = {}) {
  const hitPattern = parseSkillHitPattern(skill);
  const hitCount = clampInt(hitPattern.hitCount ?? skill?.hitCount, 1, 1);
  const startAtMs = clampInt(hitPattern.startAtMs ?? skill?.startAtMs, 0, 0);
  const intervalMs = clampInt(hitPattern.intervalMs ?? skill?.intervalMs, 0, 0);
  const totalDamage = resolveDamageTotal(skill);
  const explicitPerHit = clampInt(hitPattern.valuePerHit, 0, 0);
  const computedPerHit = hitCount > 0 ? Math.floor(totalDamage / hitCount) : 0;
  const damagePerHit = explicitPerHit > 0 ? explicitPerHit : computedPerHit;
  const effectiveHitsByTotal = damagePerHit > 0
    ? Math.floor(totalDamage / damagePerHit)
    : hitCount;
  const effectiveHitCount = Math.max(0, Math.min(hitCount, effectiveHitsByTotal || hitCount));
  let hpCursor = clampInt(targetHp, 0, 0);

  const hitEvents = [];
  for (let hitIndex = 1; hitIndex <= hitCount; hitIndex += 1) {
    let damage = hitIndex <= effectiveHitCount ? damagePerHit : 0;
    if (hpCursor <= 0) damage = 0;
    const hpBefore = hpCursor;
    const hpAfter = Math.max(0, hpBefore - damage);
    const offsetMs = startAtMs + ((hitIndex - 1) * intervalMs);
    const atMs = castStartAtMs + offsetMs;
    hitEvents.push({
      hitIndex,
      atMs,
      offsetMs,
      damage,
      hpBefore,
      hpAfter
    });
    hpCursor = hpAfter;
  }

  return hitEvents;
}

export function buildHealResult({
  skill = null,
  currentHp = 0,
  maxHp = 0
} = {}) {
  const rawHeal = resolveHealTotal(skill);
  const hpBefore = clampInt(currentHp, 0, 0);
  const hpCap = Math.max(hpBefore, clampInt(maxHp, 0, 0));
  const hpAfter = Math.min(hpCap, hpBefore + rawHeal);
  const actualHeal = Math.max(0, hpAfter - hpBefore);
  return {
    rawHeal,
    actualHeal,
    hpBefore,
    hpAfter,
    maxHp: hpCap
  };
}

export function buildHostAuthoritativeSkillCast({
  skill = null,
  castId = '',
  casterPlayerId = '',
  targetPlayerId = '',
  hostPlayerId = '',
  battleRemainingMsAtCast = 0,
  resolveRatio = 0.62,
  pauseDurationMs = 0,
  targetCurrentHp = 0,
  targetMaxHp = 0,
  castStartAtMs = Date.now()
} = {}) {
  const effectType = resolveSkillEffectType(skill);
  const isHeal = effectType === 'heal';
  const isVisualDisrupt = effectType === 'visual_disrupt';
  const skillId = safeString(skill?.id || skill?.skillId);
  const animationKey = safeString(skill?.animationKey, skillId);
  const hitEvents = (!isHeal && shouldUseHitEventsForSkill(skill))
    ? buildDamageHitEvents({
      skill,
      castStartAtMs,
      targetHp: targetCurrentHp
    })
    : [];
  const resolvedPauseDurationMs = clampInt(pauseDurationMs || skill?.pauseDurationMs, 800, 3700);
  const resolvedBattleRemainingMs = Math.max(0, clampInt(battleRemainingMsAtCast, 0, 0));
  const normalizedResolveRatio = Math.max(0.15, Math.min(0.9, toNumber(resolveRatio, 0.62)));
  const statusEffects = skill?.statusEffects && typeof skill.statusEffects === 'object'
    ? {
      id: safeString(skill.statusEffects.id),
      target: safeString(skill.statusEffects.target),
      durationMs: clampInt(skill.statusEffects.durationMs, 0, 0),
      tickMs: clampInt(skill.statusEffects.tickMs, 0, 0),
      hasStatusEffect: Boolean(skill.statusEffects.hasStatusEffect),
      mode: safeString(skill.statusEffects.mode, 'snap'),
      offsetX: toInt(skill.statusEffects.offsetX, 0),
      offsetY: toInt(skill.statusEffects.offsetY, 0),
      success: true,
      effectStartAtMs: castStartAtMs,
      effectEndAtMs: castStartAtMs + clampInt(skill.statusEffects.durationMs, 0, 0),
      effectStartBattleRemainingMs: clampInt(battleRemainingMsAtCast, 0, 0),
      effectEndBattleRemainingMs: Math.max(0, clampInt(battleRemainingMsAtCast, 0, 0) - clampInt(skill.statusEffects.durationMs, 0, 0)),
      targetVisualKey: safeString(skill.statusEffects.targetVisualKey),
      endVisualKey: safeString(skill.statusEffects.endVisualKey),
      casterFeedbackText: safeString(skill.statusEffects.casterFeedbackText),
      failReason: safeString(skill.statusEffects.failReason)
    }
    : {
      id: '',
      target: '',
      durationMs: 0,
      tickMs: 0,
      hasStatusEffect: false,
      mode: 'snap',
      offsetX: 0,
      offsetY: 0,
      success: true,
      effectStartAtMs: castStartAtMs,
      effectEndAtMs: castStartAtMs,
      effectStartBattleRemainingMs: clampInt(battleRemainingMsAtCast, 0, 0),
      effectEndBattleRemainingMs: clampInt(battleRemainingMsAtCast, 0, 0),
      targetVisualKey: '',
      endVisualKey: '',
      casterFeedbackText: '',
      failReason: ''
    };

  const effectDurationMs = clampInt(skill?.effectDurationMs ?? statusEffects.durationMs, 0, statusEffects.durationMs);
  if (effectDurationMs > 0) {
    statusEffects.durationMs = effectDurationMs;
  }
  const pvpSyncMode = safeString(skill?.pvpSyncMode || skill?.pvp?.syncMode || skill?.pvp?.sync_mode);
  const lifecyclePvpSyncMode = safeString(
    pvpSyncMode
      || skill?.pvpStrategy
      || skill?.execution?.pvpStrategy,
    'host_result'
  );
  const lifecycle = {
    castFeedback: {
      success: safeString(
        skill?.statusEffects?.casterFeedbackText
          || skill?.castFeedback?.success,
        DEFAULT_CAST_FEEDBACK.success
      ),
      failed: safeString(
        skill?.castFeedback?.failed,
        DEFAULT_CAST_FEEDBACK.failed
      )
    },
    castStartAnimation: safeString(
      skill?.castVisualKey
        || skill?.visualBinding?.castVisualKey
        || skill?.animationKey,
      'fallback_cast_start'
    ),
    effectStart: safeString(
      skill?.hitVisualKey
        || skill?.visualBinding?.hitVisualKey
        || skill?.animationKey,
      'fallback_effect_start'
    ),
    effectEnd: safeString(
      skill?.endVisualKey
        || skill?.statusEffects?.endVisualKey
        || skill?.visualBinding?.durationVisualKey,
      'fallback_effect_end'
    ),
    castEndAnimation: safeString(
      skill?.endVisualKey
        || skill?.statusEffects?.endVisualKey
        || skill?.animationKey,
      'fallback_cast_end'
    ),
    pvpSyncMode: lifecyclePvpSyncMode
  };

  let result = {
    outcome: 'effect_only',
    damage: 0,
    success: true,
    failReason: ''
  };
  let castResult = {
    success: true,
    failReason: '',
    outcome: 'effect_only'
  };

  if (isHeal) {
    const heal = buildHealResult({
      skill,
      currentHp: targetCurrentHp,
      maxHp: targetMaxHp
    });
    result = {
      outcome: heal.actualHeal > 0 ? 'heal' : 'effect_only',
      damage: 0,
      success: true,
      failReason: '',
      heal
    };
    castResult = {
      success: true,
      failReason: '',
      outcome: result.outcome
    };
  } else if (isVisualDisrupt) {
    const successRate = clampNumber(
      skill?.successRate
        ?? skill?.statusEffects?.successRate
        ?? skill?.pvp?.successRate,
      0,
      1,
      1
    );
    const success = Math.random() < successRate;
    const failReason = safeString(skill?.failReason || statusEffects.failReason, 'resisted');
    const rawOffsetX = toInt(statusEffects.offsetX, 0);
    const rawOffsetY = toInt(statusEffects.offsetY, 0);
    const offsetX = (rawOffsetX === 0 && rawOffsetY === 0 && skillId === 'prism-break') ? 80 : rawOffsetX;
    const offsetY = (rawOffsetX === 0 && rawOffsetY === 0 && skillId === 'prism-break') ? -45 : rawOffsetY;
    result = {
      outcome: success ? 'success' : 'failed',
      success,
      damage: 0,
      failReason: success ? '' : failReason,
      statusEffect: {
        id: statusEffects.id || 'prism_displacement',
        success,
        mode: statusEffects.mode || 'snap',
        offsetX: success ? offsetX : 0,
        offsetY: success ? offsetY : 0,
        durationMs: statusEffects.durationMs,
        effectStartAtMs: castStartAtMs,
        effectEndAtMs: castStartAtMs + Math.max(0, statusEffects.durationMs),
        effectStartBattleRemainingMs: resolvedBattleRemainingMs,
        effectEndBattleRemainingMs: Math.max(0, resolvedBattleRemainingMs - Math.max(0, statusEffects.durationMs)),
        targetVisualKey: statusEffects.targetVisualKey || 'prism_displacement_snap',
        endVisualKey: statusEffects.endVisualKey || 'prism_snap_back',
        casterFeedbackText: success
          ? safeString(statusEffects.casterFeedbackText, '技能施放成功')
          : '技能施放失敗',
        failReason: success ? '' : failReason
      }
    };
    castResult = {
      success,
      failReason: success ? '' : failReason,
      outcome: result.outcome
    };
  } else if (hitEvents.length > 0) {
    const totalDamage = hitEvents.reduce((sum, hit) => sum + Math.max(0, toInt(hit.damage, 0)), 0);
    result = {
      outcome: totalDamage > 0 ? 'damage' : 'effect_only',
      damage: totalDamage,
      success: true,
      failReason: ''
    };
    castResult = {
      success: true,
      failReason: '',
      outcome: result.outcome
    };
  } else {
    const singleDamage = resolveDamageTotal(skill);
    result = {
      outcome: singleDamage > 0 ? 'damage' : 'effect_only',
      damage: singleDamage,
      success: true,
      failReason: ''
    };
    castResult = {
      success: true,
      failReason: '',
      outcome: result.outcome
    };
  }

  if (isVisualDisrupt) {
    const resultStatus = result?.statusEffect && typeof result.statusEffect === 'object'
      ? result.statusEffect
      : null;
    statusEffects.id = safeString(resultStatus?.id || statusEffects.id || 'prism_displacement');
    statusEffects.mode = safeString(resultStatus?.mode || statusEffects.mode || 'snap');
    statusEffects.success = typeof resultStatus?.success === 'boolean'
      ? resultStatus.success
      : (result?.outcome !== 'failed');
    statusEffects.offsetX = toInt(resultStatus?.offsetX, statusEffects.success ? statusEffects.offsetX : 0);
    statusEffects.offsetY = toInt(resultStatus?.offsetY, statusEffects.success ? statusEffects.offsetY : 0);
    statusEffects.effectStartAtMs = clampInt(resultStatus?.effectStartAtMs, 0, castStartAtMs);
    statusEffects.effectEndAtMs = clampInt(
      resultStatus?.effectEndAtMs,
      statusEffects.effectStartAtMs,
      statusEffects.effectStartAtMs + statusEffects.durationMs
    );
    statusEffects.effectStartBattleRemainingMs = clampInt(
      resultStatus?.effectStartBattleRemainingMs,
      0,
      resolvedBattleRemainingMs
    );
    statusEffects.effectEndBattleRemainingMs = clampInt(
      resultStatus?.effectEndBattleRemainingMs,
      0,
      Math.max(0, statusEffects.effectStartBattleRemainingMs - statusEffects.durationMs)
    );
    statusEffects.targetVisualKey = safeString(resultStatus?.targetVisualKey || statusEffects.targetVisualKey || 'prism_displacement_snap');
    statusEffects.endVisualKey = safeString(resultStatus?.endVisualKey || statusEffects.endVisualKey || 'prism_snap_back');
    statusEffects.casterFeedbackText = safeString(resultStatus?.casterFeedbackText || statusEffects.casterFeedbackText);
    statusEffects.failReason = safeString(resultStatus?.failReason || statusEffects.failReason);
    statusEffects.hasStatusEffect = Boolean(statusEffects.success);
  }

  const tailHit = hitEvents.length > 0 ? hitEvents[hitEvents.length - 1] : null;
  const resolveAtMs = tailHit
    ? clampInt(tailHit.atMs, 0, castStartAtMs)
    : (castStartAtMs + Math.round(resolvedPauseDurationMs * normalizedResolveRatio));

  return {
    castId: safeString(castId),
    casterPlayerId: safeString(casterPlayerId),
    targetPlayerId: safeString(targetPlayerId),
    skillId,
    animationKey,
    pauseDurationMs: resolvedPauseDurationMs,
    hitCount: clampInt(skill?.hitCount, 1, 1),
    hitEvents,
    visualEffects: Array.isArray(skill?.visualEffects) ? skill.visualEffects : [],
    audioEffects: Array.isArray(skill?.audioEffects) ? skill.audioEffects : [],
    battleRemainingMsAtCast: resolvedBattleRemainingMs,
    effectiveBattleTime: resolvedBattleRemainingMs,
    resolveAtMs,
    statusEffects,
    effectTimeline: {
      effectStartAtMs: castStartAtMs,
      durationMs: statusEffects.durationMs,
      tickMs: statusEffects.tickMs,
      effectEndAtMs: statusEffects.durationMs > 0 ? castStartAtMs + statusEffects.durationMs : castStartAtMs
    },
    pvpSyncMode,
    castResult,
    lifecycle,
    hostPlayerId: safeString(hostPlayerId),
    timing: {
      resolveRatio: normalizedResolveRatio
    },
    result
  };
}
