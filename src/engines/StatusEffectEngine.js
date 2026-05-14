function safeString(value, fallback = '') {
  const text = typeof value === 'string' ? value : String(value ?? '');
  return text.trim() || fallback;
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return Math.round(fallback);
  return Math.round(n);
}

function clampInt(value, min, max, fallback = 0) {
  const n = toInt(value, fallback);
  return Math.max(min, Math.min(max, n));
}

function pickStatusBoolean(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === 'boolean') return candidate;
  }
  return null;
}

function readBattleRemainingMs(...candidates) {
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n >= 0) {
      return Math.max(0, Math.round(n));
    }
  }
  return null;
}

export function createStatusEffectEngine({
  applyReticleOffset = null,
  clearReticleOffset = null,
  showCasterFeedback = null,
  onLog = null,
  onEffectStart = null,
  onEffectEnd = null
} = {}) {
  const activeEffects = new Map();

  function log(message) {
    if (typeof onLog === 'function') onLog(message);
  }

  function reset(reason = 'reset') {
    activeEffects.clear();
    if (typeof clearReticleOffset === 'function') {
      clearReticleOffset({ reason });
    }
  }

  function normalizePrismDisplacementStatus(cast = null) {
    if (!cast || typeof cast !== 'object') return null;

    const status = cast?.statusEffects && typeof cast.statusEffects === 'object'
      ? cast.statusEffects
      : {};
    const result = cast?.result && typeof cast.result === 'object'
      ? cast.result
      : {};
    const resultStatus = result?.statusEffect && typeof result.statusEffect === 'object'
      ? result.statusEffect
      : {};
    const timeline = cast?.effectTimeline && typeof cast.effectTimeline === 'object'
      ? cast.effectTimeline
      : {};

    const statusId = safeString(resultStatus.id || status.id);
    if (statusId !== 'prism_displacement') return null;

    const explicitSuccess = pickStatusBoolean(
      resultStatus.success,
      status.success,
      result.success
    );
    const outcome = safeString(result.outcome).toLowerCase();
    const success = explicitSuccess === null ? outcome !== 'failed' : explicitSuccess;

    const nowMs = Date.now();
    const durationMs = Math.max(
      0,
      toInt(
        resultStatus.durationMs
          ?? status.durationMs
          ?? timeline.durationMs,
        0
      )
    );
    const effectStartAtMs = Math.max(
      0,
      toInt(
        resultStatus.effectStartAtMs
          ?? status.effectStartAtMs
          ?? timeline.effectStartAtMs,
        nowMs
      )
    );
    const explicitEnd = toInt(
      resultStatus.effectEndAtMs
        ?? status.effectEndAtMs
        ?? timeline.effectEndAtMs,
      effectStartAtMs + durationMs
    );
    const effectEndAtMs = explicitEnd > 0
      ? Math.max(effectStartAtMs, explicitEnd)
      : (effectStartAtMs + durationMs);
    const effectStartBattleRemainingMs = readBattleRemainingMs(
      resultStatus.effectStartBattleRemainingMs,
      status.effectStartBattleRemainingMs,
      timeline.effectStartBattleRemainingMs,
      cast?.battleRemainingMsAtCast,
      cast?.effectiveBattleTime
    );
    const effectEndBattleRemainingMs = readBattleRemainingMs(
      resultStatus.effectEndBattleRemainingMs,
      status.effectEndBattleRemainingMs,
      timeline.effectEndBattleRemainingMs,
      effectStartBattleRemainingMs === null
        ? null
        : Math.max(0, effectStartBattleRemainingMs - durationMs)
    );

    return {
      id: statusId,
      success,
      outcome: success ? 'success' : 'failed',
      failReason: safeString(result.failReason || resultStatus.failReason || status.failReason),
      offsetX: clampInt(resultStatus.offsetX ?? status.offsetX, -360, 360, 0),
      offsetY: clampInt(resultStatus.offsetY ?? status.offsetY, -360, 360, 0),
      durationMs,
      effectStartAtMs,
      effectEndAtMs,
      effectStartBattleRemainingMs,
      effectEndBattleRemainingMs,
      casterFeedbackText: safeString(
        resultStatus.casterFeedbackText
          || status.casterFeedbackText
          || (success ? '技能施放成功' : '技能施放失敗')
      ),
      targetVisualKey: safeString(resultStatus.targetVisualKey || status.targetVisualKey, 'prism_displacement_snap'),
      endVisualKey: safeString(resultStatus.endVisualKey || status.endVisualKey, 'prism_snap_back'),
      mode: safeString(resultStatus.mode || status.mode, 'snap')
    };
  }

  function clearPrismEffect(effect = null, reason = 'prism_displacement_end') {
    if (!effect || typeof effect !== 'object') return;
    activeEffects.delete(effect.key);
    log(`[StatusEffect] prism_displacement clear castId=${effect.castId} reason=${reason}`);
    if (typeof clearReticleOffset === 'function') {
      clearReticleOffset({
        reason,
        castId: effect.castId,
        statusEffectId: effect.statusEffectId,
        visualKey: effect.endVisualKey
      });
    }
    if (typeof onEffectEnd === 'function') {
      onEffectEnd({
        castId: effect.castId,
        skillId: effect.skillId,
        statusEffectId: effect.statusEffectId,
        reason,
        durationMs: effect.durationMs,
        endBattleRemainingMs: effect.endBattleRemainingMs
      });
    }
  }

  function syncBattleRemainingMs(battleRemainingMs) {
    if (!activeEffects.size) return;
    const currentRemainingMs = readBattleRemainingMs(battleRemainingMs);
    if (currentRemainingMs === null) return;
    activeEffects.forEach((effect) => {
      const endBattleRemainingMs = readBattleRemainingMs(effect.endBattleRemainingMs);
      if (endBattleRemainingMs === null) return;
      if (currentRemainingMs <= endBattleRemainingMs) {
        clearPrismEffect(effect, 'prism_displacement_battle_time_end');
      }
    });
  }

  function applyCastFeedback(cast = null) {
    if (!cast || typeof cast !== 'object') return false;
    const prism = normalizePrismDisplacementStatus(cast);
    if (!prism) return false;
    const localRole = safeString(cast?.localRole).toLowerCase();
    if (localRole !== 'caster') return false;
    if (typeof showCasterFeedback === 'function') {
      showCasterFeedback(prism.casterFeedbackText, {
        success: prism.success,
        failReason: prism.failReason,
        outcome: prism.outcome
      });
      return true;
    }
    return false;
  }

  function hasActiveEffectForCast(castId = '') {
    const normalizedCastId = safeString(castId);
    if (!normalizedCastId) return false;
    for (const effect of activeEffects.values()) {
      if (safeString(effect?.castId) === normalizedCastId) return true;
    }
    return false;
  }

  function applySkillCastStatusEffect(cast = null) {
    const prism = normalizePrismDisplacementStatus(cast);
    if (!prism) return false;

    const castId = safeString(cast?.castId);
    const activeKey = `${prism.id}:target`;
    const currentBattleRemainingMs = readBattleRemainingMs(
      cast?.battleRemainingMsAtCast,
      cast?.effectiveBattleTime
    );

    const localRole = safeString(cast?.localRole).toLowerCase();
    if (localRole !== 'target') return false;

    if (!prism.success) {
      log(`[StatusEffect] prism_displacement failed castId=${castId}`);
      activeEffects.delete(activeKey);
      if (typeof clearReticleOffset === 'function') {
        clearReticleOffset({ reason: 'prism_displacement_failed', castId, statusEffectId: prism.id });
      }
      return true;
    }

    const previousEffect = activeEffects.get(activeKey);
    if (previousEffect) {
      clearPrismEffect(previousEffect, 'prism_displacement_overwrite');
    }

    log(`[StatusEffect] prism_displacement snap castId=${castId} x=${prism.offsetX} y=${prism.offsetY}`);
    if (typeof applyReticleOffset === 'function') {
      applyReticleOffset({
        x: prism.offsetX,
        y: prism.offsetY,
        mode: prism.mode,
        castId,
        statusEffectId: prism.id,
        visualKey: prism.targetVisualKey
      });
    }

    const effectState = {
      key: activeKey,
      castId,
      statusEffectId: prism.id,
      endVisualKey: prism.endVisualKey,
      skillId: safeString(cast?.skillId),
      startBattleRemainingMs: prism.effectStartBattleRemainingMs,
      endBattleRemainingMs: prism.effectEndBattleRemainingMs,
      durationMs: prism.durationMs
    };
    activeEffects.set(activeKey, effectState);
    if (typeof onEffectStart === 'function') {
      onEffectStart({
        castId,
        skillId: safeString(cast?.skillId),
        statusEffectId: prism.id,
        durationMs: prism.durationMs,
        startBattleRemainingMs: prism.effectStartBattleRemainingMs,
        endBattleRemainingMs: prism.effectEndBattleRemainingMs
      });
    }
    if (currentBattleRemainingMs !== null) {
      syncBattleRemainingMs(currentBattleRemainingMs);
    }

    return true;
  }

  return {
    reset,
    applyCastFeedback,
    applySkillCastStatusEffect,
    syncBattleRemainingMs,
    hasActiveEffectForCast
  };
}
