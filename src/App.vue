<template>
  <main
    id="app-shell"
    :class="{ 'is-finishing': currentScreen === 'battle' && gameState === 'finishing' }"
  >
    <HomeScreen
      v-if="currentScreen === 'home'"
      @open-stage-select="openStageSelect"
      @open-study="openStudy"
      @open-settings="openSettings"
      @open-character-select="openCharacterSelect"
      @open-skill-loadout="openSkillLoadout"
    />

    <StageSelectScreen
      v-else-if="currentScreen === 'stageSelect'"
      :stages="stageList"
      :selected-stage-id="selectedStageId"
      :unlocked-stage-ids="unlockedStageIds"
      @back-home="goHomeFromStageSelect"
      @select-stage="selectStageAndStart"
    />

    <template v-else-if="currentScreen === 'battle'">
      <div id="game-world-wrapper">
        <button
          v-if="gameState !== 'gameResult' && !isTutorialGuideActive"
          type="button"
          class="battle-menu-trigger pixel-border"
          @click="openBattleMenu"
        >
          選單
        </button>

        <div id="fx-layer"></div>

        <CutsceneLayer
          :is-enemy-turn="isEnemyTurn"
          :skill-name="cutsceneSkillName"
        />

        <div id="cataract-mist-layer">
          <div class="mist-text">無法攻擊</div>
        </div>

        <GameTarget
          :game-state="gameState"
          :is-splitting="isSplitting"
          :target-transform="targetTransform"
          :announcement-text="announcementText"
        />

        <HudLayer
          :player-avatar-url="selectedCharacter.avatarUrl"
          :player-max-hp="playerMaxHp"
          :opponent-max-hp="opponentMaxHp"
          :player-hp="playerHp"
          :opponent-hp="opponentHp"
          :opponent-round-hits="opponentRoundHits"
          :combo="combo"
          :time-left="timeLeft"
          :skill-points="skillPoints"
          :skills="selectedSkills"
          :game-state="gameState"
          :player-debuff="playerDebuff"
          :hide-timer="isTutorialUntimed"
          @use-skill="useSkill"
        />

        <TutorialGuideOverlay
          v-if="isTutorialGuideActive"
          :step="tutorialState.step"
          :progress-count="tutorialHitProgress"
          :required-hits="tutorialState.requiredHits"
          :focus-rect="tutorialFocusRect"
          @next="advanceTutorialStep"
        />
      </div>

      <ResultLayer
        v-if="gameState === 'gameResult'"
        :player-hp="playerHp"
        :opponent-hp="opponentHp"
        @play-again="initGame"
        @open-stage-select="goStageSelectFromResult"
        @go-home="returnToHome"
      />

      <BattleMenu
        v-if="isBattleMenuOpen"
        :view="battleMenuView"
        :volume="audioVolume"
        :sfx-volume="sfxVolume"
        :sfx-enabled="sfxEnabled"
        :bgm-enabled="bgmEnabled"
        :vibration-enabled="vibrationEnabled"
        @go-home="returnToHome"
        @restart="restartBattleFromMenu"
        @open-settings="openMenuSettings"
        @close="closeBattleMenu"
        @back-main="backToMainMenuView"
        @volume-change="setAudioVolume"
        @sfx-volume-change="setSfxVolume"
        @sfx-toggle="setSfxEnabled"
        @bgm-toggle="setBgmEnabled"
        @vibration-toggle="setVibrationEnabled"
      />
    </template>

    <StudyTraining
      v-else-if="currentScreen === 'study'"
      :state="studyState"
      :unlocked-track-keys="unlockedTrackKeys"
      @back-home="goHomeFromStudy"
      @add-points="addStudyPoints"
      @record-answer="recordStudyAnswer"
      @upgrade-track="upgradeTrack"
    />

    <SettingsScreen
      v-else-if="currentScreen === 'settings'"
      :volume="audioVolume"
      :sfx-volume="sfxVolume"
      :sfx-enabled="sfxEnabled"
      :bgm-enabled="bgmEnabled"
      :vibration-enabled="vibrationEnabled"
      :account-name="accountState.name"
      @back-home="goHomeFromSettings"
      @volume-change="setAudioVolume"
      @sfx-volume-change="setSfxVolume"
      @sfx-toggle="setSfxEnabled"
      @bgm-toggle="setBgmEnabled"
      @vibration-toggle="setVibrationEnabled"
      @login-account="loginAccount"
      @logout-account="logoutAccount"
      @delete-account="deleteAccount"
    />

    <CharacterSelectScreen
      v-else-if="currentScreen === 'characterSelect'"
      :characters="characters"
      :selected-id="playerConfig.characterId"
      @back-home="goHomeFromCharacterSelect"
      @select-character="selectCharacter"
    />

    <SkillLoadoutScreen
      v-else-if="currentScreen === 'skillLoadout'"
      :skills="normalizedSkillPool"
      :selected-ids="playerConfig.equippedSkillIds"
      :max-slots="MAX_SKILL_SLOTS"
      @back-home="goHomeFromSkillLoadout"
      @toggle-skill="toggleSkillEquip"
    />

    <div v-if="isAccountDialogOpen" class="battle-menu-overlay" @click.self="closeAccountDialog">
      <div class="battle-menu-card pixel-border account-dialog-card">
        <h3 class="battle-menu-title">
          {{ accountDialogMode === 'login' ? '登入帳號' : '刪除帳號' }}
        </h3>

        <template v-if="accountDialogMode === 'login'">
          <label class="battle-setting-row">
            <span class="battle-setting-label">帳號名稱</span>
            <input
              v-model.trim="accountInputName"
              type="text"
              class="account-dialog-input"
              maxlength="20"
              placeholder="例如：SAMUREYE / Player"
              @keydown.enter.prevent="confirmAccountDialog"
            >
          </label>
          <p class="account-dialog-note">輸入 Player 可啟用進度鎖定測試。</p>
        </template>

        <template v-else>
          <p class="account-dialog-note">
            {{ hasActiveAccount ? `確定刪除帳號「${accountState.name}」嗎？` : '目前沒有已登入帳號可刪除。' }}
          </p>
        </template>

        <div class="account-dialog-actions">
          <button type="button" class="battle-menu-button battle-menu-button-subtle" @click="closeAccountDialog">
            取消
          </button>
          <button
            type="button"
            class="battle-menu-button"
            :disabled="isAccountDialogConfirmDisabled"
            @click="confirmAccountDialog"
          >
            {{ accountDialogMode === 'login' ? '登入' : '刪除' }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { GAME_CONFIG } from './data/gameConfig.js';
import { characters } from './data/characters.js';
import { skillPool } from './data/skillPool.js';
import { stageConfigs, STAGE_IDS } from './data/stageConfigs.js';
import { useBattleGame } from './composables/useBattleGame.js';
import { useSwipeControls } from './composables/useSwipeControls.js';
import CutsceneLayer from './components/CutsceneLayer.vue';
import GameTarget from './components/GameTarget.vue';
import HudLayer from './components/HudLayer.vue';
import BattleMenu from './components/BattleMenu.vue';
import HomeScreen from './components/HomeScreen.vue';
import ResultLayer from './components/ResultLayer.vue';
import SettingsScreen from './components/SettingsScreen.vue';
import StudyTraining from './components/StudyTraining.vue';
import CharacterSelectScreen from './components/CharacterSelectScreen.vue';
import SkillLoadoutScreen from './components/SkillLoadoutScreen.vue';
import StageSelectScreen from './components/StageSelectScreen.vue';
import TutorialGuideOverlay from './components/TutorialGuideOverlay.vue';

const currentScreen = ref('home');
const isBattleMenuOpen = ref(false);
const battleMenuView = ref('main');
const studyState = reactive({
  points: 0,
  answered: 0,
  correct: 0,
  tracks: {
    optometry: { level: 0, answered: 0, correct: 0 },
    optics: { level: 0, answered: 0, correct: 0 },
    contactLens: { level: 0, answered: 0, correct: 0 },
    other: { level: 0, answered: 0, correct: 0 }
  }
});
const STUDY_SAVE_KEY = 'samureye.study.v1';
const ACCOUNT_SAVE_KEY = 'samureye.account.v1';
const STUDY_PROFILE_SCHEMA_VERSION = 4;
const MAX_SKILL_SLOTS = 3;
const SKILL_DEFAULT_COST = 40;
const SKILL_DEFAULT_DAMAGE = 30;
const PLAYER_TEST_ACCOUNT_KEY = 'player';
const ADMIN_TEST_ACCOUNT_KEY = 'samureye';
const stageList = stageConfigs;
const accountState = reactive({
  name: ''
});
const isAccountDialogOpen = ref(false);
const accountDialogMode = ref('login');
const accountInputName = ref('');
const selectedStageId = ref(STAGE_IDS.STAGE_02);
const isPlayerTestAccount = computed(() => {
  return (accountState.name || '').trim().toLowerCase() === PLAYER_TEST_ACCOUNT_KEY;
});
const isAdminTestAccount = computed(() => {
  return (accountState.name || '').trim().toLowerCase() === ADMIN_TEST_ACCOUNT_KEY;
});
const hasActiveAccount = computed(() => (accountState.name || '').trim().length > 0);
const isAccountDialogConfirmDisabled = computed(() => {
  if (accountDialogMode.value === 'login') return (accountInputName.value || '').trim().length === 0;
  return !hasActiveAccount.value;
});
const selectablePlayerSkills = computed(() => skillPool.filter(skill => !skill.bossOnly));
const normalizedSkillPool = computed(() => {
  return selectablePlayerSkills.value.map(skill => ({
    ...skill,
    cost: Number.isFinite(Number(skill.cost)) ? Number(skill.cost) : SKILL_DEFAULT_COST,
    damage: Number.isFinite(Number(skill.damage)) ? Number(skill.damage) : SKILL_DEFAULT_DAMAGE
  }));
});

function buildFilledSkillIds(rawIds = []) {
  const availableIds = normalizedSkillPool.value.map(skill => skill.id);
  const availableSet = new Set(availableIds);
  const normalizedIds = Array.isArray(rawIds)
    ? rawIds.filter(id => availableSet.has(id))
    : [];
  const dedupedIds = [...new Set(normalizedIds)];
  const filled = [...dedupedIds];

  for (const id of availableIds) {
    if (filled.length >= MAX_SKILL_SLOTS) break;
    if (!filled.includes(id)) filled.push(id);
  }

  return filled.slice(0, MAX_SKILL_SLOTS);
}

const playerConfig = reactive({
  characterId: characters[0].id,
  equippedSkillIds: normalizedSkillPool.value.slice(0, MAX_SKILL_SLOTS).map(skill => skill.id)
});
const stageProgress = reactive({
  clearedStageIds: []
});
const tutorialState = reactive({
  active: false,
  step: 'focus',
  requiredHits: 3,
  hitBaseline: 0,
  hasGrantedMp: false,
  completed: false
});
const tutorialFocusRect = ref(null);
const game = useBattleGame({
  autoStart: false,
  getBattleProgression,
  getEnemySkillPool,
  shouldSkipRoundIntro: shouldSkipTutorialRoundIntro,
  getForcedTargetId: getTutorialForcedTargetId,
  shouldDisableRoundTimer: shouldUseUntimedTutorial
});

const {
  playerMaxHp,
  opponentMaxHp,
  playerHp,
  opponentHp,
  timeLeft,
  gameState,
  announcementText,
  combo,
  playerTotalHits,
  opponentRoundHits,
  skillPoints,
  playerDebuff,
  isPaused,
  audioVolume,
  sfxVolume,
  sfxEnabled,
  bgmEnabled,
  vibrationEnabled,
  isSplitting,
  isEnemyTurn,
  cutsceneSkillName,
  targetTransform,
  processSlash,
  useSkill,
  initGame,
  stopGame,
  setPaused,
  setAudioVolume,
  setSfxVolume,
  setSfxEnabled,
  setBgmEnabled,
  setVibrationEnabled
} = game;

const selectedCharacter = computed(() => {
  return characters.find(item => item.id === playerConfig.characterId) ?? characters[0];
});
const isTutorialStage = computed(() => currentStageConfig.value.id === STAGE_IDS.STAGE_01);
const isTutorialUntimed = computed(() => isTutorialStage.value);
const tutorialHitProgress = computed(() => {
  return Math.max(0, playerTotalHits.value - tutorialState.hitBaseline);
});
const isTutorialGuideActive = computed(() => {
  return currentScreen.value === 'battle' && isTutorialStage.value && tutorialState.active;
});
const clearedStageSet = computed(() => new Set(stageProgress.clearedStageIds));
const unlockedStageIds = computed(() => {
  if (isAdminTestAccount.value) return stageList.map(stage => stage.id);

  const unlocked = new Set(stageList.filter(stage => stage.unlockByDefault).map(stage => stage.id));
  const cleared = clearedStageSet.value;
  let changed = true;
  while (changed) {
    changed = false;
    for (const stage of stageList) {
      if (unlocked.has(stage.id)) continue;
      if (!stage.requiredClearStageId) continue;
      if (cleared.has(stage.requiredClearStageId)) {
        unlocked.add(stage.id);
        changed = true;
      }
    }
  }

  return stageList
    .filter(stage => unlocked.has(stage.id))
    .map(stage => stage.id);
});
const unlockedStageSet = computed(() => new Set(unlockedStageIds.value));
const unlockedTrackKeys = computed(() => {
  if (!isPlayerTestAccount.value) return ['optometry', 'optics', 'contactLens', 'other'];

  const cleared = clearedStageSet.value;
  const keys = ['optometry'];
  if (cleared.has(STAGE_IDS.STAGE_01)) keys.push('optics');
  if (cleared.has(STAGE_IDS.STAGE_02)) keys.push('contactLens');
  if (cleared.has(STAGE_IDS.STAGE_03)) keys.push('other');
  return keys;
});
const currentStageConfig = computed(() => {
  return stageList.find(stage => stage.id === selectedStageId.value) ?? stageList[0];
});

const selectedSkills = computed(() => {
  const skillMap = new Map(normalizedSkillPool.value.map(skill => [skill.id, skill]));
  const filledIds = buildFilledSkillIds(playerConfig.equippedSkillIds);
  return filledIds.map(id => skillMap.get(id)).filter(Boolean);
});

function getEnemySkillPool() {
  if (currentStageConfig.value.enemySkillPoolType === 'tutorial') {
    return normalizedSkillPool.value.slice(0, 2);
  }
  return normalizedSkillPool.value;
}

function getStandardBattleProgression() {
  const optometryLv = studyState.tracks.optometry.level;
  const opticsLv = studyState.tracks.optics.level;
  const contactLv = studyState.tracks.contactLens.level;
  const otherLv = studyState.tracks.other.level;

  return {
    maxHp: GAME_CONFIG.maxHp + (opticsLv * 20),
    targetHitDamage: GAME_CONFIG.targetHitDamage + optometryLv,
    skillPointGainPerHit: GAME_CONFIG.skillPointGainPerHit + contactLv,
    enemyAttackChancePerTick: GAME_CONFIG.enemyAttackChancePerTick - (otherLv * 0.005),
    enemyAttackDamage: GAME_CONFIG.enemyAttackDamage - (otherLv * 0.8),
    enemyUltChancePerTick: GAME_CONFIG.enemyUltChancePerTick - (otherLv * 0.0015)
  };
}

function getBattleProgression() {
  if (currentStageConfig.value.progressionType === 'tutorial') {
    return currentStageConfig.value.battleStats ?? getStandardBattleProgression();
  }

  return getStandardBattleProgression();
}

function shouldSkipTutorialRoundIntro() {
  return isTutorialStage.value;
}

function shouldUseUntimedTutorial() {
  return isTutorialUntimed.value;
}

function getTutorialForcedTargetId() {
  if (!isTutorialStage.value) return null;
  if (tutorialState.completed) return null;
  if (tutorialState.step === 'focus' || tutorialState.step === 'gesture') return 'right';
  if (tutorialState.step === 'practice') {
    const tutorialDirections = ['right', 'down', 'up-left'];
    const index = Math.max(0, Math.min(tutorialDirections.length - 1, tutorialHitProgress.value));
    return tutorialDirections[index];
  }
  return null;
}

function resetTutorialState() {
  tutorialState.active = false;
  tutorialState.step = 'focus';
  tutorialState.requiredHits = 3;
  tutorialState.hitBaseline = 0;
  tutorialState.hasGrantedMp = false;
  tutorialState.completed = false;
  tutorialFocusRect.value = null;
}

function beginTutorialGuide() {
  tutorialState.active = true;
  tutorialState.step = 'focus';
  tutorialState.requiredHits = 3;
  tutorialState.hitBaseline = playerTotalHits.value;
  tutorialState.hasGrantedMp = false;
  tutorialState.completed = false;
  setPaused(true);
  void updateTutorialFocusRectFromTarget();
}

function advanceTutorialStep() {
  if (!isTutorialGuideActive.value) return;

  if (tutorialState.step === 'focus') {
    tutorialState.step = 'gesture';
    return;
  }

  if (tutorialState.step === 'gesture') {
    tutorialState.step = 'practice';
    tutorialState.hitBaseline = playerTotalHits.value;
    setPaused(false);
    void updateTutorialFocusRectFromTarget();
    return;
  }

  if (tutorialState.step === 'hpEnemy') {
    tutorialFocusRect.value = null;
    tutorialState.step = 'hpPlayer';
    return;
  }

  if (tutorialState.step === 'hpPlayer') {
    tutorialFocusRect.value = null;
    tutorialState.step = 'skills';
    return;
  }

  if (tutorialState.step === 'skills') {
    tutorialFocusRect.value = null;
    tutorialState.step = 'mp';
    if (!tutorialState.hasGrantedMp) {
      skillPoints.value = 100;
      tutorialState.hasGrantedMp = true;
    }
    return;
  }

  if (tutorialState.step === 'mp') {
    tutorialState.active = false;
    tutorialState.completed = true;
    tutorialFocusRect.value = null;
    setPaused(false);
  }
}

async function updateTutorialFocusRectFromTarget() {
  if (!isTutorialGuideActive.value) {
    tutorialFocusRect.value = null;
    return;
  }

  if (!['focus', 'gesture', 'practice'].includes(tutorialState.step)) {
    tutorialFocusRect.value = null;
    return;
  }

  await nextTick();
  const targetEl = document.getElementById('target-anchor');
  if (!targetEl) {
    tutorialFocusRect.value = null;
    return;
  }

  const rect = targetEl.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const targetBasePx = 160;
  const measuredSide = Math.max(rect.width, rect.height, targetBasePx);
  const sidePx = measuredSide + 88;
  const leftPx = centerX - (sidePx / 2);
  const topPx = centerY - (sidePx / 2);

  tutorialFocusRect.value = {
    left: Math.max(2, Math.min(98, (leftPx / viewportWidth) * 100)),
    top: Math.max(2, Math.min(98, (topPx / viewportHeight) * 100)),
    width: Math.max(8, Math.min(96, (sidePx / viewportWidth) * 100)),
    height: Math.max(8, Math.min(96, (sidePx / viewportHeight) * 100))
  };
}

useSwipeControls({
  gameState,
  playerDebuff,
  isPaused,
  processSlash
});

function sanitizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTrack(rawTrack = {}) {
  return {
    level: Math.max(0, Math.floor(sanitizeNumber(rawTrack.level, 0))),
    answered: Math.max(0, Math.floor(sanitizeNumber(rawTrack.answered, 0))),
    correct: Math.max(0, Math.floor(sanitizeNumber(rawTrack.correct, 0)))
  };
}

function buildDefaultStudyData() {
  return {
    points: 0,
    answered: 0,
    correct: 0,
    tracks: {
      optometry: { level: 0, answered: 0, correct: 0 },
      optics: { level: 0, answered: 0, correct: 0 },
      contactLens: { level: 0, answered: 0, correct: 0 },
      other: { level: 0, answered: 0, correct: 0 }
    },
    playerConfig: {
      characterId: characters[0].id,
      equippedSkillIds: normalizedSkillPool.value.slice(0, MAX_SKILL_SLOTS).map(skill => skill.id)
    },
    stageProgress: {
      clearedStageIds: []
    }
  };
}

function normalizeStudyData(rawData = {}) {
  const data = rawData ?? {};
  const tracks = data.tracks ?? {};
  const rawPlayerConfig = data.playerConfig ?? {};
  const rawStageProgress = data.stageProgress ?? {};
  const dedupedSkillIds = buildFilledSkillIds(rawPlayerConfig.equippedSkillIds);
  const normalizedCharacter = characters.find(item => item.id === rawPlayerConfig.characterId)?.id ?? characters[0].id;
  const availableStageIds = new Set(stageList.map(stage => stage.id));
  const clearedStageIds = Array.isArray(rawStageProgress.clearedStageIds)
    ? [...new Set(rawStageProgress.clearedStageIds.filter(id => availableStageIds.has(id)))]
    : [];

  return {
    points: Math.max(0, Math.floor(sanitizeNumber(data.points, 0))),
    answered: Math.max(0, Math.floor(sanitizeNumber(data.answered, 0))),
    correct: Math.max(0, Math.floor(sanitizeNumber(data.correct, 0))),
    tracks: {
      optometry: normalizeTrack(tracks.optometry),
      optics: normalizeTrack(tracks.optics),
      contactLens: normalizeTrack(tracks.contactLens),
      other: normalizeTrack(tracks.other)
    },
    playerConfig: {
      characterId: normalizedCharacter,
      equippedSkillIds: dedupedSkillIds
    },
    stageProgress: {
      clearedStageIds
    }
  };
}

function applyStudyData(nextData) {
  const data = normalizeStudyData(nextData);
  studyState.points = data.points;
  studyState.answered = data.answered;
  studyState.correct = data.correct;
  studyState.tracks.optometry = data.tracks.optometry;
  studyState.tracks.optics = data.tracks.optics;
  studyState.tracks.contactLens = data.tracks.contactLens;
  studyState.tracks.other = data.tracks.other;
  playerConfig.characterId = data.playerConfig.characterId;
  playerConfig.equippedSkillIds = data.playerConfig.equippedSkillIds;
  stageProgress.clearedStageIds = data.stageProgress.clearedStageIds;
}

function snapshotStudyData() {
  return {
    points: studyState.points,
    answered: studyState.answered,
    correct: studyState.correct,
    tracks: {
      optometry: studyState.tracks.optometry,
      optics: studyState.tracks.optics,
      contactLens: studyState.tracks.contactLens,
      other: studyState.tracks.other
    },
    playerConfig: {
      characterId: playerConfig.characterId,
      equippedSkillIds: playerConfig.equippedSkillIds
    },
    stageProgress: {
      clearedStageIds: stageProgress.clearedStageIds
    }
  };
}

function getActiveProfileKey() {
  const name = (accountState.name || '').trim().toLowerCase();
  if (!name) return 'guest';
  return `acct:${name}`;
}

function loadAllStudyProfiles() {
  if (typeof window === 'undefined') return { version: STUDY_PROFILE_SCHEMA_VERSION, profiles: {} };

  try {
    const raw = window.localStorage.getItem(STUDY_SAVE_KEY);
    if (!raw) return { version: STUDY_PROFILE_SCHEMA_VERSION, profiles: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { version: STUDY_PROFILE_SCHEMA_VERSION, profiles: {} };

    if (parsed.version === STUDY_PROFILE_SCHEMA_VERSION && typeof parsed.profiles === 'object' && parsed.profiles) {
      return { version: STUDY_PROFILE_SCHEMA_VERSION, profiles: parsed.profiles };
    }

    if (parsed.version === 3 && typeof parsed.profiles === 'object' && parsed.profiles) {
      return {
        version: STUDY_PROFILE_SCHEMA_VERSION,
        profiles: parsed.profiles
      };
    }

    // v2 -> v3 migration: reset guest profile once to default state.
    if (parsed.version === 2 && typeof parsed.profiles === 'object' && parsed.profiles) {
      const migrated = {
        version: STUDY_PROFILE_SCHEMA_VERSION,
        profiles: { ...parsed.profiles }
      };
      delete migrated.profiles.guest;
      return migrated;
    }

    if (parsed.version === 1 && typeof parsed.data === 'object' && parsed.data) {
      return {
        version: STUDY_PROFILE_SCHEMA_VERSION,
        profiles: {
          // v1 guest data intentionally reset.
        }
      };
    }
  } catch (error) {
    console.warn('Failed to load study profiles:', error);
  }

  return { version: STUDY_PROFILE_SCHEMA_VERSION, profiles: {} };
}

function saveAllStudyProfiles(payload) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STUDY_SAVE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to save study profiles:', error);
  }
}

