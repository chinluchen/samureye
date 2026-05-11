<template>
  <main
    id="app-shell"
    :class="{ 'is-finishing': currentScreen === 'battle' && gameState === 'finishing' }"
  >
    <HomeScreen
      v-if="currentScreen === 'home'"
      :is-skill-loadout-unlocked="isSkillLoadoutUnlocked"
      @open-stage-select="openStageSelect"
      @open-study="openStudy"
      @open-settings="openSettings"
      @open-character-select="openCharacterSelect"
      @open-skill-loadout="openSkillLoadout"
      @open-matchmaking="openMatchmaking"
      @open-leaderboard="openLeaderboard"
    />

    <StageSelectScreen
      v-else-if="currentScreen === 'stageSelect'"
      :stages="stageList"
      :selected-stage-id="selectedStageId"
      :unlocked-stage-ids="unlockedStageIds"
      @back-home="goHomeFromStageSelect"
      @select-stage="selectStageAndStart"
    />

    <MatchmakingScreen
      v-else-if="currentScreen === 'matchmaking'"
      :status="matchmakingStatus"
      :capabilities="matchCapabilities"
      @back-home="goHomeFromMatchmaking"
      @sign-in="syncMatchmakingAccount"
      @start-match="startPvPMatchmaking"
      @cancel-match="cancelPvPMatchmaking"
      @ready-battle="markLocalPlayerReady"
    />

    <template v-else-if="currentScreen === 'battle'">
      <div id="game-world-wrapper">
        <button
          v-if="gameState !== 'gameResult'"
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

        <SkillAnimationLayer
          :animation="activeSkillAnimation"
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
          :skill-cooldowns="playerSkillCooldowns"
          :skill-cooldown-pending="playerSkillCooldownPending"
          :skills="selectedSkills"
          :game-state="gameState"
          :player-debuff="playerDebuff"
          :hide-timer="isTutorialUntimed"
          @use-skill="handlePlayerSkillUse"
        />

        <TutorialGuideOverlay
          v-if="isTutorialGuideActive && !isBattleMenuOpen"
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
        :outcome="currentBattleOutcome"
        :is-pvp="isCurrentBattlePvP"
        @play-again="initGame"
        @open-stage-select="goStageSelectFromResult"
        @open-matchmaking="goMatchmakingFromResult"
        @go-home="returnToHome"
      />

      <BattleMenu
        v-if="isBattleMenuOpen"
        :view="battleMenuView"
        :is-pvp="isCurrentBattlePvP"
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
      @add-knowledge-points="addStudyKnowledgePoints"
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

    <LeaderboardScreen
      v-else-if="currentScreen === 'leaderboard'"
      @back-home="goHomeFromLeaderboard"
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
      :is-unlocked="isSkillLoadoutUnlocked"
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { App as CapacitorApp } from '@capacitor/app';
import { GAME_CONFIG } from './data/gameConfig.js';
import { SCREEN_BGM_SCENE } from './data/audioCatalog.js';
import { characters } from './data/characters.js';
import { skillPool } from './data/skillPool.js';
import { stageConfigs, STAGE_IDS } from './data/stageConfigs.js';
import { useBattleGame } from './composables/useBattleGame.js';
import { useSwipeControls } from './composables/useSwipeControls.js';
import { sfx } from './services/SoundEngine.js';
import { createMatchService } from './services/match/MatchService.js';
import { appStorage } from './services/storage/preferencesStorage.js';
import CutsceneLayer from './components/CutsceneLayer.vue';
import GameTarget from './components/GameTarget.vue';
import HudLayer from './components/HudLayer.vue';
import BattleMenu from './components/BattleMenu.vue';
import HomeScreen from './components/HomeScreen.vue';
import MatchmakingScreen from './components/MatchmakingScreen.vue';
import ResultLayer from './components/ResultLayer.vue';
import SettingsScreen from './components/SettingsScreen.vue';
import StudyTraining from './components/StudyTraining.vue';
import CharacterSelectScreen from './components/CharacterSelectScreen.vue';
import SkillLoadoutScreen from './components/SkillLoadoutScreen.vue';
import StageSelectScreen from './components/StageSelectScreen.vue';
import LeaderboardScreen from './components/LeaderboardScreen.vue';
import TutorialGuideOverlay from './components/TutorialGuideOverlay.vue';
import SkillAnimationLayer from './components/SkillAnimationLayer.vue';

