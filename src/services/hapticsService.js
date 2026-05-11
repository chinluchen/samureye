import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const MIN_HAPTIC_GAP_LIGHT_MS = 65;
const MIN_HAPTIC_GAP_MEDIUM_MS = 60;
const MIN_HAPTIC_GAP_HEAVY_MS = 45;
let lastHapticAt = 0;
let hasWarnedNativeHapticsFailure = false;

function toPositiveNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

function parsePattern(pattern) {
  if (Array.isArray(pattern)) {
    const values = pattern.map(toPositiveNumber).filter(value => value > 0);
    const primaryBursts = values.filter((_, index) => index % 2 === 0);
    const strongest = Math.max(...primaryBursts, 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
      strongest,
      total,
      pulseCount: primaryBursts.length
    };
  }

  const strongest = toPositiveNumber(pattern);
  return {
    strongest,
    total: strongest,
    pulseCount: strongest > 0 ? 1 : 0
  };
}

function resolveImpactStyle(pattern) {
  const metrics = parsePattern(pattern);

  if (metrics.pulseCount >= 3 || metrics.total >= 120 || metrics.strongest >= 40) {
    return ImpactStyle.Heavy;
  }

  if (metrics.pulseCount >= 2 || metrics.total >= 65 || metrics.strongest >= 14) {
    return ImpactStyle.Medium;
  }

  return ImpactStyle.Light;
}

function resolveVibrationDuration(pattern) {
  const metrics = parsePattern(pattern);
  if (metrics.pulseCount >= 3 || metrics.total >= 120 || metrics.strongest >= 40) return 120;
  if (metrics.pulseCount >= 2 || metrics.total >= 65 || metrics.strongest >= 14) return 85;
  if (metrics.strongest >= 10) return 52;
  return 36;
}

function resolveMinGapMs(style) {
  if (style === ImpactStyle.Heavy) return MIN_HAPTIC_GAP_HEAVY_MS;
  if (style === ImpactStyle.Medium) return MIN_HAPTIC_GAP_MEDIUM_MS;
  return MIN_HAPTIC_GAP_LIGHT_MS;
}

function canTriggerHapticNow(style) {
  const now = Date.now();
  if (now - lastHapticAt < resolveMinGapMs(style)) return false;
  lastHapticAt = now;
  return true;
}

function shouldUseNativeIOSHaptics() {
  if (typeof Capacitor?.isNativePlatform !== 'function') return false;
  if (!Capacitor.isNativePlatform()) return false;
  return Capacitor.getPlatform() === 'ios';
}

function canUseBrowserVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function toBrowserPattern(pattern) {
  if (Array.isArray(pattern)) return pattern.map(toPositiveNumber).filter(value => value > 0);
  const value = toPositiveNumber(pattern);
  return value > 0 ? [value] : [20];
}

export function triggerHaptic(pattern) {
  const style = resolveImpactStyle(pattern);
  if (!canTriggerHapticNow(style)) return;

  if (shouldUseNativeIOSHaptics()) {
    const duration = resolveVibrationDuration(pattern);
    void Haptics.vibrate({ duration })
      .catch((error) => {
        if (!hasWarnedNativeHapticsFailure) {
          hasWarnedNativeHapticsFailure = true;
          console.warn('[Haptics] Native vibrate failed, fallback to impact.', error);
        }
        return Haptics.impact({ style });
      })
      .catch((error) => {
        if (!hasWarnedNativeHapticsFailure) {
          hasWarnedNativeHapticsFailure = true;
          console.warn('[Haptics] Native impact failed.', error);
        }
      });
    return;
  }

  if (canUseBrowserVibrate()) {
    navigator.vibrate(toBrowserPattern(pattern));
    return;
  }

  void Haptics.impact({ style }).catch(() => {});
}
