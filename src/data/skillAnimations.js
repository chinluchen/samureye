import animationSource from './skill_animations.json';

const IS_DEV = typeof import.meta !== 'undefined' && Boolean(import.meta?.env?.DEV);
const warnedMissingAnimationKeys = new Set();
const warnedAliasBindings = new Set();
const warnedLifecycleGaps = new Set();
const LEGACY_ANIMATION_KEY_ALIASES = Object.freeze({
  chlorophyll: 'macular'
});
const LEGACY_SKILL_ID_ALIASES = Object.freeze({
  chlorophyll: 'macular'
});

function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value : String(value ?? '');
  return text.trim() || fallback;
}

function normalizeCastFeedback(rawValue = null) {
  if (rawValue && typeof rawValue === 'object') {
    return {
      success: safeString(rawValue.success, '技能施放成功'),
      failed: safeString(rawValue.failed, '技能施放失敗')
    };
  }
  const fallback = safeString(rawValue);
  return {
    success: fallback || '技能施放成功',
    failed: '技能施放失敗'
  };
}

function warnLifecycleGap(entry = null, missingFields = []) {
  if (!IS_DEV) return;
  const skillId = safeString(entry?.skillId, 'unknown');
  const signature = `${skillId}::${missingFields.join(',')}`;
  if (warnedLifecycleGaps.has(signature)) return;
  warnedLifecycleGaps.add(signature);
  console.warn(`[SkillAnimation] Missing lifecycle fields for skillId=${skillId}: ${missingFields.join(', ')}`);
}

function normalizeAnimationEntry(entry = {}) {
  const animationKey = safeString(entry?.animationKey);
  const normalized = {
    ...entry,
    animationKey,
    skillId: safeString(entry?.skillId),
    type: safeString(entry?.type),
    durationMs: Math.max(0, Math.round(Number(entry?.durationMs ?? 0))),
    onHit: {
      ...(entry?.onHit ?? {}),
      visualKey: safeString(entry?.onHit?.visualKey),
      impactVisualKey: safeString(entry?.onHit?.impactVisualKey),
      damageTextMode: safeString(entry?.onHit?.damageTextMode),
      textColor: safeString(entry?.onHit?.textColor),
      useHitEvents: Boolean(entry?.onHit?.useHitEvents)
    },
    castStart: {
      ...(entry?.castStart ?? {}),
      visualKey: safeString(entry?.castStart?.visualKey)
    },
    durationEffect: {
      ...(entry?.durationEffect ?? {}),
      visualKey: safeString(entry?.durationEffect?.visualKey)
    },
    castEnd: {
      ...(entry?.castEnd ?? {}),
      visualKey: safeString(entry?.castEnd?.visualKey),
      clearTiming: safeString(entry?.castEnd?.clearTiming)
    },
    castFeedback: normalizeCastFeedback(entry?.statusEffect?.casterFeedbackText),
    audio: {
      ...(entry?.audio ?? {}),
      key: safeString(entry?.audio?.key)
    },
    haptic: {
      ...(entry?.haptic ?? {}),
      mode: safeString(entry?.haptic?.mode)
    },
    fallbackAllowed: Boolean(entry?.fallbackAllowed)
  };
  const missingLifecycleFields = [];
  if (!normalized.castStart.visualKey) missingLifecycleFields.push('cast_start_animation');
  if (!normalized.onHit.visualKey && !normalized.durationEffect.visualKey) missingLifecycleFields.push('effect_start');
  if (!normalized.castEnd.visualKey) missingLifecycleFields.push('cast_end_animation');
  if (!normalized.castFeedback.success || !normalized.castFeedback.failed) missingLifecycleFields.push('cast_feedback');
  if (missingLifecycleFields.length > 0) {
    warnLifecycleGap(normalized, missingLifecycleFields);
  }
  return normalized;
}

const rawList = Array.isArray(animationSource?.animations) ? animationSource.animations : [];

export const skillAnimations = rawList
  .map(entry => normalizeAnimationEntry(entry))
  .filter(entry => entry.animationKey);

