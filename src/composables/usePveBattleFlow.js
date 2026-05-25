import { computed } from 'vue';
import { GAME_CONFIG } from '../data/gameConfig.js';

const ENEMY_SKILL_NO_FALLBACK_FLAG = '__disableFallback';

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(value, min = 0, fallback = 0) {
  return Math.max(min, Math.round(toNumber(value, fallback)));
}

function clampPercent(value, min = 0, max = 1, fallback = 0) {
  const n = toNumber(value, fallback);
  return Math.max(min, Math.min(max, n));
}

function readMaybeRef(value) {
  if (typeof value === 'function') return value();
  if (value && typeof value === 'object' && 'value' in value) return value.value;
  return value;
}

function normalizeMode(value, fallback = 'pve') {
  const mode = String(value ?? '').trim().toLowerCase();
  return mode === 'pvp' ? 'pvp' : fallback;
}

function resolveModeStrategyKey(mode = 'pve') {
  return normalizeMode(mode) === 'pvp' ? 'pvpStrategy' : 'pveStrategy';
}

function supportsModeStrategy(skill = null, mode = 'pve') {
  if (!skill || typeof skill !== 'object') return false;
  const targetKey = resolveModeStrategyKey(mode);
  const targetStrategy = String(skill[targetKey] ?? '').trim();
  if (targetStrategy) return true;

  const hasAnyModeStrategy = String(skill.pveStrategy ?? '').trim() || String(skill.pvpStrategy ?? '').trim();
  return !hasAnyModeStrategy;
}

export function filterSkillPoolByMode(rawSkills = [], mode = 'pve') {
  if (!Array.isArray(rawSkills)) return [];
  return rawSkills.filter((skill) => supportsModeStrategy(skill, mode));
}

