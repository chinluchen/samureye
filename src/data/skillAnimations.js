import animationSource from './skill_animations.json';

function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value : String(value ?? '');
  return text.trim() || fallback;
}

function normalizeAnimationEntry(entry = {}) {
  const animationKey = safeString(entry?.animationKey);
  return {
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

export function getSkillAnimationConfig({ animationKey = '', skillId = '' } = {}) {
  const normalizedAnimationKey = safeString(animationKey);
  const normalizedSkillId = safeString(skillId);
  if (normalizedAnimationKey && skillAnimationsByKey.has(normalizedAnimationKey)) {
    return skillAnimationsByKey.get(normalizedAnimationKey) ?? null;
  }
  if (normalizedSkillId && skillAnimationsBySkillId.has(normalizedSkillId)) {
    return skillAnimationsBySkillId.get(normalizedSkillId) ?? null;
  }
  return null;
}
