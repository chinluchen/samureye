import { FirebaseBridge } from './nativeFirebaseBridge.js';

function sanitizeText(value = '') {
  return String(value ?? '').trim();
}

function sanitizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map(item => sanitizeText(item))
    .filter(Boolean);
  return [...new Set(normalized)];
}

function sanitizeObject(value, fallback = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  return value;
}

function normalizeProgressData(raw = {}) {
  const data = sanitizeObject(raw, {});
  return {
    level: Math.max(0, Math.floor(sanitizeNumber(data.level, 0))),
    sp: Math.max(0, Math.floor(sanitizeNumber(data.sp, 0))),
    learnedSkills: sanitizeStringArray(data.learnedSkills),
    equippedSkills: sanitizeStringArray(data.equippedSkills),
    stats: sanitizeObject(data.stats, {}),
    stageProgress: sanitizeObject(data.stageProgress, {}),
    questionProgress: sanitizeObject(data.questionProgress, {}),
    schemaVersion: Math.max(1, Math.floor(sanitizeNumber(data.schemaVersion, 1))),
    updatedAt: sanitizeNumber(data.updatedAt, 0)
  };
}

export function isFirebaseBridgeAvailable() {
  return typeof FirebaseBridge?.authenticateAnonymous === 'function'
    && typeof FirebaseBridge?.upsertUser === 'function'
    && typeof FirebaseBridge?.getProgress === 'function'
    && typeof FirebaseBridge?.saveProgress === 'function';
}

export async function authenticateFirebaseAnonymous() {
  const payload = await FirebaseBridge.authenticateAnonymous();
  return {
    uid: sanitizeText(payload?.uid),
    isAnonymous: Boolean(payload?.isAnonymous),
    isAuthenticated: Boolean(payload?.isAuthenticated)
  };
}

export async function upsertFirebaseUser({
  uid = '',
  gameCenterPlayerId = '',
  displayName = '',
  alias = ''
} = {}) {
  const payload = await FirebaseBridge.upsertUser({
    uid: sanitizeText(uid),
    gameCenterPlayerId: sanitizeText(gameCenterPlayerId),
    displayName: sanitizeText(displayName),
    alias: sanitizeText(alias)
  });

  return {
    uid: sanitizeText(payload?.uid),
    written: Boolean(payload?.written)
  };
}

export async function getFirebasePlayerProgress(uid = '') {
  const payload = await FirebaseBridge.getProgress({
    uid: sanitizeText(uid)
  });
  const exists = Boolean(payload?.exists);
  if (!exists) {
    return {
      exists: false,
      data: null
    };
  }
  return {
    exists: true,
    data: normalizeProgressData(payload?.data ?? {})
  };
}

export async function saveFirebasePlayerProgress(uid = '', progress = {}) {
  const normalized = normalizeProgressData(progress);
  const payload = await FirebaseBridge.saveProgress({
    uid: sanitizeText(uid),
    progress: normalized
  });

  return {
    uid: sanitizeText(payload?.uid),
    saved: Boolean(payload?.saved)
  };
}