function normalizeEnemySkillIdsSetting(rawValue) {
  if (rawValue === null) return null;
  if (!Array.isArray(rawValue)) return [];
  const ids = rawValue
    .map(id => String(id ?? '').trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

function buildNoEnemySkillsFallback(noEnemySkills = null) {
  if (Array.isArray(noEnemySkills)) return noEnemySkills;
  return Object.freeze(Object.assign([], { [ENEMY_SKILL_NO_FALLBACK_FLAG]: true }));
}

function getStatusEffectEngine(statusEffectEngineRef = null) {
  if (typeof statusEffectEngineRef === 'function') return statusEffectEngineRef();
  return statusEffectEngineRef;
}

export function usePveBattleFlow({
  currentScreen,
  battleSessionMode,
  selectedStageId,
  stageList = [],
  currentStageConfig = null,
  unlockedStageSet,
  normalizedSkillPool,
  noEnemySkills = null,
  resetPvpTerminalState = null,
  statusEffectEngineRef = null,
  resetSkillCastSyncState = null,
  resetTutorialState = null,
  setBattleMenuState = null,
  setPaused = null,
  initGame = null,
  onBeforeStartBattle = null,
  getStandardBattleProgression = null,
  getPvpBattleProgression = null
} = {}) {
  const fallbackNoEnemySkills = buildNoEnemySkillsFallback(noEnemySkills);

  function readSkillPool() {
    const pool = readMaybeRef(normalizedSkillPool);
    return Array.isArray(pool) ? pool : [];
  }

  const resolvedCurrentStageConfig = currentStageConfig && typeof currentStageConfig === 'object' && 'value' in currentStageConfig
    ? currentStageConfig
    : computed(() => {
      const found = stageList.find(stage => stage.id === selectedStageId.value);
      return found ?? stageList[0];
    });

  function getDefaultEnemySkillPool() {
    const pvePool = filterSkillPoolByMode(readSkillPool(), 'pve');
    if (resolvedCurrentStageConfig.value?.enemySkillPoolType === 'tutorial') {
      return pvePool.slice(0, 2);
    }
    return pvePool;
  }

  function getEnemySkillPool() {
    const enemySkillIds = normalizeEnemySkillIdsSetting(resolvedCurrentStageConfig.value?.enemySkillIds);
    if (enemySkillIds === null) {
      return fallbackNoEnemySkills;
    }

    const defaultPool = getDefaultEnemySkillPool();
    if (enemySkillIds.length <= 0) {
      return defaultPool;
    }

    const idSet = new Set(enemySkillIds);
    const stagePool = defaultPool.filter(skill => idSet.has(skill.id));
    return Object.assign(stagePool, { [ENEMY_SKILL_NO_FALLBACK_FLAG]: true });
  }

  function getCurrentStageEnemySettings() {
    const stage = resolvedCurrentStageConfig.value ?? {};
    return {
      enemyHp: clampInt(stage.enemyHp, 1, GAME_CONFIG.maxHp),
      enemyDamage: clampInt(stage.enemyDamage, 1, GAME_CONFIG.enemyAttackDamage),
      enemyAttackIntervalMs: clampInt(stage.enemyAttackIntervalMs, 300, 600),
      enemyAttackIntervalVarianceMs: clampInt(stage.enemyAttackIntervalVarianceMs, 0, 0),
      enemyMissRate: clampPercent(stage.enemyMissRate, 0, 0.95, 0),
      enemyCriticalRate: clampPercent(stage.enemyCriticalRate, 0, 1, 0),
      enemyCriticalMultiplier: Math.max(1, toNumber(stage.enemyCriticalMultiplier, 1)),
      enemySkillCastIntervalMs: clampInt(stage.enemySkillCastIntervalMs, 1000, 3000),
      enemySkillCastVarianceMs: clampInt(stage.enemySkillCastVarianceMs, 0, 0),
      enemySkillCastChance: clampPercent(stage.enemySkillCastChance, 0, 1, 0),
      enemySkillStartDelayMs: clampInt(stage.enemySkillStartDelayMs, 0, 1200)
    };
  }

  function getBattleProgression() {
    if (battleSessionMode.value === 'pvp') {
      if (typeof getPvpBattleProgression === 'function') {
        return getPvpBattleProgression();
      }
      return {};
    }

    const standard = typeof getStandardBattleProgression === 'function'
      ? getStandardBattleProgression()
      : {};

    return {
      ...standard,
      ...getCurrentStageEnemySettings()
    };
  }

  function startPveBattle() {
    if (typeof resetPvpTerminalState === 'function') {
      resetPvpTerminalState('start_pve_battle');
    }

    const statusEffectEngine = getStatusEffectEngine(statusEffectEngineRef);
    statusEffectEngine?.reset?.('start_pve_battle');

    if (typeof resetSkillCastSyncState === 'function') {
      resetSkillCastSyncState();
    }

    if (typeof onBeforeStartBattle === 'function') {
      onBeforeStartBattle();
    }

    battleSessionMode.value = 'pve';

    if (typeof resetTutorialState === 'function') {
      resetTutorialState();
    }

    currentScreen.value = 'battle';

    if (typeof setBattleMenuState === 'function') {
      setBattleMenuState(false, 'main');
    }

    if (typeof setPaused === 'function') {
      setPaused(false);
    }

    if (typeof initGame === 'function') {
      initGame();
    }
  }

  function openStageSelect() {
    battleSessionMode.value = 'pve';
    currentScreen.value = 'stageSelect';
  }

  function goHomeFromStageSelect() {
    currentScreen.value = 'battleMode';
  }

  function selectStageAndStart(stageId) {
    if (!stageList.some(stage => stage.id === stageId)) return;
    if (unlockedStageSet && !unlockedStageSet.value?.has(stageId)) return;
    selectedStageId.value = stageId;
    startPveBattle();
  }

  return {
    currentStageConfig: resolvedCurrentStageConfig,
    getEnemySkillPool,
    getCurrentStageEnemySettings,
    getBattleProgression,
    openStageSelect,
    goHomeFromStageSelect,
    selectStageAndStart,
    startPveBattle
  };
}
