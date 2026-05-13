import skillsSource from './skills.json';
import animationsSource from './skill_animations.json';

const ICON_BY_SKILL_ID = {
  astig: '🕶️',
  chlorophyll: '🌿',
  'prism-break': '🌈',
  'corneal-shield': '🛡️',
  'amblyopia-trap': '👁️'
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function clampMinInt(value, min = 0, fallback = 0) {
  const n = Math.round(toNumber(value, fallback));
  return Math.max(min, n);
}

function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value : String(value ?? '');
  return text.trim() || fallback;
}

function buildAnimationIndex() {
  const list = Array.isArray(animationsSource?.animations) ? animationsSource.animations : [];
  const byAnimationKey = new Map();
  const bySkillId = new Map();

  list.forEach((item) => {
    const animationKey = safeString(item?.animationKey);
    const skillId = safeString(item?.skillId);
    if (animationKey) byAnimationKey.set(animationKey, item);
    if (skillId) bySkillId.set(skillId, item);
  });

  return { byAnimationKey, bySkillId };
}

function resolveAnimationBinding(skill, animationIndex) {
  const requestedKey = safeString(skill?.animationKey);
  const skillId = safeString(skill?.skillId);
  const direct = requestedKey ? animationIndex.byAnimationKey.get(requestedKey) : null;
  if (direct) return { animation: direct, resolvedAnimationKey: requestedKey };

  const bySkill = skillId ? animationIndex.bySkillId.get(skillId) : null;
  if (bySkill) {
    return {
      animation: bySkill,
      resolvedAnimationKey: safeString(bySkill.animationKey, requestedKey || skillId)
    };
  }

  return { animation: null, resolvedAnimationKey: requestedKey || skillId };
}

function extractVisualEffects(visualBinding, animation) {
  const keys = [
    safeString(visualBinding?.castVisualKey),
    safeString(visualBinding?.hitVisualKey),
    safeString(visualBinding?.impactVisualKey),
    safeString(visualBinding?.durationVisualKey),
    safeString(animation?.castStart?.visualKey),
    safeString(animation?.onHit?.visualKey),
    safeString(animation?.onHit?.impactVisualKey),
    safeString(animation?.durationEffect?.visualKey),
    safeString(animation?.castEnd?.visualKey)
  ].filter(Boolean);

  return [...new Set(keys)];
}

