import { GAME_CONFIG } from './gameConfig.js';

export const STAGE_IDS = {
  STAGE_01: 'stage-01',
  STAGE_02: 'stage-02',
  STAGE_03: 'stage-03',
  STAGE_04: 'stage-04',
  STAGE_05: 'stage-05'
};

export const stageConfigs = [
  {
    id: STAGE_IDS.STAGE_01,
    order: 1,
    type: 'tutorial',
    hasBoss: false,
    unlockByDefault: true,
    label: '第 1 關',
    mode: '教學模式',
    progressionType: 'tutorial',
    enemySkillPoolType: 'tutorial',
    battleStats: {
      maxHp: GAME_CONFIG.maxHp,
      targetHitDamage: GAME_CONFIG.targetHitDamage + 6,
      skillPointGainPerHit: GAME_CONFIG.skillPointGainPerHit + 3,
      enemyAttackChancePerTick: 0,
      enemyAttackDamage: Math.max(6, GAME_CONFIG.enemyAttackDamage * 0.55),
      enemyUltChancePerTick: 0
    }
  },
  {
    id: STAGE_IDS.STAGE_02,
    order: 2,
    type: 'normal',
    hasBoss: false,
    requiredClearStageId: STAGE_IDS.STAGE_01,
    label: '第 2 關',
    mode: '標準對戰',
    progressionType: 'standard',
    enemySkillPoolType: 'standard'
  },
  {
    id: STAGE_IDS.STAGE_03,
    order: 3,
    type: 'normal',
    hasBoss: false,
    requiredClearStageId: STAGE_IDS.STAGE_02,
    label: '第 3 關',
    mode: '標準對戰',
    progressionType: 'standard',
    enemySkillPoolType: 'standard'
  },
  {
    id: STAGE_IDS.STAGE_04,
    order: 4,
    type: 'normal',
    hasBoss: false,
    requiredClearStageId: STAGE_IDS.STAGE_03,
    label: '第 4 關',
    mode: '標準對戰',
    progressionType: 'standard',
    enemySkillPoolType: 'standard'
  },
  {
    id: STAGE_IDS.STAGE_05,
    order: 5,
    type: 'boss',
    hasBoss: true,
    requiredClearStageId: STAGE_IDS.STAGE_04,
    label: '第 5 關',
    mode: 'Boss 對戰',
    progressionType: 'standard',
    enemySkillPoolType: 'standard'
  }
];
