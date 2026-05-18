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

function sanitizeDateKey(value = '', fallback = '') {
  const text = sanitizeText(value);
  if (!text) return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
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

function normalizePlayerKnowledgeData(raw = {}, fallbackDateKey = '') {
  const data = sanitizeObject(raw, {});
  return {
    knowledgePoints: Math.max(0, Math.floor(sanitizeNumber(data.knowledgePoints, data.sp ?? 0))),
    dailyKnowledgePointsEarned: Math.max(0, Math.floor(sanitizeNumber(data.dailyKnowledgePointsEarned, 0))),
    dailyKnowledgePointsDate: sanitizeDateKey(data.dailyKnowledgePointsDate, fallbackDateKey),
    updatedAt: sanitizeNumber(data.updatedAt, 0)
  };
}

function normalizePlayerKnowledgeMeta(raw = {}) {
  const data = sanitizeObject(raw, {});
  return {
    hasKnowledgePoints: Boolean(data.hasKnowledgePoints),
    hasDailyKnowledgePointsEarned: Boolean(data.hasDailyKnowledgePointsEarned),
    hasDailyKnowledgePointsDate: Boolean(data.hasDailyKnowledgePointsDate),
    fallbackProgressSp: Math.max(0, Math.floor(sanitizeNumber(data.fallbackProgressSp, 0))),
    rawKeys: sanitizeText(data.rawKeys)
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

export async function getFirebasePlayerKnowledge(uid = '', dateKey = '') {
  if (typeof FirebaseBridge?.getPlayerKnowledge !== 'function') {
    throw new Error('FirebaseBridge.getPlayerKnowledge is unavailable');
  }

  const normalizedDateKey = sanitizeDateKey(dateKey, '');
  const payload = await FirebaseBridge.getPlayerKnowledge({
    uid: sanitizeText(uid),
    dateKey: normalizedDateKey
  });

  const data = normalizePlayerKnowledgeData(payload?.data ?? {}, normalizedDateKey);
  const meta = normalizePlayerKnowledgeMeta(payload?.meta ?? {});
  return {
    uid: sanitizeText(payload?.uid || uid),
    data,
    meta
  };
}

export async function claimFirebaseKnowledgePointReward(
  uid = '',
  {
    calculatedReward = 0,
    dailyKnowledgePointLimit = 10,
    dateKey = '',
    mode = '',
    correctCount = 0,
    totalQuestions = 0,
    baselineDailyKnowledgePointsEarned = 0,
    baselineDailyKnowledgePointsDate = ''
  } = {}
) {
  if (typeof FirebaseBridge?.settleDojoReward !== 'function') {
    throw new Error('FirebaseBridge.settleDojoReward is unavailable');
  }

  const normalizedCalculatedReward = Math.max(0, Math.floor(sanitizeNumber(calculatedReward, 0)));
  const normalizedDailyLimit = Math.max(1, Math.floor(sanitizeNumber(dailyKnowledgePointLimit, 10)));
  const normalizedDateKey = sanitizeDateKey(dateKey, '');
  const normalizedMode = sanitizeText(mode);
  const normalizedCorrectCount = Math.max(0, Math.floor(sanitizeNumber(correctCount, 0)));
  const normalizedTotalQuestions = Math.max(0, Math.floor(sanitizeNumber(totalQuestions, 0)));
  const normalizedBaselineDailyKnowledgePointsEarned = Math.max(
    0,
    Math.floor(sanitizeNumber(baselineDailyKnowledgePointsEarned, 0))
  );
  const normalizedBaselineDailyKnowledgePointsDate = sanitizeDateKey(baselineDailyKnowledgePointsDate, '');

  const payload = await FirebaseBridge.settleDojoReward({
    uid: sanitizeText(uid),
    calculatedReward: normalizedCalculatedReward,
    dailyKnowledgePointLimit: normalizedDailyLimit,
    dateKey: normalizedDateKey,
    mode: normalizedMode,
    correctCount: normalizedCorrectCount,
    totalQuestions: normalizedTotalQuestions,
    baselineDailyKnowledgePointsEarned: normalizedBaselineDailyKnowledgePointsEarned,
    baselineDailyKnowledgePointsDate: normalizedBaselineDailyKnowledgePointsDate
  });

  const data = normalizePlayerKnowledgeData(payload?.data ?? {}, normalizedDateKey);
  const actualReward = Math.max(0, Math.floor(sanitizeNumber(payload?.actualReward, 0)));
  const remaining = Math.max(0, Math.floor(sanitizeNumber(payload?.remaining, 0)));
  return {
    uid: sanitizeText(payload?.uid || uid),
    calculatedReward: normalizedCalculatedReward,
    actualReward,
    remaining,
    dailyKnowledgePointLimit: normalizedDailyLimit,
    data
  };
}

export async function settleFirebaseDojoReward(
  uid = '',
  payload = {}
) {
  return claimFirebaseKnowledgePointReward(uid, payload);
}