const currentScreen = ref('home');
const isBattleMenuOpen = ref(false);
const battleMenuView = ref('main');
const battleSessionMode = ref('pve');
const matchService = createMatchService();
const matchCapabilities = reactive({
  provider: matchService.providerName,
  platform: matchService.platform,
  requiresNativeBridge: false,
  supportsGameCenter: false,
  canUseCustomDisplayName: true
});
const matchmakingStatus = reactive({
  provider: matchService.providerName,
  phase: 'idle',
  message: '配對系統初始化中...',
  queueSeconds: 0,
  localProfile: {
    id: '',
    gameCenterId: '',
    displayName: 'SAMUREYE',
    avatarEmoji: '🗡️'
  },
  opponentProfile: null,
  errorMessage: '',
  localReady: false,
  opponentReady: false,
  startPending: false
});
let unsubscribeMatchStatus = null;
let unsubscribeRealtimeEvents = null;
let detachAudioUnlock = null;
let detachAppAudioLifecycle = null;
let appIsInBackground = false;
let shouldAutoResumeBattleAfterForeground = false;
let localPvpEventSeq = 0;
const remotePvpEventSeqByPlayer = new Map();
let pendingPvpStartTimer = null;
let lastPvpBattleSeed = '';
let activeSkillCast = null;
const queuedSkillCasts = [];
const queuedSkillCastIds = new Set();
const appliedSkillCastDamageIds = new Set();
let skillCastResolveTimer = null;
let skillCastResumeTimer = null;
let awaitingLocalSkillCastAck = false;
let localSkillCastAckTimer = null;
let battleEndBroadcasted = false;
const activeSkillAnimation = ref(null);
const studyState = reactive({
  knowledgePoints: 0,
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
const SETTINGS_SAVE_KEY = 'samureye.settings.v1';
const LEGACY_STORAGE_KEYS = [STUDY_SAVE_KEY, ACCOUNT_SAVE_KEY, SETTINGS_SAVE_KEY];
const STUDY_PROFILE_SCHEMA_VERSION = 4;
const SETTINGS_SCHEMA_VERSION = 1;
const MAX_SKILL_SLOTS = 3;
const SKILL_DEFAULT_COST = 40;
const SKILL_DEFAULT_DAMAGE = 30;
const PLAYER_TEST_ACCOUNT_KEY = 'player';
const ADMIN_TEST_ACCOUNT_KEY = 'samureye';
const stageList = stageConfigs;
let hasMigratedStorage = false;
let hasHydratedRuntimeSettings = false;
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
const selectablePlayerSkills = computed(() => {
  return skillPool.filter(skill => !skill.bossOnly && skill.equipable !== false);
});
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
  shouldDisableRoundTimer: shouldUseUntimedTutorial,
  isPvpBattle: () => battleSessionMode.value === 'pvp',
  onLocalAttack: handleLocalPvpAttack
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
  playerSkillCooldowns,
  playerSkillCooldownPending,
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
  useSkill: useSkillCore,
  initGame,
  stopGame,
  setPaused,
  setAudioVolume: setAudioVolumeState,
  setSfxVolume: setSfxVolumeState,
  setSfxEnabled: setSfxEnabledState,
  setBgmEnabled: setBgmEnabledState,
  setVibrationEnabled: setVibrationEnabledState,
  applyOpponentDamage,
  applyRemoteDamage,
  forceOpponentDefeat
} = game;

const selectedCharacter = computed(() => {
  return characters.find(item => item.id === playerConfig.characterId) ?? characters[0];
});
const isTutorialStage = computed(() => currentStageConfig.value.id === STAGE_IDS.STAGE_01);
const isCurrentBattlePvP = computed(() => battleSessionMode.value === 'pvp');
const currentBattleOutcome = computed(() => {
  if (playerHp.value > opponentHp.value) return 'win';
  if (playerHp.value < opponentHp.value) return 'lose';
  return isCurrentBattlePvP.value ? 'draw' : 'lose';
});
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
const isSkillLoadoutUnlocked = computed(() => {
  return clearedStageSet.value.has(STAGE_IDS.STAGE_01);
});
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
    tutorialState.step = 'hpPlayer';
    return;
  }

  if (tutorialState.step === 'hpPlayer') {
    tutorialState.step = 'skills';
    return;
  }

  if (tutorialState.step === 'skills') {
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

  await nextTick();
  const step = tutorialState.step;
  const anchorIdByStep = {
    focus: 'target-anchor',
    gesture: 'target-anchor',
    practice: 'target-anchor',
    hpEnemy: 'enemy-hp-anchor',
    hpPlayer: 'player-hp-anchor',
    skills: 'skill-bar-anchor',
    mp: 'player-mp-anchor'
  };
  const anchorId = anchorIdByStep[step];
  if (!anchorId) {
    tutorialFocusRect.value = null;
    return;
  }
  const anchorEl = document.getElementById(anchorId);
  if (!anchorEl) {
    tutorialFocusRect.value = null;
    return;
  }

  const rect = anchorEl.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let leftPx = rect.left;
  let topPx = rect.top;
  let widthPx = rect.width;
  let heightPx = rect.height;

  if (['focus', 'gesture', 'practice'].includes(step)) {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const targetBasePx = 160;
    const measuredSide = Math.max(rect.width, rect.height, targetBasePx);
    const sidePx = measuredSide + 88;
    leftPx = centerX - (sidePx / 2);
    topPx = centerY - (sidePx / 2);
    widthPx = sidePx;
    heightPx = sidePx;
  } else if (step === 'hpEnemy') {
    leftPx = rect.left - 10;
    topPx = rect.top - 8;
    widthPx = rect.width + 20;
    heightPx = rect.height + 16;
  } else if (step === 'hpPlayer') {
    leftPx = rect.left - 10;
    topPx = rect.top - 8;
    widthPx = rect.width + 20;
    heightPx = rect.height + 16;
  } else if (step === 'skills') {
    leftPx = rect.left - 8;
    topPx = rect.top - 8;
    widthPx = rect.width + 16;
    heightPx = rect.height + 16;
  } else if (step === 'mp') {
    leftPx = rect.left - 8;
    topPx = rect.top - 6;
    widthPx = rect.width + 16;
    heightPx = rect.height + 12;
  }

  tutorialFocusRect.value = {
    left: Math.max(1, Math.min(99, (leftPx / viewportWidth) * 100)),
    top: Math.max(1, Math.min(99, (topPx / viewportHeight) * 100)),
    width: Math.max(6, Math.min(98, (widthPx / viewportWidth) * 100)),
    height: Math.max(6, Math.min(98, (heightPx / viewportHeight) * 100))
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

function sanitizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
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
    knowledgePoints: 0,
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
    knowledgePoints: Math.max(0, Math.floor(sanitizeNumber(data.knowledgePoints, data.points ?? 0))),
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
  studyState.knowledgePoints = data.knowledgePoints;
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
    knowledgePoints: studyState.knowledgePoints,
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

function normalizeRuntimeSettings(rawData = {}) {
  const data = rawData ?? {};
  return {
    audioVolume: Math.max(0, Math.min(1, sanitizeNumber(data.audioVolume, audioVolume.value))),
    sfxVolume: Math.max(0, Math.min(1, sanitizeNumber(data.sfxVolume, sfxVolume.value))),
    sfxEnabled: sanitizeBoolean(data.sfxEnabled, sfxEnabled.value),
    bgmEnabled: sanitizeBoolean(data.bgmEnabled, bgmEnabled.value),
    vibrationEnabled: sanitizeBoolean(data.vibrationEnabled, vibrationEnabled.value)
  };
}

function snapshotRuntimeSettings() {
  return {
    audioVolume: audioVolume.value,
    sfxVolume: sfxVolume.value,
    sfxEnabled: sfxEnabled.value,
    bgmEnabled: bgmEnabled.value,
    vibrationEnabled: vibrationEnabled.value
  };
}

function persistRuntimeSettingsIfReady() {
  if (!hasHydratedRuntimeSettings) return;
  void saveRuntimeSettings();
}

function setAudioVolume(volume) {
  setAudioVolumeState(volume);
  persistRuntimeSettingsIfReady();
}

function setSfxVolume(volume) {
  setSfxVolumeState(volume);
  persistRuntimeSettingsIfReady();
}

function setSfxEnabled(enabled) {
  setSfxEnabledState(enabled);
  persistRuntimeSettingsIfReady();
}

function setBgmEnabled(enabled) {
  setBgmEnabledState(enabled);
  persistRuntimeSettingsIfReady();
}

function setVibrationEnabled(enabled) {
  setVibrationEnabledState(enabled);
  persistRuntimeSettingsIfReady();
}

async function loadRuntimeSettings() {
  await ensureStorageReady();

  try {
    const raw = await appStorage.getItem(SETTINGS_SAVE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;

    // Backward compatibility:
    // - v1: { version: 1, data: {...} }
    // - legacy: {...} (direct payload)
    const rawSettingsData = (parsed.version === SETTINGS_SCHEMA_VERSION && typeof parsed.data === 'object' && parsed.data)
      ? parsed.data
      : parsed;

    const normalized = normalizeRuntimeSettings(rawSettingsData);
    setAudioVolume(normalized.audioVolume);
    setSfxVolume(normalized.sfxVolume);
    setSfxEnabled(normalized.sfxEnabled);
    setBgmEnabled(normalized.bgmEnabled);
    setVibrationEnabled(normalized.vibrationEnabled);
  } catch (error) {
    console.warn('Failed to load runtime settings:', error);
  }
}

async function saveRuntimeSettings() {
  const payload = {
    version: SETTINGS_SCHEMA_VERSION,
    data: snapshotRuntimeSettings()
  };
  try {
    await appStorage.setItem(SETTINGS_SAVE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to save runtime settings:', error);
  }
}

function getActiveProfileKey() {
  const name = (accountState.name || '').trim().toLowerCase();
  if (!name) return 'guest';
  return `acct:${name}`;
}

async function ensureStorageReady() {
  if (hasMigratedStorage) return;
  hasMigratedStorage = true;

  try {
    await appStorage.migrateKeysFromLocalStorage(LEGACY_STORAGE_KEYS);
  } catch (error) {
    console.warn('Failed to migrate legacy localStorage data:', error);
  }
}

async function loadAllStudyProfiles() {
  await ensureStorageReady();

  try {
    const raw = await appStorage.getItem(STUDY_SAVE_KEY);
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

async function saveAllStudyProfiles(payload) {
  try {
    await appStorage.setItem(STUDY_SAVE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to save study profiles:', error);
  }
}

async function loadStudyStateForActiveAccount() {
  const allProfiles = await loadAllStudyProfiles();
  const profileKey = getActiveProfileKey();
  const profileData = allProfiles.profiles[profileKey] ?? buildDefaultStudyData();
  applyStudyData(profileData);
  allProfiles.profiles[profileKey] = normalizeStudyData(profileData);
  await saveAllStudyProfiles(allProfiles);
}

async function loadAccountState() {
  await ensureStorageReady();

  try {
    const raw = await appStorage.getItem(ACCOUNT_SAVE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || typeof parsed.data !== 'object') return;
    accountState.name = typeof parsed.data.name === 'string' ? parsed.data.name : '';
  } catch (error) {
    console.warn('Failed to load account state:', error);
  }
}

async function saveStudyStateForActiveAccount() {
  const allProfiles = await loadAllStudyProfiles();
  const profileKey = getActiveProfileKey();
  allProfiles.profiles[profileKey] = normalizeStudyData(snapshotStudyData());
  await saveAllStudyProfiles(allProfiles);
}

async function saveAccountState() {
  const payload = {
    version: 1,
    data: {
      name: accountState.name
    }
  };
  try {
    await appStorage.setItem(ACCOUNT_SAVE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to save account state:', error);
  }
}

function getPreferredDisplayName() {
  const name = (accountState.name || '').trim();
  if (!name) return 'SAMUREYE';
  return name;
}

function applyMatchStatus(nextStatus = {}) {
  const prevPhase = matchmakingStatus.phase;
  matchmakingStatus.provider = nextStatus.provider ?? matchmakingStatus.provider;
  matchmakingStatus.phase = nextStatus.phase ?? 'idle';
  matchmakingStatus.message = nextStatus.message ?? '';
  matchmakingStatus.queueSeconds = Number.isFinite(Number(nextStatus.queueSeconds))
    ? Number(nextStatus.queueSeconds)
    : 0;
  matchmakingStatus.localProfile = {
    ...matchmakingStatus.localProfile,
    ...(nextStatus.localProfile ?? {})
  };
  matchmakingStatus.opponentProfile = nextStatus.opponentProfile ?? null;
  matchmakingStatus.errorMessage = nextStatus.errorMessage ?? '';

  const nextPhase = matchmakingStatus.phase;
  if (nextPhase === 'matched' && prevPhase !== 'matched') {
    resetPvpRealtimeState();
  }
  if (nextPhase !== 'matched') {
    resetPvpReadyState();
  } else {
    refreshPvpReadyMessage();
  }
}

function clearPendingPvpStartTimer() {
  if (!pendingPvpStartTimer) return;
  clearTimeout(pendingPvpStartTimer);
  pendingPvpStartTimer = null;
}

function resolveMatchPlayerId(profile = null) {
  if (!profile || typeof profile !== 'object') return '';
  const gamePlayerId = String(profile.id ?? '').trim();
  if (gamePlayerId) return gamePlayerId;
  return String(profile.gameCenterId ?? '').trim();
}

function isCurrentPlayerMatchHost() {
  const localId = resolveMatchPlayerId(matchmakingStatus.localProfile);
  const opponentId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  if (!localId || !opponentId) return true;
  return localId.localeCompare(opponentId) < 0;
}

function generatePvpBattleSeed() {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function clearSkillCastSyncTimers() {
  if (skillCastResolveTimer) {
    clearTimeout(skillCastResolveTimer);
    skillCastResolveTimer = null;
  }
  if (skillCastResumeTimer) {
    clearTimeout(skillCastResumeTimer);
    skillCastResumeTimer = null;
  }
}

function resetSkillCastSyncState() {
  clearSkillCastSyncTimers();
  if (localSkillCastAckTimer) {
    clearTimeout(localSkillCastAckTimer);
    localSkillCastAckTimer = null;
  }
  queuedSkillCasts.length = 0;
  queuedSkillCastIds.clear();
  appliedSkillCastDamageIds.clear();
  activeSkillCast = null;
  awaitingLocalSkillCastAck = false;
  activeSkillAnimation.value = null;
}

function resolveSkillDefinitionById(skillId = '') {
  const id = String(skillId).trim();
  const raw = skillPool.find(item => item.id === id) ?? null;
  if (!raw) {
    return {
      id,
      name: '對手技能',
      animationKey: id || 'unknown_skill',
      pauseDurationMs: 3700,
      hitCount: 1,
      baseDamage: 0,
      visualEffects: [],
      audioEffects: [],
      timing: { resolveRatio: 0.62 },
      modeOverrides: {}
    };
  }

  const pauseDurationMs = Number.isFinite(Number(raw.pauseDurationMs))
    ? Math.max(800, Math.min(6000, Math.round(Number(raw.pauseDurationMs))))
    : (id === 'astig' ? 4300 : id === 'dilation' ? 3900 : id === 'macular' ? 4000 : id === 'glaucoma' ? 3800 : id === 'cataract' ? 3300 : 3700);

  return {
    ...raw,
    animationKey: String(raw.animationKey ?? raw.id ?? id).trim() || 'unknown_skill',
    pauseDurationMs,
    hitCount: Number.isFinite(Number(raw.hitCount)) ? Math.max(1, Math.round(Number(raw.hitCount))) : 1,
    baseDamage: Math.max(0, Number(raw.damage ?? 0)),
    visualEffects: Array.isArray(raw.visualEffects) ? raw.visualEffects : [],
    audioEffects: Array.isArray(raw.audioEffects) ? raw.audioEffects : [],
    timing: raw.timing && typeof raw.timing === 'object' ? raw.timing : { resolveRatio: 0.62 },
    modeOverrides: raw.modeOverrides && typeof raw.modeOverrides === 'object' ? raw.modeOverrides : {}
  };
}

function resolvePvpSkillDamage(skillDefinition = null) {
  const skill = skillDefinition && typeof skillDefinition === 'object' ? skillDefinition : resolveSkillDefinitionById('');
  const overrideDamage = Number(skill?.modeOverrides?.pvp?.damage);
  if (Number.isFinite(overrideDamage) && overrideDamage >= 0) {
    return Math.max(0, Math.round(overrideDamage));
  }
  const skillId = String(skill?.id ?? '').trim();
  if (skillId === 'cataract') return 0;
  if (skillId === 'dilation') return 140;
  if (skillId === 'astig') return 75;
  if (skillId === 'macular') return 130;
  if (skillId === 'glaucoma') return 95;
  return Math.max(0, Math.round(Number(skill?.baseDamage ?? skill?.damage ?? 0)));
}

function resolveSkillNameById(skillId = '') {
  const skill = resolveSkillDefinitionById(skillId);
  const name = String(skill?.name ?? '').trim();
  return name || '對手技能';
}

function markPlayerSkillCooldownPending(skillId = '', pending = false) {
  const id = String(skillId).trim();
  if (!id) return;
  if (pending) {
    playerSkillCooldownPending.value = {
      ...playerSkillCooldownPending.value,
      [id]: true
    };
    return;
  }
  const next = { ...playerSkillCooldownPending.value };
  delete next[id];
  playerSkillCooldownPending.value = next;
}

function applyPlayerSkillCooldown(skillDefinition = null) {
  const id = String(skillDefinition?.id ?? '').trim();
  if (!id) return;
  const cooldownSec = Math.max(0, Number(skillDefinition?.cooldownSec ?? 0));
  if (cooldownSec <= 0) return;
  playerSkillCooldowns.value = {
    ...playerSkillCooldowns.value,
    [id]: cooldownSec
  };
}

function canUseSkillInPvp(skillDefinition = null) {
  if (!skillDefinition || typeof skillDefinition !== 'object') return false;
  if (isPaused.value || gameState.value !== 'playing') return false;
  if (playerDebuff.value === 'cataract') return false;
  if (awaitingLocalSkillCastAck) return false;
  const cost = Math.max(0, Number(skillDefinition.cost ?? 0));
  if (skillPoints.value < cost) return false;
  const skillId = String(skillDefinition.id ?? '').trim();
  if (!skillId) return false;
  const pending = Boolean(playerSkillCooldownPending.value?.[skillId]);
  const cooldownLeft = Math.max(0, Number(playerSkillCooldowns.value?.[skillId] ?? 0));
  return !pending && cooldownLeft <= 0.01;
}

function buildHostAuthoritativeSkillCastPayload({
  skillId = '',
  casterPlayerId = '',
  targetPlayerId = '',
  castId = ''
} = {}) {
  const resolvedSkill = resolveSkillDefinitionById(skillId);
  const safeCastId = String(castId).trim() || `cast-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const nowMs = Date.now();
  const pauseDurationMs = Math.max(800, Math.min(6000, Number(resolvedSkill.pauseDurationMs ?? 3700)));
  const resolveRatio = Number(resolvedSkill?.timing?.resolveRatio ?? 0.62);
  const normalizedResolveRatio = Number.isFinite(resolveRatio)
    ? Math.max(0.15, Math.min(0.9, resolveRatio))
    : 0.62;
  const battleRemainingMsAtCast = Math.max(0, Math.round(Number(timeLeft.value ?? 0) * 1000));
  const resultDamage = resolvePvpSkillDamage(resolvedSkill);

  return {
    castId: safeCastId,
    casterPlayerId: String(casterPlayerId).trim(),
    targetPlayerId: String(targetPlayerId).trim(),
    skillId: resolvedSkill.id,
    animationKey: String(resolvedSkill.animationKey ?? resolvedSkill.id).trim() || resolvedSkill.id,
    pauseDurationMs,
    hitCount: Math.max(1, Number(resolvedSkill.hitCount ?? 1)),
    visualEffects: resolvedSkill.visualEffects,
    audioEffects: resolvedSkill.audioEffects,
    battleRemainingMsAtCast,
    effectiveBattleTime: battleRemainingMsAtCast,
    resolveAtMs: nowMs + Math.round(pauseDurationMs * normalizedResolveRatio),
    hostPlayerId: resolveMatchPlayerId(matchmakingStatus.localProfile),
    timing: {
      resolveRatio: normalizedResolveRatio
    },
    result: {
      damage: resultDamage,
      outcome: resultDamage > 0 ? 'damage' : 'effect_only'
    }
  };
}

function normalizeSkillCastPayload(payload = {}, sourcePlayerId = '') {
  if (!payload || typeof payload !== 'object') return null;
  const castId = String(payload.castId ?? '').trim();
  if (!castId) return null;
  const localPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
  const fallbackOpponentId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  const casterPlayerId = String(payload.casterPlayerId ?? '').trim() || String(sourcePlayerId ?? '').trim();
  const targetPlayerId = String(payload.targetPlayerId ?? '').trim()
    || (casterPlayerId && localPlayerId && casterPlayerId === localPlayerId ? fallbackOpponentId : localPlayerId);
  const skillId = String(payload.skillId ?? '').trim();
  const skillDefinition = resolveSkillDefinitionById(skillId);
  const animationKey = String(payload.animationKey ?? skillDefinition.animationKey ?? skillId).trim() || skillId;
  const pauseDurationRaw = Number(payload.pauseDurationMs);
  const pauseDurationMs = Number.isFinite(pauseDurationRaw)
    ? Math.max(800, Math.min(6000, Math.round(pauseDurationRaw)))
    : Math.max(800, Math.min(6000, Math.round(Number(skillDefinition.pauseDurationMs ?? 3700))));
  const battleRemainingMsAtCast = Number.isFinite(Number(payload.battleRemainingMsAtCast))
    ? Math.max(0, Math.round(Number(payload.battleRemainingMsAtCast)))
    : (Number.isFinite(Number(payload.effectiveBattleTime))
      ? Math.max(0, Math.round(Number(payload.effectiveBattleTime)))
      : null);
  const resolveAtMs = Number.isFinite(Number(payload.resolveAtMs))
    ? Math.round(Number(payload.resolveAtMs))
    : null;
  const resultDamage = Math.max(0, Math.round(Number(payload?.result?.damage ?? payload?.damage ?? 0)));
  const localRole = casterPlayerId === localPlayerId
    ? 'caster'
    : (targetPlayerId === localPlayerId ? 'target' : 'observer');

  return {
    castId,
    casterPlayerId,
    targetPlayerId,
    localRole,
    skillId,
    animationKey,
    pauseDurationMs,
    battleRemainingMsAtCast,
    effectiveBattleTime: battleRemainingMsAtCast,
    resolveAtMs,
    resultDamage,
    skillName: resolveSkillNameById(skillId),
    skillDefinition
  };
}

function syncBattleTimeFromSkillCast(cast = null) {
  if (!cast || typeof cast !== 'object') return;
  if (currentScreen.value !== 'battle') return;
  if (!isCurrentBattlePvP.value) return;
  const remainingMs = Number(cast.battleRemainingMsAtCast);
  if (!Number.isFinite(remainingMs) || remainingMs < 0) return;
  timeLeft.value = remainingMs / 1000;
}

function applySkillCastAuthoritativeDamage(cast = null, reason = 'resolve') {
  if (!cast || typeof cast !== 'object') return;
  if (appliedSkillCastDamageIds.has(cast.castId)) return;
  appliedSkillCastDamageIds.add(cast.castId);
  const damage = Math.max(0, Number(cast.resultDamage ?? 0));
  console.info(`[PvP Sync] skill_cast 套用權威傷害 castId=${cast.castId} role=${cast.localRole} reason=${reason} damage=${damage}`);
  if (damage <= 0) return;
  if (cast.localRole === 'caster') {
    applyOpponentDamage(damage);
    return;
  }
  if (cast.localRole === 'target') {
    applyRemoteDamage(damage);
  }
}

function playSkillAnimation(cast = null) {
  if (!cast || typeof cast !== 'object') return;
  console.info(`[PvP Sync] 準備播放技能動畫 castId=${cast.castId} skillId=${cast.skillId} animationKey=${cast.animationKey} role=${cast.localRole}`);
  const effects = Array.isArray(cast?.skillDefinition?.visualEffects) ? cast.skillDefinition.visualEffects : [];
  const animationPayload = {
    castId: cast.castId,
    skillId: cast.skillId,
    animationKey: cast.animationKey,
    role: cast.localRole,
    durationMs: cast.pauseDurationMs,
    startedAtMs: Date.now(),
    title: cast.skillName,
    visualEffects: effects.slice(0, 6)
  };
  activeSkillAnimation.value = animationPayload;
  console.info(`[PvP Sync] activeSkillAnimation已設定 castId=${animationPayload.castId} animationKey=${animationPayload.animationKey} role=${animationPayload.role}`);
}

function clearSkillAnimation(reason = 'unknown') {
  if (!activeSkillAnimation.value) return;
  activeSkillAnimation.value = null;
  console.info(`[PvP Sync] 技能動畫已清除 reason=${reason}`);
}

function tryStartQueuedSkillCast(reason = 'queue_check') {
  if (activeSkillCast) return;
  if (queuedSkillCasts.length <= 0) return;
  if (currentScreen.value !== 'battle') return;
  if (!isCurrentBattlePvP.value) return;
  if (gameState.value === 'gameResult' || gameState.value === 'finishing') return;
  if (isPaused.value) return;

  const nextCast = queuedSkillCasts.shift() ?? null;
  if (!nextCast) return;
  activeSkillCast = nextCast;
  queuedSkillCastIds.delete(nextCast.castId);

  syncBattleTimeFromSkillCast(nextCast);
  console.info(`[PvP Sync] handleSkillCast啟動 castId=${nextCast.castId} role=${nextCast.localRole} skillId=${nextCast.skillId} pauseDurationMs=${nextCast.pauseDurationMs} battleRemainingMsAtCast=${nextCast.battleRemainingMsAtCast} reason=${reason}`);

  if (nextCast.localRole === 'caster') {
    const cost = Math.max(0, Number(nextCast.skillDefinition?.cost ?? 0));
    skillPoints.value = Math.max(0, skillPoints.value - cost);
    markPlayerSkillCooldownPending(nextCast.skillId, true);
    if (localSkillCastAckTimer) {
      clearTimeout(localSkillCastAckTimer);
      localSkillCastAckTimer = null;
    }
    awaitingLocalSkillCastAck = false;
  }

  setPaused(true);
  isEnemyTurn.value = nextCast.localRole !== 'caster';
  cutsceneSkillName.value = nextCast.skillName;
  gameState.value = 'skillCutscene';
  playSkillAnimation(nextCast);

  clearSkillCastSyncTimers();
  const nowMs = Date.now();
  const pauseDurationMs = Math.max(800, Number(nextCast.pauseDurationMs ?? 0));
  const resolveDelay = Number.isFinite(Number(nextCast.resolveAtMs))
    ? Math.max(0, Math.min(pauseDurationMs, Number(nextCast.resolveAtMs) - nowMs))
    : Math.max(120, Math.min(pauseDurationMs - 80, Math.round(pauseDurationMs * 0.62)));
  const resumeDelay = Math.max(resolveDelay + 50, pauseDurationMs);

  skillCastResolveTimer = setTimeout(() => {
    skillCastResolveTimer = null;
    applySkillCastAuthoritativeDamage(nextCast, 'resolve_at_ms');
  }, resolveDelay);

  skillCastResumeTimer = setTimeout(() => {
    skillCastResumeTimer = null;
    applySkillCastAuthoritativeDamage(nextCast, 'resume_fallback');
    if (nextCast.localRole === 'caster') {
      markPlayerSkillCooldownPending(nextCast.skillId, false);
      applyPlayerSkillCooldown(nextCast.skillDefinition);
    }
    if (gameState.value !== 'gameResult' && gameState.value !== 'finishing') {
      gameState.value = 'playing';
    }
    setPaused(false);
    clearSkillAnimation('skill_cast_resume');
    console.info(`[PvP Sync] skill_cast 結束 castId=${nextCast.castId}，恢復倒數`);
    activeSkillCast = null;
    tryStartQueuedSkillCast('next_cast');
  }, resumeDelay);
}

function queueSkillCast(cast = null, reason = 'incoming') {
  if (!cast || typeof cast !== 'object') return;
  if (cast.localRole === 'observer') return;
  if (appliedSkillCastDamageIds.has(cast.castId)) return;
  if (queuedSkillCastIds.has(cast.castId)) return;
  if (activeSkillCast?.castId === cast.castId) return;
  queuedSkillCastIds.add(cast.castId);
  queuedSkillCasts.push(cast);
  console.info(`[PvP Sync] 收到skill_cast castId=${cast.castId} role=${cast.localRole} skillId=${cast.skillId} animationKey=${cast.animationKey} queueReason=${reason}`);
  tryStartQueuedSkillCast('incoming_cast');
}

function dispatchHostSkillCast(castPayload = null, reason = 'host_dispatch') {
  if (!castPayload || typeof castPayload !== 'object') return;
  console.info(`[PvP Sync] host廣播skill_cast castId=${castPayload.castId} caster=${castPayload.casterPlayerId} skillId=${castPayload.skillId} reason=${reason}`);
  void sendPvpRealtimeEvent('skill_cast', castPayload);
  const localSourceId = resolveMatchPlayerId(matchmakingStatus.localProfile);
  const normalizedLocalCast = normalizeSkillCastPayload(castPayload, localSourceId);
  queueSkillCast(normalizedLocalCast, 'host_local');
}

function handleSkillCast(payload = {}, sourcePlayerId = '') {
  const cast = normalizeSkillCastPayload(payload, sourcePlayerId);
  if (!cast) return;
  queueSkillCast(cast, 'remote_packet');
}

function handleSkillCastRequest(payload = {}, sourcePlayerId = '') {
  if (!isCurrentPlayerMatchHost()) return;
  if (!isCurrentBattlePvP.value || currentScreen.value !== 'battle') return;
  if (gameState.value === 'gameResult' || gameState.value === 'finishing') return;
  const requesterId = String(sourcePlayerId ?? '').trim();
  if (!requesterId) return;
  const localPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
  const opponentPlayerId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  const requestedSkillId = String(payload?.skillId ?? '').trim();
  if (!requestedSkillId) return;
  const targetPlayerId = requesterId === localPlayerId ? opponentPlayerId : localPlayerId;
  const requestCastId = String(payload?.requestCastId ?? '').trim();
  const authoritativeCast = buildHostAuthoritativeSkillCastPayload({
    skillId: requestedSkillId,
    casterPlayerId: requesterId,
    targetPlayerId,
    castId: requestCastId
  });
  dispatchHostSkillCast(authoritativeCast, 'host_handle_request');
}

function resetPvpReadyState() {
  clearPendingPvpStartTimer();
  resetSkillCastSyncState();
  matchmakingStatus.localReady = false;
  matchmakingStatus.opponentReady = false;
  matchmakingStatus.startPending = false;
  battleEndBroadcasted = false;
  lastPvpBattleSeed = '';
}

function refreshPvpReadyMessage() {
  if (matchmakingStatus.phase !== 'matched') return;
  if (matchmakingStatus.startPending) {
    matchmakingStatus.message = '雙方已準備，正在同步進入對戰...';
    return;
  }
  if (matchmakingStatus.localReady && matchmakingStatus.opponentReady) {
    matchmakingStatus.message = '雙方已準備，等待主機發送開戰。';
    return;
  }
  if (matchmakingStatus.localReady) {
    matchmakingStatus.message = '你已準備，等待對手準備...';
    return;
  }
  if (matchmakingStatus.opponentReady) {
    matchmakingStatus.message = '對手已準備，請按「準備對戰」。';
    return;
  }
  matchmakingStatus.message = '配對成功，請準備對戰。';
}

function schedulePvpBattleStart(startAtMs = Date.now()) {
  if (currentScreen.value === 'battle' && battleSessionMode.value === 'pvp') return;
  clearPendingPvpStartTimer();
  matchmakingStatus.startPending = true;
  refreshPvpReadyMessage();
  const safeStartAt = Number.isFinite(Number(startAtMs)) ? Number(startAtMs) : Date.now();
  const delay = Math.max(0, Math.min(5000, safeStartAt - Date.now()));
  if (delay === 0) {
    startPvpBattle();
    return;
  }
  pendingPvpStartTimer = setTimeout(() => {
    pendingPvpStartTimer = null;
    startPvpBattle();
  }, delay);
}

function checkBothReady(reason = '') {
  console.info(`[PvP Sync] checkBothReady被呼叫 reason=${reason} selfReady=${String(matchmakingStatus.localReady)} opponentReady=${String(matchmakingStatus.opponentReady)} phase=${matchmakingStatus.phase}`);
  if (matchmakingStatus.phase !== 'matched') return;
  if (!matchmakingStatus.localReady || !matchmakingStatus.opponentReady) return;
  if (matchmakingStatus.startPending) return;

  const isHost = isCurrentPlayerMatchHost();
  console.info(`[PvP Sync] isHost狀態: ${isHost ? 'host' : 'guest'}`);
  if (!isHost) return;

  const seed = generatePvpBattleSeed();
  lastPvpBattleSeed = seed;
  const startAt = Date.now();
  matchmakingStatus.startPending = true;
  refreshPvpReadyMessage();
  console.info(`[PvP Sync] host送出start_battle seed=${seed}`);
  void sendPvpRealtimeEvent('start_battle', {
    mode: 'pvp',
    seed,
    startAt
  });
  schedulePvpBattleStart(startAt);
}

function markLocalPlayerReady() {
  if (matchmakingStatus.phase !== 'matched') return;
  if (matchmakingStatus.localReady) return;
  matchmakingStatus.localReady = true;
  refreshPvpReadyMessage();
  console.info('[PvP Sync] 本機送出ready（單次）');
  void sendPvpRealtimeEvent('ready', { ready: true });
  checkBothReady('local_ready');
}

function nextLocalPvpEventSeq() {
  localPvpEventSeq += 1;
  return localPvpEventSeq;
}

function resetPvpRealtimeState() {
  localPvpEventSeq = 0;
  remotePvpEventSeqByPlayer.clear();
  resetPvpReadyState();
}

function shouldAcceptPvpPacket(packet = {}) {
  const sourcePlayerId = String(packet._sourcePlayerId ?? '').trim();
  const sequence = Number(packet.seq);
  if (!sourcePlayerId || !Number.isFinite(sequence) || sequence <= 0) return true;
  const lastSequence = Number(remotePvpEventSeqByPlayer.get(sourcePlayerId) ?? 0);
  if (sequence <= lastSequence) return false;
  remotePvpEventSeqByPlayer.set(sourcePlayerId, sequence);
  return true;
}

function parseJsonObjectSafely(text) {
  if (typeof text !== 'string') return null;
  const sanitized = text.replace(/\u0000/g, '').trim();
  if (!sanitized) return null;

  const candidates = [sanitized];
  const firstBrace = sanitized.indexOf('{');
  const lastBrace = sanitized.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = sanitized.slice(firstBrace, lastBrace + 1);
    if (sliced !== sanitized) candidates.push(sliced);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // Keep trying with the next candidate.
    }
  }

  return null;
}

function decodeBase64ToText(base64Text) {
  if (typeof base64Text !== 'string' || !base64Text) return '';
  try {
    if (typeof atob === 'function') return atob(base64Text);
  } catch {
    // Fall back to Buffer below.
  }
  if (typeof Buffer !== 'undefined') {
    try {
      return Buffer.from(base64Text, 'base64').toString('utf8');
    } catch {
      return '';
    }
  }
  return '';
}

function normalizeIncomingPvpPacket(packet = {}) {
  if (!packet || typeof packet !== 'object') return {};

  const sourcePlayerId = String(packet._sourcePlayerId ?? '').trim();
  const sourceDisplayName = String(packet._sourceDisplayName ?? '').trim();
  let normalized = packet;

  for (let depth = 0; depth < 4; depth += 1) {
    if (!normalized || typeof normalized !== 'object') break;

    if (normalized.type === 'raw_json_text' && typeof normalized.json === 'string') {
      const parsed = parseJsonObjectSafely(normalized.json);
      if (parsed) {
        normalized = parsed;
        continue;
      }
    }

    if (normalized.type === 'raw' && typeof normalized.dataBase64 === 'string') {
      const decoded = decodeBase64ToText(normalized.dataBase64);
      const parsed = parseJsonObjectSafely(decoded);
      if (parsed) {
        normalized = parsed;
        continue;
      }
    }

    break;
  }

  if (!normalized || typeof normalized !== 'object') {
    return {};
  }

  return {
    ...normalized,
    _sourcePlayerId: sourcePlayerId,
    _sourceDisplayName: sourceDisplayName
  };
}

async function sendPvpRealtimeEvent(type, payload = {}) {
  const eventType = String(type || '').trim();
  if (!eventType) return;
  const packet = {
    version: 1,
    type: eventType,
    seq: nextLocalPvpEventSeq(),
    ts: Date.now(),
    payload
  };
  try {
    await matchService.sendRealtimeEvent(packet);
  } catch (error) {
    console.warn('Failed to send PvP realtime event:', error);
    if (matchmakingStatus.phase === 'matched') {
      const code = String(error?.code ?? '');
      if (code !== 'match_not_ready' && code !== 'match_unavailable') {
        matchmakingStatus.errorMessage = String(error?.message ?? 'PvP 同步傳輸失敗。');
      }
    }
  }
}

function maybeBroadcastHostBattleEnd(reason = 'state_watch') {
  if (!isCurrentBattlePvP.value) return;
  if (currentScreen.value !== 'battle') return;
  if (gameState.value !== 'gameResult') return;
  if (!isCurrentPlayerMatchHost()) return;
  if (battleEndBroadcasted) return;

  const hostPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
  const guestPlayerId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  const battleEndId = `battle-end-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  battleEndBroadcasted = true;
  console.info(`[PvP Sync] host送出battle_end battleEndId=${battleEndId} reason=${reason}`);
  void sendPvpRealtimeEvent('battle_end', {
    battleEndId,
    hostPlayerId,
    guestPlayerId,
    hostHp: Math.max(0, Math.round(Number(playerHp.value ?? 0))),
    guestHp: Math.max(0, Math.round(Number(opponentHp.value ?? 0))),
    endedAtMs: Date.now()
  });
}

async function handlePlayerSkillUse(skill = null) {
  if (!skill || typeof skill !== 'object') return;

  if (!isCurrentBattlePvP.value || currentScreen.value !== 'battle') {
    await useSkillCore(skill);
    return;
  }

  const resolvedSkill = resolveSkillDefinitionById(skill.id);
  if (!canUseSkillInPvp(resolvedSkill)) return;

  const localPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
  const opponentPlayerId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  const requestCastId = `cast-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  if (isCurrentPlayerMatchHost()) {
    const castPayload = buildHostAuthoritativeSkillCastPayload({
      skillId: resolvedSkill.id,
      casterPlayerId: localPlayerId,
      targetPlayerId: opponentPlayerId,
      castId: requestCastId
    });
    dispatchHostSkillCast(castPayload, 'local_host_cast');
    return;
  }

  awaitingLocalSkillCastAck = true;
  if (localSkillCastAckTimer) {
    clearTimeout(localSkillCastAckTimer);
  }
  localSkillCastAckTimer = setTimeout(() => {
    localSkillCastAckTimer = null;
    if (!awaitingLocalSkillCastAck) return;
    awaitingLocalSkillCastAck = false;
  }, 4000);
  console.info(`[PvP Sync] guest送出skill_cast_request castId=${requestCastId} skillId=${resolvedSkill.id}`);
  void sendPvpRealtimeEvent('skill_cast_request', {
    requestCastId,
    skillId: resolvedSkill.id,
    animationKey: resolvedSkill.animationKey,
    requestedAtMs: Date.now(),
    requestedBattleRemainingMs: Math.max(0, Math.round(Number(timeLeft.value ?? 0) * 1000))
  });
}

function handleLocalPvpAttack(event = {}) {
  if (!isCurrentBattlePvP.value) return;
  if (currentScreen.value !== 'battle') return;
  if (String(event?.type ?? '') !== 'damage') return;
  const amount = Math.max(0, Number(event?.amount ?? 0));
  if (amount <= 0) return;
  const source = String(event?.source ?? 'slash').trim() || 'slash';
  if (source !== 'slash') return;

  void sendPvpRealtimeEvent('damage', {
    amount,
    source: 'slash'
  });
}

function handlePvpRealtimeEvent(packet = {}) {
  const normalizedPacket = normalizeIncomingPvpPacket(packet);
  if (!normalizedPacket || typeof normalizedPacket !== 'object') return;
  if (!shouldAcceptPvpPacket(normalizedPacket)) return;

  const type = String(normalizedPacket.type ?? '').trim();
  console.info(`[PvP Sync] 解析後message.type=${type || 'unknown'}`);
  if (!type) return;

  if (type === 'ready') {
    if (matchmakingStatus.phase !== 'matched') return;
    const isReady = normalizedPacket?.payload?.ready !== false;
    matchmakingStatus.opponentReady = Boolean(isReady);
    if (matchmakingStatus.opponentReady) {
      console.info('[PvP Sync] 設定opponentReady=true');
    }
    refreshPvpReadyMessage();
    checkBothReady('remote_ready');
    return;
  }

  if (type === 'start_battle' || type === 'battle_start') {
    if (matchmakingStatus.phase !== 'matched') return;
    const mode = String(normalizedPacket?.payload?.mode ?? '').trim().toLowerCase();
    if (mode && mode !== 'pvp') return;
    const startAt = Number(normalizedPacket?.payload?.startAt ?? Date.now());
    const seed = String(normalizedPacket?.payload?.seed ?? '').trim();
    if (seed) {
      lastPvpBattleSeed = seed;
    }
    console.info(`[PvP Sync] 收到start_battle，進入PvP seed=${seed || 'none'}`);
    schedulePvpBattleStart(startAt);
    return;
  }

  if (type === 'skill_cast_request') {
    handleSkillCastRequest(normalizedPacket?.payload ?? {}, normalizedPacket?._sourcePlayerId ?? '');
    return;
  }

  if (type === 'skill_cast') {
    if (!isCurrentBattlePvP.value) return;
    if (currentScreen.value !== 'battle') return;
    if (gameState.value === 'gameResult') return;
    handleSkillCast(normalizedPacket?.payload ?? {}, normalizedPacket?._sourcePlayerId ?? '');
    return;
  }

  if (type === 'damage') {
    if (!isCurrentBattlePvP.value) return;
    if (currentScreen.value !== 'battle') return;
    if (gameState.value === 'gameResult') return;
    const amount = Math.max(0, Number(normalizedPacket?.payload?.amount ?? 0));
    if (amount <= 0) return;
    const source = String(normalizedPacket?.payload?.source ?? '').trim();
    if (source === 'skill') return;

    applyRemoteDamage(amount);
    return;
  }

  if (type === 'battle_end') {
    if (!isCurrentBattlePvP.value) return;
    if (currentScreen.value !== 'battle') return;
    const payload = normalizedPacket?.payload ?? {};
    const localPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
    const hostPlayerId = String(payload?.hostPlayerId ?? '').trim();
    const guestPlayerId = String(payload?.guestPlayerId ?? '').trim();
    const hostHp = Number(payload?.hostHp);
    const guestHp = Number(payload?.guestHp);
    const fallbackPlayerHp = Number(payload?.playerHp);
    const fallbackOpponentHp = Number(payload?.opponentHp);

    if (localPlayerId && hostPlayerId && guestPlayerId && Number.isFinite(hostHp) && Number.isFinite(guestHp)) {
      if (localPlayerId === hostPlayerId) {
        playerHp.value = Math.max(0, Math.round(hostHp));
        opponentHp.value = Math.max(0, Math.round(guestHp));
      } else if (localPlayerId === guestPlayerId) {
        playerHp.value = Math.max(0, Math.round(guestHp));
        opponentHp.value = Math.max(0, Math.round(hostHp));
      }
    } else {
      if (Number.isFinite(fallbackPlayerHp)) playerHp.value = Math.max(0, Math.round(fallbackPlayerHp));
      if (Number.isFinite(fallbackOpponentHp)) opponentHp.value = Math.max(0, Math.round(fallbackOpponentHp));
    }

    battleEndBroadcasted = true;
    clearSkillCastSyncTimers();
    queuedSkillCasts.length = 0;
    queuedSkillCastIds.clear();
    activeSkillCast = null;
    awaitingLocalSkillCastAck = false;
    clearSkillAnimation('battle_end');
    setPaused(false);
    if (gameState.value !== 'gameResult') {
      gameState.value = 'gameResult';
    }
    return;
  }

  if (type === 'forfeit') {
    if (!isCurrentBattlePvP.value) return;
    if (currentScreen.value !== 'battle') return;
    if (gameState.value === 'gameResult') return;
    resetSkillCastSyncState();
    forceOpponentDefeat();
  }
}

function resolveBgmSceneId(screen) {
  if (screen === 'battle') {
    return currentStageConfig.value.hasBoss
      ? SCREEN_BGM_SCENE.battleBoss
      : SCREEN_BGM_SCENE.battle;
  }
  return SCREEN_BGM_SCENE[screen] ?? 'home';
}

function forfeitActivePvpBattleAndExit(destination = 'home') {
  if (currentScreen.value !== 'battle') return false;
  if (!isCurrentBattlePvP.value) return false;
  if (gameState.value === 'gameResult') return false;

  resetTutorialState();
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  shouldAutoResumeBattleAfterForeground = false;
  resetSkillCastSyncState();
  void sendPvpRealtimeEvent('forfeit', { reason: 'leave_battle_screen' });
  setPaused(false);
  stopGame();

  applyMatchStatus({
    phase: 'idle',
    message: '你已離開 PvP 對戰，視為投降。',
    opponentProfile: null,
    queueSeconds: 0
  });

  battleSessionMode.value = 'pve';
  currentScreen.value = destination;
  return true;
}

function handleAppBackground() {
  if (appIsInBackground) return;
  appIsInBackground = true;

  persistRuntimeSettingsIfReady();

  if (forfeitActivePvpBattleAndExit('home')) {
    return;
  }

  sfx.pauseForAppBackground();
  void matchService.onAppPause();

  const shouldPauseBattle = currentScreen.value === 'battle'
    && gameState.value === 'playing'
    && !isPaused.value;
  shouldAutoResumeBattleAfterForeground = shouldPauseBattle && !isBattleMenuOpen.value;

  if (shouldPauseBattle) {
    setPaused(true);
  }
}

function handleAppForeground() {
  if (!appIsInBackground) return;
  appIsInBackground = false;

  sfx.resumeFromAppForeground();
  void matchService.onAppResume();

  if (
    shouldAutoResumeBattleAfterForeground
    && currentScreen.value === 'battle'
    && gameState.value === 'playing'
    && !isBattleMenuOpen.value
  ) {
    setPaused(false);
  }
  shouldAutoResumeBattleAfterForeground = false;
}

onMounted(async () => {
  await loadAccountState();
  await loadStudyStateForActiveAccount();
  await loadRuntimeSettings();
  hasHydratedRuntimeSettings = true;
  const sceneId = resolveBgmSceneId(currentScreen.value);
  sfx.setBgmScene(sceneId);
  setBgmEnabled(bgmEnabled.value);
  if (bgmEnabled.value) sfx.ensureBgmRunning();

  matchService.init()
    .then((capabilities) => {
      Object.assign(matchCapabilities, capabilities ?? {});
    })
    .catch((error) => {
      applyMatchStatus({
        phase: 'error',
        message: '配對系統初始化失敗。',
        errorMessage: String(error?.message ?? error ?? '')
      });
    });

  unsubscribeMatchStatus = matchService.subscribe((status) => {
    applyMatchStatus(status);
  });
  unsubscribeRealtimeEvents = matchService.subscribeRealtime((packet) => {
    handlePvpRealtimeEvent(packet);
  });

  const unlockAudio = () => {
    sfx.init();
    if (bgmEnabled.value) sfx.ensureBgmRunning();
  };

  const listenerOptions = { passive: true };
  window.addEventListener('pointerdown', unlockAudio, listenerOptions);
  window.addEventListener('touchstart', unlockAudio, listenerOptions);
  window.addEventListener('click', unlockAudio, listenerOptions);
  detachAudioUnlock = () => {
    window.removeEventListener('pointerdown', unlockAudio, listenerOptions);
    window.removeEventListener('touchstart', unlockAudio, listenerOptions);
    window.removeEventListener('click', unlockAudio, listenerOptions);
  };

  const lifecycleHandles = [];
  let fallbackDetach = null;
  try {
    lifecycleHandles.push(await CapacitorApp.addListener('pause', handleAppBackground));
    lifecycleHandles.push(await CapacitorApp.addListener('resume', handleAppForeground));
    lifecycleHandles.push(await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        handleAppBackground();
        return;
      }
      handleAppForeground();
    }));
  } catch (error) {
    console.warn('Failed to bind Capacitor App lifecycle listeners, falling back to web listeners:', error);
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleAppBackground();
        return;
      }
      handleAppForeground();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleAppBackground);
    window.addEventListener('blur', handleAppBackground);
    window.addEventListener('pageshow', handleAppForeground);
    window.addEventListener('focus', handleAppForeground);
    fallbackDetach = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleAppBackground);
      window.removeEventListener('blur', handleAppBackground);
      window.removeEventListener('pageshow', handleAppForeground);
      window.removeEventListener('focus', handleAppForeground);
    };
  }
  detachAppAudioLifecycle = () => {
    while (lifecycleHandles.length > 0) {
      const handle = lifecycleHandles.pop();
      if (handle && typeof handle.remove === 'function') {
        void handle.remove();
      }
    }
    if (typeof fallbackDetach === 'function') {
      fallbackDetach();
      fallbackDetach = null;
    }
  };
});

onBeforeUnmount(() => {
  clearPendingPvpStartTimer();
  resetSkillCastSyncState();
  if (typeof unsubscribeMatchStatus === 'function') unsubscribeMatchStatus();
  if (typeof unsubscribeRealtimeEvents === 'function') unsubscribeRealtimeEvents();
  if (typeof detachAudioUnlock === 'function') detachAudioUnlock();
  if (typeof detachAppAudioLifecycle === 'function') detachAppAudioLifecycle();
  unsubscribeRealtimeEvents = null;
  detachAudioUnlock = null;
  detachAppAudioLifecycle = null;
  matchService.destroy();
});

watch(
  [gameState, isPaused, currentScreen],
  ([state, paused, screen]) => {
    if (screen !== 'battle') return;
    if (state !== 'playing') return;
    if (paused) return;
    tryStartQueuedSkillCast('state_watch');
  }
);

watch(
  [gameState, currentScreen],
  ([state, screen]) => {
    if (screen !== 'battle') return;
    if (state !== 'gameResult') return;
    maybeBroadcastHostBattleEnd('result_watch');
  }
);

watch(
  studyState,
  () => {
    void saveStudyStateForActiveAccount();
  },
  { deep: true }
);

watch(
  playerConfig,
  () => {
    void saveStudyStateForActiveAccount();
  },
  { deep: true }
);

watch(
  stageProgress,
  () => {
    void saveStudyStateForActiveAccount();
  },
  { deep: true }
);

watch(
  accountState,
  () => {
    void saveAccountState();
    void loadStudyStateForActiveAccount();
    void matchService.signIn({
      displayName: getPreferredDisplayName(),
      silent: true
    });
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
  if (isCurrentBattlePvP.value) return;
  if (currentBattleOutcome.value !== 'win') return;
  if (!stageList.some(stage => stage.id === selectedStageId.value)) return;
  if (stageProgress.clearedStageIds.includes(selectedStageId.value)) return;
  stageProgress.clearedStageIds = [...stageProgress.clearedStageIds, selectedStageId.value];
});

watch(
  [currentScreen, () => currentStageConfig.value.hasBoss],
  ([screen]) => {
    const sceneId = resolveBgmSceneId(screen);
    sfx.setBgmScene(sceneId);
  },
  { immediate: true }
);

function startBattle() {
  resetSkillCastSyncState();
  battleEndBroadcasted = false;
  battleSessionMode.value = 'pve';
  resetTutorialState();
  currentScreen.value = 'battle';
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  setPaused(false);
  initGame();
}

function startPvpBattle() {
  clearPendingPvpStartTimer();
  resetSkillCastSyncState();
  battleEndBroadcasted = false;
  console.info(`[PvP Sync] 進入PvP戰鬥流程 seed=${lastPvpBattleSeed || 'none'}`);
  battleSessionMode.value = 'pvp';
  selectedStageId.value = STAGE_IDS.STAGE_02;
  resetTutorialState();
  currentScreen.value = 'battle';
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  setPaused(false);
  initGame();
}

function openMatchmaking() {
  currentScreen.value = 'matchmaking';
}

async function syncMatchmakingAccount() {
  await matchService.signIn({
    displayName: getPreferredDisplayName()
  });
}

async function startPvPMatchmaking() {
  resetPvpRealtimeState();
  await matchService.startMatchmaking({
    displayName: getPreferredDisplayName(),
    characterId: playerConfig.characterId,
    equippedSkillIds: buildFilledSkillIds(playerConfig.equippedSkillIds)
  });
}

async function cancelPvPMatchmaking() {
  resetPvpRealtimeState();
  await matchService.cancelMatchmaking();
}

async function goHomeFromMatchmaking() {
  if (matchmakingStatus.phase === 'searching' || matchmakingStatus.phase === 'matched') {
    resetPvpRealtimeState();
    await matchService.cancelMatchmaking();
  }
  currentScreen.value = 'home';
}

function openStageSelect() {
  currentScreen.value = 'stageSelect';
}

function goHomeFromStageSelect() {
  currentScreen.value = 'home';
}

function goStageSelectFromResult() {
  resetPvpRealtimeState();
  battleSessionMode.value = 'pve';
  resetTutorialState();
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  setPaused(false);
  stopGame();
  currentScreen.value = 'stageSelect';
}

function goMatchmakingFromResult() {
  resetPvpRealtimeState();
  battleSessionMode.value = 'pve';
  resetTutorialState();
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  setPaused(false);
  stopGame();
  currentScreen.value = 'matchmaking';
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
  if (!isCurrentBattlePvP.value) {
    setPaused(true);
  }
}

function closeBattleMenu() {
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  if (!isCurrentBattlePvP.value) {
    setPaused(false);
  }
}

function openMenuSettings() {
  battleMenuView.value = 'settings';
}

function backToMainMenuView() {
  battleMenuView.value = 'main';
}

function restartBattleFromMenu() {
  if (forfeitActivePvpBattleAndExit('home')) return;
  resetTutorialState();
  closeBattleMenu();
  initGame();
}

function returnToHome() {
  if (forfeitActivePvpBattleAndExit('home')) return;
  battleSessionMode.value = 'pve';
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

function openLeaderboard() {
  currentScreen.value = 'leaderboard';
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

function goHomeFromLeaderboard() {
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

async function confirmAccountDialog() {
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

  const allProfiles = await loadAllStudyProfiles();
  const profileKey = getActiveProfileKey();
  delete allProfiles.profiles[profileKey];
  await saveAllStudyProfiles(allProfiles);
  accountState.name = '';
  closeAccountDialog();
}

function addStudyKnowledgePoints(points) {
  studyState.knowledgePoints += points;
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
  if (studyState.knowledgePoints < cost) return;

  studyState.knowledgePoints -= cost;
  track.level += 1;
}
</script>
