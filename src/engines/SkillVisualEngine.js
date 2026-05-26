import { getSkillAnimationConfig } from '../data/skillAnimations.js';

function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value : String(value ?? '');
  return text.trim() || fallback;
}

function normalizeKey(value = '') {
  return safeString(value)
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function resolveColor(name = '') {
  const key = safeString(name).toLowerCase();
  if (key === 'green') return '#22c55e';
  if (key === 'cyan') return '#06b6d4';
  if (key === 'yellow') return '#eab308';
  if (key === 'blue') return '#3b82f6';
  if (key === 'red') return '#ef4444';
  return '#ef4444';
}

function pickHitPattern(hapticMode = '') {
  const mode = safeString(hapticMode).toLowerCase();
  if (mode === 'heavy') return [24, 26, 24];
  if (mode === 'medium') return [16, 18, 16];
  if (mode === 'light') return 14;
  if (mode === 'per_hit') return 12;
  return 16;
}

function buildRandomSlashLine() {
  const centerX = Math.random() * window.innerWidth;
  const centerY = Math.random() * window.innerHeight;
  const angle = Math.random() * Math.PI * 2;
  const length = 180 + (Math.random() * 260);
  const half = length / 2;
  const x1 = centerX - (Math.cos(angle) * half);
  const y1 = centerY - (Math.sin(angle) * half);
  const x2 = centerX + (Math.cos(angle) * half);
  const y2 = centerY + (Math.sin(angle) * half);
  return { x1, y1, x2, y2 };
}

function buildTargetedSlashLine(role = '') {
  const normalizedRole = safeString(role).toLowerCase();
  const targetId = normalizedRole === 'target' ? 'player-hp-anchor' : 'enemy-hp-anchor';
  const anchor = typeof document !== 'undefined' ? document.getElementById(targetId) : null;
  if (!anchor) return buildRandomSlashLine();
  const rect = anchor.getBoundingClientRect();
  const centerX = rect.left + (rect.width / 2) + ((Math.random() - 0.5) * Math.max(20, rect.width * 0.35));
  const centerY = rect.top + (rect.height / 2) + ((Math.random() - 0.5) * Math.max(20, rect.height * 0.65));
  const angle = Math.random() * Math.PI * 2;
  const length = 200 + (Math.random() * 180);
  const half = length / 2;
  const x1 = centerX - (Math.cos(angle) * half);
  const y1 = centerY - (Math.sin(angle) * half);
  const x2 = centerX + (Math.cos(angle) * half);
  const y2 = centerY + (Math.sin(angle) * half);
  return { x1, y1, x2, y2 };
}

export function createSkillVisualEngine({
  resolveSkillAnimation = getSkillAnimationConfig,
  drawSlashLine = null,
  showDamagePopup = null,
  triggerImpactShake = null,
  triggerHaptic = null,
  playAudioKey = null
} = {}) {
  function resolveAnimation(skill = null, cast = null) {
    const animationKey = safeString(cast?.animationKey || skill?.animationKey);
    const skillId = safeString(cast?.skillId || skill?.id || skill?.skillId);
    return resolveSkillAnimation({ animationKey, skillId });
  }

  function buildCastPayload(skill = null, cast = null, role = '') {
    const animation = resolveAnimation(skill, cast);
    const onHit = animation?.onHit ?? {};
    const textMode = safeString(onHit?.damageTextMode || skill?.damageTextMode);
    const textColor = safeString(onHit?.textColor || skill?.textColor);
    return {
      animation,
      textMode,
      textColor,
      audioKey: safeString(animation?.audio?.key || skill?.audioKey),
      hapticMode: safeString(animation?.haptic?.mode || skill?.hapticMode),
      role: safeString(role || cast?.localRole)
    };
  }

  function playHit({ skill = null, cast = null, hitEvent = null, role = '' } = {}) {
    if (!hitEvent || typeof hitEvent !== 'object') return;
    const payload = buildCastPayload(skill, cast, role);
    const normalizedSkillId = normalizeKey(skill?.id || skill?.skillId || cast?.skillId);
    const normalizedAnimationKey = normalizeKey(cast?.animationKey || skill?.animationKey);
    const damage = Math.max(0, Math.round(Number(hitEvent?.damage ?? 0)));
    const healAmount = Math.max(0, Math.round(Number(hitEvent?.heal ?? 0)));
    const isHeal = healAmount > 0 || safeString(skill?.effectType).toLowerCase() === 'heal';
    const onHitVisualKey = normalizeKey(payload?.animation?.onHit?.visualKey || skill?.hitVisualKey);
    const forceSlashForAstig = normalizedSkillId === 'astig' || normalizedAnimationKey === 'astig';
    const shouldDrawSlash = !isHeal && typeof drawSlashLine === 'function'
      && (onHitVisualKey === 'slash_line' || forceSlashForAstig);

    if (shouldDrawSlash) {
      const line = buildTargetedSlashLine(payload.role);
      drawSlashLine(line.x1, line.y1, line.x2, line.y2, { muteShake: true });
    } else if (!isHeal && damage > 0 && (normalizedSkillId === 'astig' || normalizedAnimationKey === 'astig')) {
      console.warn(`[SkillVisual] astig 命中特效未觸發，onHitVisualKey=${onHitVisualKey || '(empty)'}`);
    }

    if (typeof triggerImpactShake === 'function' && !isHeal && (damage > 0 || onHitVisualKey)) {
      triggerImpactShake(Math.random() * 360, 28, 0.035);
    }

    if (typeof showDamagePopup === 'function') {
      if (isHeal) {
        const amount = Math.max(0, healAmount || Number(hitEvent?.actualHeal ?? 0));
        if (amount > 0) {
          const localRole = safeString(payload.role);
          const showOnPlayer = localRole === 'caster' || localRole === 'target';
          showDamagePopup(`+${amount}`, showOnPlayer, resolveColor(payload.textColor || 'green'));
        }
      } else if (damage > 0) {
        const localRole = safeString(payload.role);
        const showOnPlayer = localRole === 'target';
        showDamagePopup(`-${damage}`, showOnPlayer, resolveColor(payload.textColor || 'red'));
      }
    }

    if (typeof playAudioKey === 'function') {
      playAudioKey(payload.audioKey, { isHeal, damage, healAmount });
    }

    const suppressHaptic = Boolean(hitEvent?.suppressHaptic);
    if (typeof triggerHaptic === 'function' && !suppressHaptic) {
      const mode = payload.hapticMode;
      if (mode) triggerHaptic(pickHitPattern(mode));
    }
  }

  return {
    resolveAnimation,
    buildCastPayload,
    playHit
  };
}