function loadStudyStateForActiveAccount() {
  const allProfiles = loadAllStudyProfiles();
  const profileKey = getActiveProfileKey();
  const profileData = allProfiles.profiles[profileKey] ?? buildDefaultStudyData();
  applyStudyData(profileData);
  allProfiles.profiles[profileKey] = normalizeStudyData(profileData);
  saveAllStudyProfiles(allProfiles);
}

function loadAccountState() {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(ACCOUNT_SAVE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || typeof parsed.data !== 'object') return;
    accountState.name = typeof parsed.data.name === 'string' ? parsed.data.name : '';
  } catch (error) {
    console.warn('Failed to load account state:', error);
  }
}

function saveStudyStateForActiveAccount() {
  const allProfiles = loadAllStudyProfiles();
  const profileKey = getActiveProfileKey();
  allProfiles.profiles[profileKey] = normalizeStudyData(snapshotStudyData());
  saveAllStudyProfiles(allProfiles);
}

function saveAccountState() {
  if (typeof window === 'undefined') return;
  const payload = {
    version: 1,
    data: {
      name: accountState.name
    }
  };
  try {
    window.localStorage.setItem(ACCOUNT_SAVE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to save account state:', error);
  }
}

onMounted(() => {
  loadAccountState();
  loadStudyStateForActiveAccount();
});

watch(
  studyState,
  () => {
    saveStudyStateForActiveAccount();
  },
  { deep: true }
);

watch(
  playerConfig,
  () => {
    saveStudyStateForActiveAccount();
  },
  { deep: true }
);

watch(
  stageProgress,
  () => {
    saveStudyStateForActiveAccount();
  },
  { deep: true }
);

watch(
  accountState,
  () => {
    saveAccountState();
    loadStudyStateForActiveAccount();
  },
  { deep: true }
);

watch(unlockedStageIds, (ids) => {
  if (ids.length === 0) return;
  if (!ids.includes(selectedStageId.value)) {
    selectedStageId.value = ids[0];
  }
});

watch(
  [currentScreen, gameState, isTutorialStage],
  ([screen, state, tutorial]) => {
    if (!tutorial || screen !== 'battle') return;
    if (tutorialState.active) return;
    if (tutorialState.completed) return;
    if (state !== 'playing') return;
    beginTutorialGuide();
  }
);

watch(
  [() => tutorialState.active, () => tutorialState.step],
  ([active, step]) => {
    if (!active) {
      tutorialFocusRect.value = null;
      return;
    }
    if (step === 'practice') return;
    setPaused(true);
    void updateTutorialFocusRectFromTarget();
  }
);

watch(tutorialHitProgress, (count) => {
  if (!isTutorialGuideActive.value) return;
  if (tutorialState.step !== 'practice') return;
  if (count < tutorialState.requiredHits) return;
  tutorialState.step = 'hpEnemy';
});

watch(targetTransform, () => {
  if (!isTutorialGuideActive.value) return;
  void updateTutorialFocusRectFromTarget();
});

watch(gameState, (next, prev) => {
  if (prev === 'gameResult' || next !== 'gameResult') return;
  if (playerHp.value <= opponentHp.value) return;
  if (!stageList.some(stage => stage.id === selectedStageId.value)) return;
  if (stageProgress.clearedStageIds.includes(selectedStageId.value)) return;
  stageProgress.clearedStageIds = [...stageProgress.clearedStageIds, selectedStageId.value];
});

function startBattle() {
  resetTutorialState();
  currentScreen.value = 'battle';
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  setPaused(false);
  initGame();
}

function openStageSelect() {
  currentScreen.value = 'stageSelect';
}

function goHomeFromStageSelect() {
  currentScreen.value = 'home';
}

function goStageSelectFromResult() {
  resetTutorialState();
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  setPaused(false);
  stopGame();
  currentScreen.value = 'stageSelect';
}

function selectStageAndStart(stageId) {
  if (!stageList.some(stage => stage.id === stageId)) return;
  if (!unlockedStageSet.value.has(stageId)) return;
  selectedStageId.value = stageId;
  startBattle();
}

function openBattleMenu() {
  isBattleMenuOpen.value = true;
  battleMenuView.value = 'main';
  setPaused(true);
}

function closeBattleMenu() {
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  setPaused(false);
}

function openMenuSettings() {
  battleMenuView.value = 'settings';
}

function backToMainMenuView() {
  battleMenuView.value = 'main';
}

function restartBattleFromMenu() {
  resetTutorialState();
  closeBattleMenu();
  initGame();
}

function returnToHome() {
  resetTutorialState();
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  setPaused(false);
  stopGame();
  currentScreen.value = 'home';
}

function openStudy() {
  currentScreen.value = 'study';
}

function openSettings() {
  currentScreen.value = 'settings';
}

function openCharacterSelect() {
  currentScreen.value = 'characterSelect';
}

function openSkillLoadout() {
  currentScreen.value = 'skillLoadout';
}

function goHomeFromStudy() {
  resetTutorialState();
  currentScreen.value = 'home';
}

function goHomeFromSettings() {
  resetTutorialState();
  currentScreen.value = 'home';
}

function goHomeFromCharacterSelect() {
  resetTutorialState();
  currentScreen.value = 'home';
}

function goHomeFromSkillLoadout() {
  resetTutorialState();
  currentScreen.value = 'home';
}

function selectCharacter(characterId) {
  if (!characters.some(item => item.id === characterId)) return;
  playerConfig.characterId = characterId;
}

function toggleSkillEquip(skillId) {
  if (!selectablePlayerSkills.value.some(skill => skill.id === skillId)) return;
  const hasSkill = playerConfig.equippedSkillIds.includes(skillId);

  if (hasSkill) {
    if (playerConfig.equippedSkillIds.length <= 1) return;
    playerConfig.equippedSkillIds = playerConfig.equippedSkillIds.filter(id => id !== skillId);
    return;
  }

  if (playerConfig.equippedSkillIds.length >= MAX_SKILL_SLOTS) return;
  playerConfig.equippedSkillIds = [...playerConfig.equippedSkillIds, skillId];
}

function loginAccount() {
  accountDialogMode.value = 'login';
  accountInputName.value = accountState.name || 'SAMUREYE';
  isAccountDialogOpen.value = true;
}

function logoutAccount() {
  accountState.name = '';
}

function deleteAccount() {
  accountDialogMode.value = 'delete';
  isAccountDialogOpen.value = true;
}

function closeAccountDialog() {
  isAccountDialogOpen.value = false;
  accountInputName.value = '';
}

function confirmAccountDialog() {
  if (accountDialogMode.value === 'login') {
    const name = (accountInputName.value || '').trim();
    if (!name) return;
    accountState.name = name;
    closeAccountDialog();
    return;
  }

  if (!hasActiveAccount.value) {
    closeAccountDialog();
    return;
  }

  const allProfiles = loadAllStudyProfiles();
  const profileKey = getActiveProfileKey();
  delete allProfiles.profiles[profileKey];
  saveAllStudyProfiles(allProfiles);
  accountState.name = '';
  closeAccountDialog();
}

function addStudyPoints(points) {
  studyState.points += points;
}

function recordStudyAnswer(payload) {
  const { trackKey, correct } = payload;
  const track = studyState.tracks[trackKey];

  studyState.answered += 1;
  if (correct) studyState.correct += 1;
  if (!track) return;

  track.answered += 1;
  if (correct) track.correct += 1;
}

function upgradeTrack(payload) {
  const { trackKey, cost } = payload;
  const track = studyState.tracks[trackKey];
  if (!track) return;
  if (studyState.points < cost) return;

  studyState.points -= cost;
  track.level += 1;
}
</script>