function normalizeSkill(skill, animationIndex) {
  const runtime = skill?.runtime ?? {};
  if (!runtime?.isImplemented || !runtime?.isProgramReadable) return null;

  const logic = skill?.logic ?? {};
  const timing = logic?.timing ?? {};
  const execution = skill?.execution ?? {};
  const unlock = skill?.unlock ?? {};
  const cost = skill?.cost ?? {};
  const visualBinding = skill?.visualBinding ?? {};
  const statusEffects = logic?.statusEffects ?? {};
  const effectType = safeString(logic?.effectType, 'damage');
  const baseValue = clampMinInt(logic?.baseEffectValue, 0, 0);
  const { animation, resolvedAnimationKey } = resolveAnimationBinding(skill, animationIndex);
  const damageTextMode = safeString(visualBinding?.damageTextMode || animation?.onHit?.damageTextMode);
  const textColor = safeString(visualBinding?.textColor || animation?.onHit?.textColor);
  const audioKey = safeString(visualBinding?.audioKey || animation?.audio?.key);
  const hapticMode = safeString(visualBinding?.hapticMode || animation?.haptic?.mode);
  const castVisualKey = safeString(visualBinding?.castVisualKey || animation?.castStart?.visualKey);
  const hitVisualKey = safeString(visualBinding?.hitVisualKey || animation?.onHit?.visualKey);
  const impactVisualKey = safeString(visualBinding?.impactVisualKey || animation?.onHit?.impactVisualKey);
  const durationVisualKey = safeString(visualBinding?.durationVisualKey || animation?.durationEffect?.visualKey);
  const endVisualKey = safeString(animation?.castEnd?.visualKey);
  const clearTiming = safeString(animation?.castEnd?.clearTiming, execution?.skillEndCondition);
  const useHitEventsVisual = Boolean(animation?.onHit?.useHitEvents);
  const useHitEventsExecution = Boolean(execution?.generateHitEvents);
  const hitPattern = logic?.hitPattern && typeof logic.hitPattern === 'object' ? logic.hitPattern : {};

  return {
    id: safeString(skill?.skillId),
    name: safeString(skill?.name),
    enName: safeString(skill?.enName),
    icon: ICON_BY_SKILL_ID[safeString(skill?.skillId)] ?? '✨',
    cost: clampMinInt(cost?.mp, 0, 0),
    cooldownSec: Math.max(0, toNumber(cost?.cooldownSec, 0)),
    damage: effectType === 'heal' ? 0 : baseValue,
    healValue: effectType === 'heal' ? baseValue : 0,
    extraEffect: safeString(skill?.description),
    animationStyle: safeString(visualBinding?.animationStyle),
    soundEffect: audioKey,
    animationKey: resolvedAnimationKey,
    effectType,
    effectMode: safeString(logic?.effectMode),
    skillType: safeString(logic?.skillType),
    targetRule: safeString(logic?.targetRule, 'opponent'),
    baseEffectValue: baseValue,
    hitCount: clampMinInt(logic?.hitCount, 1, 1),
    valuePerHit: clampMinInt(logic?.valuePerHit, 0, 0),
    pvpAuthoritativeValue: clampMinInt(logic?.pvpAuthoritativeValue, 0, baseValue),
    pauseDurationMs: clampMinInt(timing?.pauseDurationMs, 0, 0),
    startAtMs: clampMinInt(timing?.startAtMs, 0, 0),
    intervalMs: clampMinInt(timing?.intervalMs, 0, 0),
    resolveMode: safeString(timing?.resolveMode),
    timeSyncField: safeString(timing?.timeSyncField),
    pveStrategy: safeString(execution?.pveStrategy),
    pvpStrategy: safeString(execution?.pvpStrategy),
    pvpAuthoritySource: safeString(execution?.pvpAuthoritySource),
    sendSkillDamagePacket: Boolean(execution?.sendSkillDamagePacket),
    generateHitEvents: Boolean(execution?.generateHitEvents),
    targetView: safeString(execution?.targetView),
    skillEndCondition: safeString(execution?.skillEndCondition),
    battleOutcomeTiming: safeString(execution?.battleOutcomeTiming),
    pvpPacketRule: safeString(execution?.pvpPacketRule),
    hitPattern,
    statusEffects: {
      id: safeString(statusEffects?.id),
      target: safeString(statusEffects?.target),
      durationMs: clampMinInt(statusEffects?.durationMs, 0, 0),
      tickMs: clampMinInt(statusEffects?.tickMs, 0, 0),
      hasStatusEffect: Boolean(statusEffects?.hasStatusEffect)
    },
    castVisualKey,
    hitVisualKey,
    impactVisualKey,
    durationVisualKey,
    endVisualKey,
    clearTiming,
    damageTextMode,
    textColor,
    audioKey,
    hapticMode,
    useHitEventsVisual,
    useHitEventsExecution,
    visualEffects: extractVisualEffects(visualBinding, animation),
    audioEffects: audioKey ? [audioKey] : [],
    implementationStatus: safeString(runtime?.implementationStatus),
    displayStatus: safeString(runtime?.displayStatus),
    skillTreeDisplay: safeString(runtime?.skillTreeDisplay),
    equipable: Boolean(unlock?.learnable) && Boolean(runtime?.isTreeVisible),
    learnable: Boolean(unlock?.learnable),
    defaultUnlocked: Boolean(unlock?.defaultUnlocked),
    spCost: clampMinInt(unlock?.spCost, 0, 0),
    prerequisites: Array.isArray(unlock?.prerequisites) ? unlock.prerequisites : [],
    unlockCondition: safeString(unlock?.unlockCondition),
    bossOnly: false,
    description: safeString(skill?.description),
    devNotes: safeString(skill?.devNotes),
    fallbackAllowed: Boolean(animation?.fallbackAllowed),
    codexCheck: safeString(animation?.codexCheck),
    sharedEntrypoints: {
      pve: safeString(animation?.sharedEntrypoints?.pve),
      pvp: safeString(animation?.sharedEntrypoints?.pvp)
    }
  };
}

const animationIndex = buildAnimationIndex();

export const skillPool = (Array.isArray(skillsSource?.skills) ? skillsSource.skills : [])
  .map(skill => normalizeSkill(skill, animationIndex))
  .filter(Boolean);
