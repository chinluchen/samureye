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

function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value : String(value ?? '');
  return text.trim() || fallback;
}

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
      hasStatusEffect: Boolean(skill.statusEffects.hasStatusEffect)
    }
    : {
      id: '',
      target: '',
      durationMs: 0,
      tickMs: 0,
      hasStatusEffect: false
    };

  let result = {
    outcome: 'effect_only',
    damage: 0
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
      heal
    };
  } else if (hitEvents.length > 0) {
    const totalDamage = hitEvents.reduce((sum, hit) => sum + Math.max(0, toInt(hit.damage, 0)), 0);
    result = {
      outcome: totalDamage > 0 ? 'damage' : 'effect_only',
      damage: totalDamage
    };
  } else {
    const singleDamage = resolveDamageTotal(skill);
    result = {
      outcome: singleDamage > 0 ? 'damage' : 'effect_only',
      damage: singleDamage
    };
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
    hostPlayerId: safeString(hostPlayerId),
    timing: {
      resolveRatio: normalizedResolveRatio
    },
    result
  };
}