export const skillAnimationsByKey = new Map(skillAnimations.map(entry => [entry.animationKey, entry]));
export const skillAnimationsBySkillId = new Map(
  skillAnimations
    .filter(entry => entry.skillId)
    .map(entry => [entry.skillId, entry])
);

function warnMissingAnimationConfig({ animationKey = '', skillId = '' } = {}) {
  if (!IS_DEV) return;
  const normalizedAnimationKey = safeString(animationKey);
  const normalizedSkillId = safeString(skillId);
  const signature = `${normalizedSkillId || 'unknown'}::${normalizedAnimationKey || 'unknown'}`;
  if (warnedMissingAnimationKeys.has(signature)) return;
  warnedMissingAnimationKeys.add(signature);
  console.warn(`[SkillAnimation] Missing animation config for skillId=${normalizedSkillId || '(empty)'} animationKey=${normalizedAnimationKey || '(empty)'}`);
}

function warnAliasBinding({ field = '', from = '', to = '' } = {}) {
  if (!IS_DEV) return;
  const signature = `${field}:${from}->${to}`;
  if (warnedAliasBindings.has(signature)) return;
  warnedAliasBindings.add(signature);
  console.warn(`[SkillAnimation] Using legacy alias ${field}: ${from} -> ${to}`);
}

function buildFallbackAnimationConfig({ animationKey = '', skillId = '' } = {}) {
  const resolvedSkillId = safeString(skillId, 'unknown');
  const resolvedAnimationKey = safeString(animationKey, resolvedSkillId || 'fallback-skill');
  return {
    order: -1,
    skillId: resolvedSkillId,
    skillName: 'Fallback Skill',
    animationKey: resolvedAnimationKey,
    implementationStatus: 'fallback',
    type: 'fallback',
    durationMs: 1800,
    requiresSkillAnimationLayer: true,
    castStart: {
      visualKey: 'fallback_cast_start'
    },
    onHit: {
      visualKey: 'fallback_effect_start',
      impactVisualKey: 'fallback_effect_impact',
      damageTextMode: 'single',
      textColor: 'red',
      useHitEvents: false
    },
    durationEffect: {
      visualKey: ''
    },
    castEnd: {
      visualKey: 'fallback_cast_end',
      clearTiming: 'effect_completed_then_resume'
    },
    castFeedback: {
      success: '技能施放成功',
      failed: '技能施放失敗'
    },
    audio: {
      key: ''
    },
    haptic: {
      mode: 'light'
    },
    fallbackAllowed: true
  };
}

export function getSkillAnimationConfig({
  animationKey = '',
  skillId = '',
  allowFallback = true
} = {}) {
  const normalizedAnimationKey = safeString(animationKey);
  const normalizedSkillId = safeString(skillId);
  if (normalizedAnimationKey && skillAnimationsByKey.has(normalizedAnimationKey)) {
    return skillAnimationsByKey.get(normalizedAnimationKey) ?? null;
  }
  const aliasedAnimationKey = safeString(LEGACY_ANIMATION_KEY_ALIASES[normalizedAnimationKey]);
  if (aliasedAnimationKey && skillAnimationsByKey.has(aliasedAnimationKey)) {
    warnAliasBinding({ field: 'animationKey', from: normalizedAnimationKey, to: aliasedAnimationKey });
    return skillAnimationsByKey.get(aliasedAnimationKey) ?? null;
  }
  if (normalizedSkillId && skillAnimationsBySkillId.has(normalizedSkillId)) {
    return skillAnimationsBySkillId.get(normalizedSkillId) ?? null;
  }
  const aliasedSkillId = safeString(LEGACY_SKILL_ID_ALIASES[normalizedSkillId]);
  if (aliasedSkillId && skillAnimationsBySkillId.has(aliasedSkillId)) {
    warnAliasBinding({ field: 'skillId', from: normalizedSkillId, to: aliasedSkillId });
    return skillAnimationsBySkillId.get(aliasedSkillId) ?? null;
  }
  warnMissingAnimationConfig({
    animationKey: normalizedAnimationKey,
    skillId: normalizedSkillId
  });
  if (!allowFallback) return null;
  return buildFallbackAnimationConfig({
    animationKey: normalizedAnimationKey,
    skillId: normalizedSkillId
  });
}
