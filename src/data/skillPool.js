import skillsSource from './skills.json';
import animationsSource from './skill_animations.json';

const IS_DEV = typeof import.meta !== 'undefined' && Boolean(import.meta?.env?.DEV);
const warnedSkillLifecycleMessages = new Set();
const warnedAnimationAliases = new Set();
const LEGACY_ANIMATION_KEY_ALIASES = Object.freeze({
  chlorophyll: 'macular'
});
const LEGACY_SKILL_ID_ALIASES = Object.freeze({
  chlorophyll: 'macular'
});

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

function clampRangeInt(value, min = -9999, max = 9999, fallback = 0) {
  const n = Math.round(toNumber(value, fallback));
  return Math.max(min, Math.min(max, n));
}

function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value : String(value ?? '');
  return text.trim() || fallback;
}

function warnSkillLifecycle(message = '') {
  if (!IS_DEV) return;
  const text = safeString(message);
  if (!text || warnedSkillLifecycleMessages.has(text)) return;
  warnedSkillLifecycleMessages.add(text);
  console.warn(text);
}

function warnAnimationAlias(field = '', from = '', to = '') {
  if (!IS_DEV) return;
  const signature = `${field}:${from}->${to}`;
  if (warnedAnimationAliases.has(signature)) return;
  warnedAnimationAliases.add(signature);
  console.warn(`[SkillConfig] Using legacy animation alias ${field}: ${from} -> ${to}`);
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
  if (direct) return { animation: direct, resolvedAnimationKey: requestedKey, usedAlias: false };

  const aliasedRequestedKey = safeString(LEGACY_ANIMATION_KEY_ALIASES[requestedKey]);
  if (aliasedRequestedKey && animationIndex.byAnimationKey.has(aliasedRequestedKey)) {
    warnAnimationAlias('animationKey', requestedKey, aliasedRequestedKey);
    return {
      animation: animationIndex.byAnimationKey.get(aliasedRequestedKey) ?? null,
      resolvedAnimationKey: aliasedRequestedKey,
      usedAlias: true
    };
  }

  const bySkill = skillId ? animationIndex.bySkillId.get(skillId) : null;
  if (bySkill) {
    return {
      animation: bySkill,
      resolvedAnimationKey: safeString(bySkill.animationKey, requestedKey || skillId),
      usedAlias: false
    };
  }

  const aliasedSkillId = safeString(LEGACY_SKILL_ID_ALIASES[skillId]);
  if (aliasedSkillId && animationIndex.bySkillId.has(aliasedSkillId)) {
    warnAnimationAlias('skillId', skillId, aliasedSkillId);
    const byAliasedSkill = animationIndex.bySkillId.get(aliasedSkillId);
    return {
      animation: byAliasedSkill ?? null,
      resolvedAnimationKey: safeString(byAliasedSkill?.animationKey, requestedKey || aliasedSkillId || skillId),
      usedAlias: true
    };
  }

  return { animation: null, resolvedAnimationKey: requestedKey || skillId, usedAlias: false };
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
  const pvpConfig = skill?.pvp && typeof skill.pvp === 'object' ? skill.pvp : {};
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
  const pvpSyncMode = safeString(
    pvpConfig?.syncMode
      ?? pvpConfig?.sync_mode
      ?? execution?.pvpStrategy
      ?? execution?.pvpAuthoritySource
  );
  const lifecycleCastFeedback = {
    success: safeString(
      animation?.castFeedback?.success
        || statusEffects?.casterFeedbackText,
      '技能施放成功'
    ),
    failed: safeString(
      animation?.castFeedback?.failed,
      '技能施放失敗'
    )
  };
  const lifecycleCastStartAnimation = safeString(castVisualKey || animation?.castStart?.visualKey, 'fallback_cast_start');
  const lifecycleEffectStart = safeString(hitVisualKey || impactVisualKey || durationVisualKey || lifecycleCastStartAnimation, 'fallback_effect_start');
  const lifecycleEffectEnd = safeString(endVisualKey || statusEffects?.endVisualKey || animation?.castEnd?.visualKey, 'fallback_effect_end');
  const lifecycleCastEndAnimation = safeString(endVisualKey || animation?.castEnd?.visualKey, lifecycleEffectEnd);
  const lifecycle = {
    castFeedback: lifecycleCastFeedback,
    castStartAnimation: lifecycleCastStartAnimation,
    effectStart: lifecycleEffectStart,
    effectEnd: lifecycleEffectEnd,
    castEndAnimation: lifecycleCastEndAnimation,
    pvpSyncMode: pvpSyncMode || 'host_result'
  };

  const requiredChecklist = [
    ['skillId', safeString(skill?.skillId)],
    ['effectType', effectType],
    ['target', safeString(logic?.targetRule)],
    ['animationKey', safeString(resolvedAnimationKey)],
    ['castFeedback', lifecycle.castFeedback.success && lifecycle.castFeedback.failed ? 'ok' : ''],
    ['effectStart', lifecycle.effectStart],
    ['effectEnd', lifecycle.effectEnd],
    ['pvp.syncMode', lifecycle.pvpSyncMode]
  ];
  const missingChecklistFields = requiredChecklist
    .filter(([, value]) => !safeString(value))
    .map(([key]) => key);
  const skillId = safeString(skill?.skillId, 'unknown-skill');
  if (!animation) {
    warnSkillLifecycle(`[SkillConfig] Missing animation config for skillId=${skillId}`);
  }
  if (missingChecklistFields.length > 0) {
    warnSkillLifecycle(`[SkillConfig] Missing checklist fields for skillId=${skillId}: ${missingChecklistFields.join(', ')}`);
  }
  if (!safeString(animation?.castStart?.visualKey)) {
    warnSkillLifecycle(`[SkillConfig] Missing cast_start_animation in animation config for skillId=${skillId}`);
  }
  if (!safeString(animation?.castEnd?.visualKey)) {
    warnSkillLifecycle(`[SkillConfig] Missing cast_end_animation in animation config for skillId=${skillId}`);
  }
  if (!safeString(animation?.castFeedback?.success) || !safeString(animation?.castFeedback?.failed)) {
    warnSkillLifecycle(`[SkillConfig] Missing cast_feedback in animation config for skillId=${skillId}`);
  }

  return {
    id: skillId,
    name: safeString(skill?.name),
    enName: safeString(skill?.enName),
    icon: ICON_BY_SKILL_ID[skillId] ?? '✨',
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
    statusEffectId: safeString(logic?.statusEffectId || statusEffects?.id),
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
    effectDurationMs: clampMinInt(logic?.effectDurationMs ?? statusEffects?.durationMs, 0, 0),
    successRate: Math.max(0, Math.min(1, toNumber(logic?.successRate ?? statusEffects?.successRate ?? pvpConfig?.successRate, 1))),
    failReason: safeString(logic?.failReason ?? statusEffects?.failReason),
    pveStrategy: safeString(execution?.pveStrategy),
    pvpStrategy: safeString(execution?.pvpStrategy),
    pvpAuthoritySource: safeString(execution?.pvpAuthoritySource),
    pvpSyncMode: lifecycle.pvpSyncMode,
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
      hasStatusEffect: Boolean(statusEffects?.hasStatusEffect),
      mode: safeString(statusEffects?.mode, 'snap'),
      offsetX: clampRangeInt(statusEffects?.offsetX, -360, 360, 0),
      offsetY: clampRangeInt(statusEffects?.offsetY, -360, 360, 0),
      targetVisualKey: safeString(statusEffects?.targetVisualKey),
      endVisualKey: safeString(statusEffects?.endVisualKey),
      casterFeedbackText: safeString(statusEffects?.casterFeedbackText),
      failReason: safeString(statusEffects?.failReason),
      successRate: Math.max(0, Math.min(1, toNumber(statusEffects?.successRate, 1)))
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
    },
    target: safeString(logic?.targetRule, 'opponent'),
    lifecycle
  };
}

const animationIndex = buildAnimationIndex();

export const skillPool = (Array.isArray(skillsSource?.skills) ? skillsSource.skills : [])
  .map(skill => normalizeSkill(skill, animationIndex))
  .filter(Boolean);
