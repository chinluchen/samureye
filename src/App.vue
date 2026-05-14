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
          :animation-meta="activeSkillAnimation"
        />

        <div id="cataract-mist-layer">
          <div class="mist-text">無法攻擊</div>
        </div>

        <GameTarget
          :game-state="gameState"
          :is-splitting="isSplitting"
          :target-transform="targetTransform"
          :reticle-offset-transform="reticleOffsetTransform"
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

  <Teleport to="body">
    <div
      v-if="isRootCountdownOverlayVisible"
      ref="rootCountdownOverlayRef"
      class="global-countdown-overlay"
      aria-live="polite"
      aria-atomic="true"
    >
      <div class="global-countdown-content">
        <p class="global-countdown-title">即將開戰</p>
        <p :key="`countdown-${rootCountdownNumber}`" class="global-countdown-number">{{ rootCountdownNumber }}</p>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="isRootFogOverlayVisible"
      ref="rootFogOverlayRef"
      :class="['global-fog-overlay', `phase-${rootFogOverlayPhase}`]"
      :style="rootFogOverlayStyle"
      aria-hidden="true"
    >
      <span class="global-fog-layer global-fog-layer-a"></span>
      <span class="global-fog-layer global-fog-layer-b"></span>
      <span class="global-fog-layer global-fog-layer-c"></span>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { App as CapacitorApp } from '@capacitor/app';
import { GAME_CONFIG } from './data/gameConfig.js';
import { SCREEN_BGM_SCENE } from './data/audioCatalog.js';
import { characters } from './data/characters.js';
import { skillPool } from './data/skillPool.js';
import { stageConfigs, STAGE_IDS } from './data/stageConfigs.js';
import { buildHostAuthoritativeSkillCast, resolveSkillEffectType, resolveSkillTargetRule } from './engines/SkillEngine.js';
import { createSkillLifecycleEngine } from './engines/SkillLifecycleEngine.js';
import { createSkillVisualEngine } from './engines/SkillVisualEngine.js';
import { createStatusEffectEngine } from './engines/StatusEffectEngine.js';
import { useBattleGame } from './composables/useBattleGame.js';
import { useSwipeControls } from './composables/useSwipeControls.js';
import { drawSlashLine, showDamagePopup, showFeedbackPop, triggerImpactShake } from './utils/effects.js';
import { sfx } from './services/SoundEngine.js';
import { triggerHaptic } from './services/hapticsService.js';
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
  startPending: false,
  startAtMs: 0,
  fogPending: false,
  fogEndAtMs: 0
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
let pendingPvpFogTimer = null;
let pendingRootFogFadeOutTimer = null;
const rootFogPhaseTimers = new Set();
let lastPvpBattleSeed = '';
let activeSkillCast = null;
const queuedSkillCasts = [];
const queuedSkillCastIds = new Set();
const appliedSkillCastDamageIds = new Set();
const appliedSkillCastHitEventIds = new Set();
let skillCastResolveTimer = null;
let skillCastResumeTimer = null;
const skillCastHitTimers = new Set();
let awaitingLocalSkillCastAck = false;
let localSkillCastAckTimer = null;
let battleEndBroadcasted = false;
const activeSkillAnimation = ref(null);
const PVP_READY_COUNTDOWN_MS = 3200;
const PVP_START_GUARD_MS = 350;
const PVP_FOG_TRANSITION_MS = 1800;
const rootCountdownOverlayRef = ref(null);
const countdownNowMs = ref(Date.now());
let rootCountdownTimer = null;
let lastLoggedCountdownTick = null;
const rootFogOverlayRef = ref(null);
const rootFogOverlayVisible = ref(false);
const rootFogOverlayPhase = ref('pre');
const rootFogTimeline = reactive({
  durationMs: PVP_FOG_TRANSITION_MS,
  thinEndMs: 500,
  buildEndMs: 1300,
  holdEndMs: PVP_FOG_TRANSITION_MS
});

function playSkillAudioByKey(audioKey = '', { isHeal = false, damage = 0, healAmount = 0 } = {}) {
  const key = String(audioKey || '').trim();
  switch (key) {
    case 'slash_combo':
      sfx.playSlash();
      sfx.playHit();
      return;
    case 'heal_apply':
    case 'heal_chime':
      sfx.playSfxProfile?.('focus');
      return;
    case 'prism_break':
    case 'prism_break_hit':
      sfx.playSfxProfile?.('burst');
      return;
    case 'shield_on':
      sfx.playSfxProfile?.('shield');
      return;
    case 'ultimate_hit':
      sfx.playUlt();
      return;
    default:
      if (isHeal || healAmount > 0) {
        sfx.playSfxProfile?.('focus');
        return;
      }
      if (damage > 0) {
        sfx.playHit();
      }
  }
}

const skillVisualEngine = createSkillVisualEngine({
  drawSlashLine,
  showDamagePopup,
  triggerImpactShake,
  triggerHaptic,
  playAudioKey: playSkillAudioByKey
});

function showCasterSkillFeedback(text = '', { success = true } = {}) {
  const message = String(text ?? '').trim() || (success ? '技能施放成功' : '技能施放失敗');
  const color = success ? '#22c55e' : '#ef4444';
  showFeedbackPop(message, color, window.innerWidth / 2, window.innerHeight / 2);
}

function showLifecycleCastFeedback(cast = null) {
  if (!cast || typeof cast !== 'object') return;
  if (String(cast?.localRole ?? '').trim() !== 'caster') return;
  const castResult = resolveCastResultForLifecycle(cast);
  const lifecycleFeedback = cast?.lifecycle?.castFeedback && typeof cast.lifecycle.castFeedback === 'object'
    ? cast.lifecycle.castFeedback
    : (cast?.skillDefinition?.lifecycle?.castFeedback ?? {});
  const successText = String(lifecycleFeedback?.success ?? '').trim() || '技能施放成功';
  const failedText = String(lifecycleFeedback?.failed ?? '').trim()
    || String(castResult.failReason ?? '').trim()
    || '技能施放失敗';
  const isSuccess = castResult.success !== false;
  showCasterSkillFeedback(isSuccess ? successText : failedText, { success: isSuccess });
}

const skillLifecycleEngine = createSkillLifecycleEngine({
  onStage: (event) => {
    if (!event || typeof event !== 'object') return;
    const detail = event.detail && typeof event.detail === 'object'
      ? Object.entries(event.detail)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(' ')
      : '';
    const suffix = detail ? ` ${detail}` : '';
    console.info(`[SkillLifecycle] stage=${event.stage} castId=${event.castId || '-'} skillId=${event.skillId || '-'} role=${event.localRole || '-'} success=${String(event.success)} outcome=${event.outcome || '-'}${suffix}`);
  }
});

function emitSkillLifecycleStage(stage = '', cast = null, detail = {}) {
  return skillLifecycleEngine.emitStage(stage, cast, detail);
}

let statusEffectEngine = null;
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
  reticleOffsetTransform,
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
  playSkillCinematic,
  finishSkillCinematic,
  applyOpponentDamage,
  applyRemoteDamage,
  forceOpponentDefeat,
  setReticleOffset,
  clearReticleOffset
} = game;

statusEffectEngine = createStatusEffectEngine({
  applyReticleOffset: ({ x = 0, y = 0 } = {}) => {
    setReticleOffset({ x, y });
  },
  clearReticleOffset: () => {
    clearReticleOffset();
  },
  showCasterFeedback: (text, context = {}) => {
    showCasterSkillFeedback(text, {
      success: context?.success !== false
    });
  },
  onLog: (message) => {
    if (!message) return;
    console.info(message);
  },
  onEffectStart: (effect) => {
    emitSkillLifecycleStage('effect_duration', {
      castId: String(effect?.castId ?? '').trim(),
      skillId: String(effect?.skillId ?? '').trim(),
      castResult: { success: true, outcome: 'success', failReason: '' }
    }, {
      source: 'status_effect_start',
      statusEffectId: String(effect?.statusEffectId ?? '').trim(),
      durationMs: Math.max(0, Math.round(Number(effect?.durationMs ?? 0)))
    });
  },
  onEffectEnd: (effect) => {
    emitSkillLifecycleStage('effect_end', {
      castId: String(effect?.castId ?? '').trim(),
      skillId: String(effect?.skillId ?? '').trim(),
      castResult: { success: true, outcome: 'success', failReason: '' }
    }, {
      source: 'status_effect_end',
      statusEffectId: String(effect?.statusEffectId ?? '').trim(),
      reason: String(effect?.reason ?? '').trim()
    });
  }
});

const selectedCharacter = computed(() => {
  return characters.find(item => item.id === playerConfig.characterId) ?? characters[0];
});
const isTutorialStage = computed(() => currentStageConfig.value.id === STAGE_IDS.STAGE_01);
const isCurrentBattlePvP = computed(() => battleSessionMode.value === 'pvp');
const isRootCountdownOverlayVisible = computed(() => {
  return currentScreen.value === 'matchmaking'
    && matchmakingStatus.phase === 'matched'
    && Boolean(matchmakingStatus.startPending)
    && !Boolean(matchmakingStatus.fogPending)
    && Number.isFinite(Number(matchmakingStatus.startAtMs))
    && Number(matchmakingStatus.startAtMs) > 0;
});
const rootCountdownNumber = computed(() => {
  if (!isRootCountdownOverlayVisible.value) return 3;
  const remainMs = Number(matchmakingStatus.startAtMs) - countdownNowMs.value;
  if (remainMs <= 0) return 1;
  return Math.min(9, Math.max(1, Math.ceil(remainMs / 1000)));
});
const isRootFogOverlayVisible = computed(() => {
  return rootFogOverlayVisible.value;
});
const rootFogOverlayStyle = computed(() => {
  return {
    '--fog-thin-ms': `${Math.max(1, Math.round(rootFogTimeline.thinEndMs))}ms`,
    '--fog-build-ms': `${Math.max(1, Math.round(rootFogTimeline.buildEndMs - rootFogTimeline.thinEndMs))}ms`,
    '--fog-hold-ms': `${Math.max(1, Math.round(rootFogTimeline.holdEndMs - rootFogTimeline.buildEndMs))}ms`
  };
});
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

function getPvpBattleProgression() {
  return {
    maxHp: GAME_CONFIG.maxHp,
    targetHitDamage: GAME_CONFIG.targetHitDamage,
    skillPointGainPerHit: GAME_CONFIG.skillPointGainPerHit,
    enemyAttackChancePerTick: 0,
    enemyAttackDamage: GAME_CONFIG.enemyAttackDamage,
    enemyUltChancePerTick: 0
  };
}

function getBattleProgression() {
  if (battleSessionMode.value === 'pvp') {
    return getPvpBattleProgression();
  }

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

function clearRootCountdownTimer() {
  if (!rootCountdownTimer) return;
  clearInterval(rootCountdownTimer);
  rootCountdownTimer = null;
}

function ensureRootCountdownTimer() {
  if (rootCountdownTimer) return;
  rootCountdownTimer = setInterval(() => {
    countdownNowMs.value = Date.now();
  }, 90);
}

function clearPendingPvpStartTimer() {
  if (pendingPvpStartTimer) {
    clearTimeout(pendingPvpStartTimer);
    pendingPvpStartTimer = null;
  }
  if (pendingPvpFogTimer) {
    clearTimeout(pendingPvpFogTimer);
    pendingPvpFogTimer = null;
  }
  if (pendingRootFogFadeOutTimer) {
    clearTimeout(pendingRootFogFadeOutTimer);
    pendingRootFogFadeOutTimer = null;
  }
  if (rootFogPhaseTimers.size > 0) {
    rootFogPhaseTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    rootFogPhaseTimers.clear();
  }
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
  if (skillCastHitTimers.size > 0) {
    skillCastHitTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    skillCastHitTimers.clear();
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
  appliedSkillCastHitEventIds.clear();
  const castToClear = activeSkillCast;
  activeSkillCast = null;
  awaitingLocalSkillCastAck = false;
  void clearSkillAnimation('reset_state', castToClear);
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
      targetRule: 'opponent',
      effectType: 'damage',
      effectMode: 'single_hit',
      statusEffectId: '',
      valuePerHit: 0,
      pvpAuthoritativeValue: 0,
      effectDurationMs: 0,
      successRate: 1,
      failReason: '',
      pvpSyncMode: '',
      startAtMs: 0,
      intervalMs: 0,
      resolveMode: 'resolve_at_ms',
      timeSyncField: 'battleRemainingMsAtCast',
      pveStrategy: 'local_single_or_effect',
      pvpStrategy: 'host_single_result',
      pvpAuthoritySource: 'host',
      sendSkillDamagePacket: false,
      generateHitEvents: false,
      targetView: 'both',
      skillEndCondition: 'effect_completed_then_resume',
      battleOutcomeTiming: 'skill_end_after_effect',
      hitPattern: {},
      statusEffects: {
        id: '',
        target: '',
        durationMs: 0,
        tickMs: 0,
        hasStatusEffect: false,
        mode: 'snap',
        offsetX: 0,
        offsetY: 0,
        effectStartAtMs: 0,
        effectEndAtMs: 0,
        targetVisualKey: '',
        endVisualKey: '',
        casterFeedbackText: '',
        failReason: '',
        successRate: 1
      },
      castVisualKey: '',
      hitVisualKey: '',
      impactVisualKey: '',
      durationVisualKey: '',
      endVisualKey: '',
      clearTiming: '',
      damageTextMode: 'single',
      textColor: 'red',
      audioKey: '',
      hapticMode: '',
      useHitEventsVisual: false,
      useHitEventsExecution: false,
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
    targetRule: String(raw.targetRule ?? 'opponent').trim() || 'opponent',
    effectType: String(raw.effectType ?? 'damage').trim() || 'damage',
    effectMode: String(raw.effectMode ?? 'single_hit').trim() || 'single_hit',
    statusEffectId: String(raw.statusEffectId ?? raw.statusEffects?.id ?? '').trim(),
    valuePerHit: Math.max(0, Number(raw.valuePerHit ?? 0)),
    pvpAuthoritativeValue: Math.max(0, Number(raw.pvpAuthoritativeValue ?? 0)),
    effectDurationMs: Math.max(0, Math.round(Number(raw.effectDurationMs ?? raw.statusEffects?.durationMs ?? 0))),
    successRate: Math.max(0, Math.min(1, Number(raw.successRate ?? raw.statusEffects?.successRate ?? 1))),
    failReason: String(raw.failReason ?? raw.statusEffects?.failReason ?? '').trim(),
    pvpSyncMode: String(raw.pvpSyncMode ?? '').trim(),
    startAtMs: Math.max(0, Math.round(Number(raw.startAtMs ?? 0))),
    intervalMs: Math.max(0, Math.round(Number(raw.intervalMs ?? 0))),
    resolveMode: String(raw.resolveMode ?? '').trim(),
    timeSyncField: String(raw.timeSyncField ?? '').trim(),
    pveStrategy: String(raw.pveStrategy ?? '').trim(),
    pvpStrategy: String(raw.pvpStrategy ?? '').trim(),
    pvpAuthoritySource: String(raw.pvpAuthoritySource ?? '').trim(),
    sendSkillDamagePacket: Boolean(raw.sendSkillDamagePacket),
    generateHitEvents: Boolean(raw.generateHitEvents),
    targetView: String(raw.targetView ?? '').trim(),
    skillEndCondition: String(raw.skillEndCondition ?? '').trim(),
    battleOutcomeTiming: String(raw.battleOutcomeTiming ?? '').trim(),
    pvpPacketRule: String(raw.pvpPacketRule ?? '').trim(),
    hitPattern: raw.hitPattern && typeof raw.hitPattern === 'object' ? raw.hitPattern : {},
    statusEffects: raw.statusEffects && typeof raw.statusEffects === 'object'
      ? {
        ...raw.statusEffects,
        mode: String(raw.statusEffects.mode ?? 'snap').trim() || 'snap',
        offsetX: Math.round(Number(raw.statusEffects.offsetX ?? 0)),
        offsetY: Math.round(Number(raw.statusEffects.offsetY ?? 0)),
        effectStartAtMs: Number.isFinite(Number(raw.statusEffects.effectStartAtMs))
          ? Math.round(Number(raw.statusEffects.effectStartAtMs))
          : 0,
        effectEndAtMs: Number.isFinite(Number(raw.statusEffects.effectEndAtMs))
          ? Math.round(Number(raw.statusEffects.effectEndAtMs))
          : 0,
        targetVisualKey: String(raw.statusEffects.targetVisualKey ?? '').trim(),
        endVisualKey: String(raw.statusEffects.endVisualKey ?? '').trim(),
        casterFeedbackText: String(raw.statusEffects.casterFeedbackText ?? '').trim(),
        failReason: String(raw.statusEffects.failReason ?? '').trim(),
        successRate: Math.max(0, Math.min(1, Number(raw.statusEffects.successRate ?? 1)))
      }
      : {
        id: '',
        target: '',
        durationMs: 0,
        tickMs: 0,
        hasStatusEffect: false,
        mode: 'snap',
        offsetX: 0,
        offsetY: 0,
        effectStartAtMs: 0,
        effectEndAtMs: 0,
        targetVisualKey: '',
        endVisualKey: '',
        casterFeedbackText: '',
        failReason: '',
        successRate: 1
      },
    castVisualKey: String(raw.castVisualKey ?? '').trim(),
    hitVisualKey: String(raw.hitVisualKey ?? '').trim(),
    impactVisualKey: String(raw.impactVisualKey ?? '').trim(),
    durationVisualKey: String(raw.durationVisualKey ?? '').trim(),
    endVisualKey: String(raw.endVisualKey ?? '').trim(),
    clearTiming: String(raw.clearTiming ?? '').trim(),
    damageTextMode: String(raw.damageTextMode ?? '').trim(),
    textColor: String(raw.textColor ?? '').trim(),
    audioKey: String(raw.audioKey ?? '').trim(),
    hapticMode: String(raw.hapticMode ?? '').trim(),
    useHitEventsVisual: Boolean(raw.useHitEventsVisual),
    useHitEventsExecution: Boolean(raw.useHitEventsExecution),
    baseDamage: Math.max(0, Number(raw.damage ?? 0)),
    healValue: Math.max(0, Number(raw.healValue ?? 0)),
    visualEffects: Array.isArray(raw.visualEffects) ? raw.visualEffects : [],
    audioEffects: Array.isArray(raw.audioEffects) ? raw.audioEffects : [],
    timing: raw.timing && typeof raw.timing === 'object' ? raw.timing : { resolveRatio: 0.62 },
    modeOverrides: raw.modeOverrides && typeof raw.modeOverrides === 'object' ? raw.modeOverrides : {}
  };
}

function resolveSkillNameById(skillId = '') {
  const skill = resolveSkillDefinitionById(skillId);
  const name = String(skill?.name ?? '').trim();
  return name || '對手技能';
}

function resolveCastResultForLifecycle(cast = null) {
  const result = cast?.result && typeof cast.result === 'object' ? cast.result : {};
  const castResult = cast?.castResult && typeof cast.castResult === 'object' ? cast.castResult : {};
  const outcome = String(castResult?.outcome ?? result?.outcome ?? '').trim().toLowerCase();
  const success = typeof castResult?.success === 'boolean'
    ? castResult.success
    : (typeof result?.success === 'boolean'
      ? result.success
      : (outcome ? outcome !== 'failed' : true));
  const failReason = String(castResult?.failReason ?? result?.failReason ?? '').trim();
  return {
    success,
    outcome,
    failReason
  };
}

function resolveCastEffectDurationMs(cast = null) {
  const timelineDuration = Number(cast?.effectTimeline?.durationMs);
  if (Number.isFinite(timelineDuration) && timelineDuration > 0) {
    return Math.max(0, Math.round(timelineDuration));
  }
  const statusDuration = Number(cast?.statusEffects?.durationMs);
  if (Number.isFinite(statusDuration) && statusDuration > 0) {
    return Math.max(0, Math.round(statusDuration));
  }
  const skillDuration = Number(cast?.skillDefinition?.effectDurationMs);
  if (Number.isFinite(skillDuration) && skillDuration > 0) {
    return Math.max(0, Math.round(skillDuration));
  }
  return 0;
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
  const battleRemainingMsAtCast = Math.max(0, Math.round(Number(timeLeft.value ?? 0) * 1000));
  const localPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
  const opponentPlayerId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  const resolvedCasterPlayerId = String(casterPlayerId).trim();
  const fallbackTargetPlayerId = resolveSkillTargetRule(resolvedSkill) === 'self'
    ? resolvedCasterPlayerId
    : (resolvedCasterPlayerId === localPlayerId ? opponentPlayerId : localPlayerId);
  const resolvedTargetPlayerId = String(targetPlayerId).trim() || fallbackTargetPlayerId;
  let targetCurrentHp = Math.max(0, Math.round(Number(opponentHp.value ?? 0)));
  let targetMaxHp = Math.max(0, Math.round(Number(opponentMaxHp.value ?? 0)));
  if (resolvedTargetPlayerId && resolvedTargetPlayerId === localPlayerId) {
    targetCurrentHp = Math.max(0, Math.round(Number(playerHp.value ?? 0)));
    targetMaxHp = Math.max(0, Math.round(Number(playerMaxHp.value ?? 0)));
  } else if (resolvedTargetPlayerId && resolvedTargetPlayerId === opponentPlayerId) {
    targetCurrentHp = Math.max(0, Math.round(Number(opponentHp.value ?? 0)));
    targetMaxHp = Math.max(0, Math.round(Number(opponentMaxHp.value ?? 0)));
  } else if (resolvedCasterPlayerId !== localPlayerId) {
    targetCurrentHp = Math.max(0, Math.round(Number(playerHp.value ?? 0)));
    targetMaxHp = Math.max(0, Math.round(Number(playerMaxHp.value ?? 0)));
  }

  return buildHostAuthoritativeSkillCast({
    skill: resolvedSkill,
    castId: safeCastId,
    casterPlayerId: resolvedCasterPlayerId,
    targetPlayerId: resolvedTargetPlayerId,
    hostPlayerId: resolveMatchPlayerId(matchmakingStatus.localProfile),
    battleRemainingMsAtCast,
    resolveRatio,
    pauseDurationMs,
    targetCurrentHp,
    targetMaxHp,
    castStartAtMs: nowMs,
  });
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
  const resultPayload = payload?.result && typeof payload.result === 'object' ? payload.result : {};
  const castResultPayload = payload?.castResult && typeof payload.castResult === 'object'
    ? payload.castResult
    : {};
  const lifecyclePayload = payload?.lifecycle && typeof payload.lifecycle === 'object'
    ? payload.lifecycle
    : {};
  const resultOutcome = String(resultPayload?.outcome ?? '').trim().toLowerCase();
  const resultSuccess = typeof castResultPayload?.success === 'boolean'
    ? castResultPayload.success
    : (typeof resultPayload?.success === 'boolean'
      ? resultPayload.success
      : (resultOutcome ? resultOutcome !== 'failed' : null));
  const resultFailReason = String(castResultPayload?.failReason ?? resultPayload?.failReason ?? '').trim();
  const resultDamage = Math.max(0, Math.round(Number(resultPayload?.damage ?? payload?.damage ?? 0)));
  const resultHealPayload = resultPayload?.heal && typeof resultPayload.heal === 'object'
    ? resultPayload.heal
    : {};
  const resultStatusEffectPayload = resultPayload?.statusEffect && typeof resultPayload.statusEffect === 'object'
    ? resultPayload.statusEffect
    : {};
  const resultHeal = {
    rawHeal: Math.max(0, Math.round(Number(resultHealPayload?.rawHeal ?? 0))),
    actualHeal: Math.max(0, Math.round(Number(resultHealPayload?.actualHeal ?? 0))),
    hpBefore: Math.max(0, Math.round(Number(resultHealPayload?.hpBefore ?? 0))),
    hpAfter: Math.max(0, Math.round(Number(resultHealPayload?.hpAfter ?? 0))),
    maxHp: Math.max(0, Math.round(Number(resultHealPayload?.maxHp ?? 0)))
  };
  const rawHitEvents = Array.isArray(payload.hitEvents) ? payload.hitEvents : [];
  const statusEffectsPayload = payload?.statusEffects && typeof payload.statusEffects === 'object'
    ? payload.statusEffects
    : {};
  const effectTimelinePayload = payload?.effectTimeline && typeof payload.effectTimeline === 'object'
    ? payload.effectTimeline
    : {};
  const normalizedHitEvents = rawHitEvents
    .map((raw, index) => {
      if (!raw || typeof raw !== 'object') return null;
      const hitIndexRaw = Number(raw.hitIndex);
      const hitIndex = Number.isFinite(hitIndexRaw) && hitIndexRaw > 0
        ? Math.round(hitIndexRaw)
        : (index + 1);
      const atMsRaw = Number(raw.atMs);
      const atMs = Number.isFinite(atMsRaw) ? Math.round(atMsRaw) : null;
      const offsetMsRaw = Number(raw.offsetMs);
      const offsetMs = Number.isFinite(offsetMsRaw) ? Math.max(0, Math.round(offsetMsRaw)) : null;
      const hpBefore = Math.max(0, Math.round(Number(raw.hpBefore ?? 0)));
      const hpAfter = Math.max(0, Math.round(Number(raw.hpAfter ?? hpBefore)));
      const damage = Math.max(0, Math.round(Number(raw.damage ?? Math.max(0, hpBefore - hpAfter))));
      return {
        hitIndex,
        atMs,
        offsetMs,
        damage,
        hpBefore,
        hpAfter
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.hitIndex - right.hitIndex);
  const localRole = casterPlayerId === localPlayerId
    ? 'caster'
    : (targetPlayerId === localPlayerId
      ? 'target'
      : (targetPlayerId === casterPlayerId ? 'opponent' : 'observer'));

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
    result: resultPayload,
    resultDamage,
    resultHeal,
    statusEffects: {
      id: String(statusEffectsPayload?.id ?? '').trim(),
      target: String(statusEffectsPayload?.target ?? '').trim(),
      durationMs: Math.max(0, Math.round(Number(statusEffectsPayload?.durationMs ?? 0))),
      tickMs: Math.max(0, Math.round(Number(statusEffectsPayload?.tickMs ?? 0))),
      hasStatusEffect: Boolean(statusEffectsPayload?.hasStatusEffect),
      mode: String(statusEffectsPayload?.mode ?? '').trim(),
      offsetX: Math.round(Number(statusEffectsPayload?.offsetX ?? 0)),
      offsetY: Math.round(Number(statusEffectsPayload?.offsetY ?? 0)),
      effectStartAtMs: Number.isFinite(Number(statusEffectsPayload?.effectStartAtMs))
        ? Math.round(Number(statusEffectsPayload?.effectStartAtMs))
        : 0,
      effectEndAtMs: Number.isFinite(Number(statusEffectsPayload?.effectEndAtMs))
        ? Math.round(Number(statusEffectsPayload?.effectEndAtMs))
        : 0,
      success: typeof statusEffectsPayload?.success === 'boolean'
        ? statusEffectsPayload.success
        : (typeof resultSuccess === 'boolean' ? resultSuccess : null),
      casterFeedbackText: String(statusEffectsPayload?.casterFeedbackText ?? '').trim(),
      targetVisualKey: String(statusEffectsPayload?.targetVisualKey ?? '').trim(),
      endVisualKey: String(statusEffectsPayload?.endVisualKey ?? '').trim(),
      failReason: String(statusEffectsPayload?.failReason ?? resultPayload?.failReason ?? '').trim()
    },
    effectTimeline: {
      effectStartAtMs: Number.isFinite(Number(effectTimelinePayload?.effectStartAtMs))
        ? Math.round(Number(effectTimelinePayload?.effectStartAtMs))
        : 0,
      durationMs: Math.max(0, Math.round(Number(effectTimelinePayload?.durationMs ?? 0))),
      tickMs: Math.max(0, Math.round(Number(effectTimelinePayload?.tickMs ?? 0))),
      effectEndAtMs: Number.isFinite(Number(effectTimelinePayload?.effectEndAtMs))
        ? Math.round(Number(effectTimelinePayload?.effectEndAtMs))
        : 0
    },
    hitEvents: normalizedHitEvents,
    skillName: resolveSkillNameById(skillId),
    skillDefinition,
    resultOutcome,
    resultSuccess,
    resultFailReason,
    castResult: {
      success: typeof resultSuccess === 'boolean' ? resultSuccess : true,
      failReason: resultFailReason,
      outcome: String(castResultPayload?.outcome ?? resultOutcome ?? '').trim() || (typeof resultSuccess === 'boolean' && resultSuccess ? 'success' : 'failed')
    },
    lifecycle: {
      castFeedback: {
        success: String(lifecyclePayload?.castFeedback?.success ?? skillDefinition?.lifecycle?.castFeedback?.success ?? '').trim() || '技能施放成功',
        failed: String(lifecyclePayload?.castFeedback?.failed ?? skillDefinition?.lifecycle?.castFeedback?.failed ?? '').trim() || '技能施放失敗'
      },
      castStartAnimation: String(lifecyclePayload?.castStartAnimation ?? skillDefinition?.lifecycle?.castStartAnimation ?? '').trim(),
      effectStart: String(lifecyclePayload?.effectStart ?? skillDefinition?.lifecycle?.effectStart ?? '').trim(),
      effectEnd: String(lifecyclePayload?.effectEnd ?? skillDefinition?.lifecycle?.effectEnd ?? '').trim(),
      castEndAnimation: String(lifecyclePayload?.castEndAnimation ?? skillDefinition?.lifecycle?.castEndAnimation ?? '').trim(),
      pvpSyncMode: String(lifecyclePayload?.pvpSyncMode ?? skillDefinition?.lifecycle?.pvpSyncMode ?? skillDefinition?.pvpSyncMode ?? '').trim()
    },
    resultStatusEffect: {
      id: String(resultStatusEffectPayload?.id ?? '').trim(),
      success: typeof resultStatusEffectPayload?.success === 'boolean'
        ? resultStatusEffectPayload.success
        : (typeof resultSuccess === 'boolean' ? resultSuccess : null),
      offsetX: Math.round(Number(resultStatusEffectPayload?.offsetX ?? 0)),
      offsetY: Math.round(Number(resultStatusEffectPayload?.offsetY ?? 0)),
      durationMs: Math.max(0, Math.round(Number(resultStatusEffectPayload?.durationMs ?? 0))),
      effectStartAtMs: Number.isFinite(Number(resultStatusEffectPayload?.effectStartAtMs))
        ? Math.round(Number(resultStatusEffectPayload?.effectStartAtMs))
        : 0,
      effectEndAtMs: Number.isFinite(Number(resultStatusEffectPayload?.effectEndAtMs))
        ? Math.round(Number(resultStatusEffectPayload?.effectEndAtMs))
        : 0,
      mode: String(resultStatusEffectPayload?.mode ?? '').trim(),
      casterFeedbackText: String(resultStatusEffectPayload?.casterFeedbackText ?? '').trim(),
      targetVisualKey: String(resultStatusEffectPayload?.targetVisualKey ?? '').trim(),
      endVisualKey: String(resultStatusEffectPayload?.endVisualKey ?? '').trim(),
      failReason: String(resultStatusEffectPayload?.failReason ?? '').trim()
    }
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
  if (Array.isArray(cast.hitEvents) && cast.hitEvents.length > 0) return;
  if (appliedSkillCastDamageIds.has(cast.castId)) return;
  appliedSkillCastDamageIds.add(cast.castId);
  const effectType = resolveSkillEffectType(cast.skillDefinition);
  if (effectType === 'heal') {
    const actualHeal = Math.max(0, Math.round(Number(cast?.resultHeal?.actualHeal ?? cast?.result?.heal?.actualHeal ?? 0)));
    const hpAfter = Math.max(0, Math.round(Number(cast?.resultHeal?.hpAfter ?? cast?.result?.heal?.hpAfter ?? 0)));
    if (actualHeal > 0) {
      if (cast.localRole === 'caster' || cast.localRole === 'target') {
        playerHp.value = hpAfter;
      } else if (cast.localRole === 'opponent') {
        opponentHp.value = hpAfter;
      }
    }
    skillVisualEngine.playHit({
      skill: cast.skillDefinition,
      cast,
      hitEvent: {
        hitIndex: 1,
        heal: actualHeal,
        actualHeal,
        hpAfter
      },
      role: cast.localRole
    });
    console.info(`[PvP Sync] skill_cast 套用權威回血 castId=${cast.castId} role=${cast.localRole} reason=${reason} heal=${actualHeal} hpAfter=${hpAfter}`);
    return;
  }
  if (effectType === 'visual_disrupt') {
    console.info(`[PvP Sync] skill_cast 套用權威視覺干擾 castId=${cast.castId} role=${cast.localRole} reason=${reason} success=${String(cast.resultSuccess)}`);
    return;
  }
  const damage = Math.max(0, Number(cast.resultDamage ?? 0));
  console.info(`[PvP Sync] skill_cast 套用權威傷害 castId=${cast.castId} role=${cast.localRole} reason=${reason} damage=${damage}`);
  if (damage <= 0) return;
  if (cast.localRole === 'caster') {
    applyOpponentDamage(damage);
    return;
  }
  if (cast.localRole === 'target') {
    applyRemoteDamage(damage);
    return;
  }
  if (cast.localRole === 'opponent') {
    const hpBefore = Math.max(0, Math.round(Number(opponentHp.value ?? 0)));
    const hpAfter = Math.max(0, hpBefore - damage);
    opponentHp.value = hpAfter;
  }
}

function applySkillCastHitEvent(cast = null, hitEvent = null, reason = 'scheduled') {
  if (!cast || typeof cast !== 'object') return;
  if (!hitEvent || typeof hitEvent !== 'object') return;
  const hitIndex = Math.max(1, Math.round(Number(hitEvent.hitIndex ?? 1)));
  const dedupeId = `${cast.castId}:${hitIndex}`;
  if (appliedSkillCastHitEventIds.has(dedupeId)) return;
  appliedSkillCastHitEventIds.add(dedupeId);

  const damage = Math.max(0, Math.round(Number(hitEvent.damage ?? 0)));
  const heal = Math.max(0, Math.round(Number(hitEvent.heal ?? hitEvent.actualHeal ?? 0)));
  const hpAfter = Math.max(0, Math.round(Number(hitEvent.hpAfter ?? 0)));
  const hpBefore = Math.max(0, Math.round(Number(hitEvent.hpBefore ?? hpAfter + damage)));
  const effectType = resolveSkillEffectType(cast.skillDefinition);
  const isHeal = effectType === 'heal' || heal > 0;

  if (cast.localRole === 'caster' || cast.localRole === 'target') {
    if (isHeal) {
      playerHp.value = hpAfter;
    } else if (cast.localRole === 'caster') {
      opponentHp.value = hpAfter;
    } else {
      playerHp.value = hpAfter;
    }
  } else if (cast.localRole === 'opponent') {
    opponentHp.value = hpAfter;
  }

  skillVisualEngine.playHit({
    skill: cast.skillDefinition,
    cast,
    hitEvent: {
      ...hitEvent,
      heal,
      actualHeal: heal
    },
    role: cast.localRole
  });

  if (!isHeal && hpAfter <= 0) {
    cast.pendingBattleEnd = true;
  }

  console.info(`[PvP Sync] skill_cast hit castId=${cast.castId} hitIndex=${hitIndex} damage=${damage} heal=${heal} hpBefore=${hpBefore} hpAfter=${hpAfter} role=${cast.localRole} reason=${reason}`);
}

function scheduleSkillCastHitEvents(cast = null) {
  if (!cast || typeof cast !== 'object') return;
  const hitEvents = Array.isArray(cast.hitEvents) ? cast.hitEvents : [];
  if (hitEvents.length <= 0) return;
  const nowMs = Date.now();

  hitEvents.forEach((hitEvent) => {
    const offsetMs = Number(hitEvent?.offsetMs);
    const atMs = Number(hitEvent?.atMs);
    let delayMs = Number.isFinite(offsetMs)
      ? Math.max(0, Math.round(offsetMs))
      : (Number.isFinite(atMs) ? Math.max(0, Math.round(atMs - nowMs)) : 0);
    delayMs = Math.min(Math.max(0, delayMs), Math.max(0, Math.round(Number(cast.pauseDurationMs ?? 0))));
    const timerId = setTimeout(() => {
      skillCastHitTimers.delete(timerId);
      applySkillCastHitEvent(cast, hitEvent, 'hit_event_timer');
    }, delayMs);
    skillCastHitTimers.add(timerId);
  });
}

async function playSkillAnimation(cast = null) {
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

  const isLocalCaster = cast.localRole === 'caster';
  await playSkillCinematic({
    skillName: cast.skillName,
    isEnemyTurn: !isLocalCaster,
    casterSide: isLocalCaster ? 'local-player' : 'opponent'
  });
}

async function clearSkillAnimation(reason = 'unknown', cast = null) {
  const animation = activeSkillAnimation.value;
  const role = cast?.localRole ?? animation?.role ?? '';
  if (role === 'caster') {
    await finishSkillCinematic({ casterSide: 'local-player' });
  }
  if (!animation) return;
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
  nextCast.pendingBattleEnd = false;
  const castResultSummary = resolveCastResultForLifecycle(nextCast);
  emitSkillLifecycleStage('cast_result', nextCast, {
    source: 'authoritative_cast',
    outcome: castResultSummary.outcome || 'unknown',
    failReason: castResultSummary.failReason || ''
  });
  emitSkillLifecycleStage('cast_feedback', nextCast, {
    source: 'caster_feedback',
    outcome: castResultSummary.outcome || 'unknown'
  });
  showLifecycleCastFeedback(nextCast);

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
  emitSkillLifecycleStage('cast_start_animation', nextCast, {
    source: 'skill_cast_start'
  });
  void playSkillAnimation(nextCast);
  emitSkillLifecycleStage('apply_effect', nextCast, {
    source: 'skill_effect_apply',
    effectType: resolveSkillEffectType(nextCast.skillDefinition),
    hasHitEvents: Array.isArray(nextCast.hitEvents) && nextCast.hitEvents.length > 0
  });
  const statusEffectApplied = Boolean(statusEffectEngine?.applySkillCastStatusEffect?.(nextCast));
  const castEffectDurationMs = resolveCastEffectDurationMs(nextCast);
  emitSkillLifecycleStage('effect_duration', nextCast, {
    source: statusEffectApplied ? 'status_effect_apply' : 'effect_duration_default',
    durationMs: castEffectDurationMs
  });

  clearSkillCastSyncTimers();
  const nowMs = Date.now();
  const pauseDurationMs = Math.max(800, Number(nextCast.pauseDurationMs ?? 0));
  const hasHitEvents = Array.isArray(nextCast.hitEvents) && nextCast.hitEvents.length > 0;
  const resolveDelay = Number.isFinite(Number(nextCast.resolveAtMs))
    ? Math.max(0, Math.min(pauseDurationMs, Number(nextCast.resolveAtMs) - nowMs))
    : Math.max(120, Math.min(pauseDurationMs - 80, Math.round(pauseDurationMs * 0.62)));
  const resumeDelay = Math.max(resolveDelay + 50, pauseDurationMs);

  if (hasHitEvents) {
    scheduleSkillCastHitEvents(nextCast);
  } else {
    skillCastResolveTimer = setTimeout(() => {
      skillCastResolveTimer = null;
      applySkillCastAuthoritativeDamage(nextCast, 'resolve_at_ms');
    }, resolveDelay);
  }

  skillCastResumeTimer = setTimeout(() => {
    skillCastResumeTimer = null;
    if (hasHitEvents) {
      nextCast.hitEvents.forEach((hitEvent) => {
        applySkillCastHitEvent(nextCast, hitEvent, 'resume_flush');
      });
    } else {
      applySkillCastAuthoritativeDamage(nextCast, 'resume_fallback');
    }
    if (nextCast.localRole === 'caster') {
      markPlayerSkillCooldownPending(nextCast.skillId, false);
      applyPlayerSkillCooldown(nextCast.skillDefinition);
    }
    const hasActiveStatusEffect = Boolean(statusEffectEngine?.hasActiveEffectForCast?.(nextCast.castId));
    if (!hasActiveStatusEffect) {
      emitSkillLifecycleStage('effect_end', nextCast, {
        source: 'cast_resume',
        reason: 'effect_finished_or_none'
      });
    }
    emitSkillLifecycleStage('cast_end_animation', nextCast, {
      source: 'skill_cast_resume'
    });
    void clearSkillAnimation('skill_cast_resume', nextCast);

    const shouldEndBattleAfterCast = Boolean(nextCast.pendingBattleEnd);
    emitSkillLifecycleStage('battle_end_check', nextCast, {
      source: 'resume_check',
      pendingBattleEnd: shouldEndBattleAfterCast
    });
    if (shouldEndBattleAfterCast && isCurrentPlayerMatchHost()) {
      broadcastHostBattleEndNow('skill_cast_pending_end');
    }
    if (!shouldEndBattleAfterCast && gameState.value !== 'gameResult' && gameState.value !== 'finishing') {
      gameState.value = 'playing';
    }
    setPaused(false);
    emitSkillLifecycleStage('resume_battle', nextCast, {
      source: 'skill_cast_resume'
    });
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
  const requestedSkill = resolveSkillDefinitionById(requestedSkillId);
  const targetRule = resolveSkillTargetRule(requestedSkill);
  const targetPlayerId = targetRule === 'self'
    ? requesterId
    : (requesterId === localPlayerId ? opponentPlayerId : localPlayerId);
  const requestCastId = String(payload?.requestCastId ?? '').trim();
  emitSkillLifecycleStage('cast_request', {
    castId: requestCastId,
    skillId: requestedSkillId,
    casterPlayerId: requesterId,
    targetPlayerId,
    localRole: requesterId === localPlayerId ? 'caster' : 'target',
    castResult: {
      success: true,
      outcome: 'requested',
      failReason: ''
    }
  }, {
    source: 'remote_request'
  });
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
  statusEffectEngine?.reset?.('reset_pvp_ready_state');
  rootFogOverlayVisible.value = false;
  rootFogOverlayPhase.value = 'pre';
  rootFogTimeline.durationMs = PVP_FOG_TRANSITION_MS;
  rootFogTimeline.thinEndMs = 500;
  rootFogTimeline.buildEndMs = 1300;
  rootFogTimeline.holdEndMs = PVP_FOG_TRANSITION_MS;
  matchmakingStatus.localReady = false;
  matchmakingStatus.opponentReady = false;
  matchmakingStatus.startPending = false;
  matchmakingStatus.startAtMs = 0;
  matchmakingStatus.fogPending = false;
  matchmakingStatus.fogEndAtMs = 0;
  battleEndBroadcasted = false;
  lastPvpBattleSeed = '';
}

function refreshPvpReadyMessage() {
  if (matchmakingStatus.phase !== 'matched') return;
  if (matchmakingStatus.fogPending) {
    matchmakingStatus.message = '雙方已準備，正在進入對戰...';
    return;
  }
  if (matchmakingStatus.startPending) {
    const startAt = Number(matchmakingStatus.startAtMs);
    if (Number.isFinite(startAt) && startAt > 0) {
      const remainMs = startAt - Date.now();
      matchmakingStatus.message = remainMs > 0
        ? '雙方已準備，開戰倒數中...'
        : '雙方已準備，正在進入對戰...';
      return;
    }
    matchmakingStatus.message = '雙方已準備，等待主機同步開戰時間...';
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

async function logRootCountdownOverlayMetrics() {
  await nextTick();
  const overlayEl = rootCountdownOverlayRef.value;
  const mountedAtRoot = Boolean(overlayEl && overlayEl.parentElement === document.body);
  if (mountedAtRoot) {
    console.info('[PvP Sync] CountdownOverlay mounted at root');
  } else {
    const parentTag = overlayEl?.parentElement?.tagName ?? 'unknown';
    console.warn(`[PvP Sync] CountdownOverlay not mounted at root parent=${parentTag}`);
  }
  console.info(`[PvP Sync] CountdownOverlay viewport size = ${window.innerWidth}/${window.innerHeight}`);
  if (overlayEl) {
    const rect = overlayEl.getBoundingClientRect();
    console.info(`[PvP Sync] CountdownOverlay rect = ${Math.round(rect.width)}x${Math.round(rect.height)}`);
  }
}

async function logRootFogOverlayMetrics() {
  await nextTick();
  const overlayEl = rootFogOverlayRef.value;
  const mountedAtRoot = Boolean(overlayEl && overlayEl.parentElement === document.body);
  if (mountedAtRoot) {
    console.info('[PvP Sync] FogOverlay mounted at root');
  } else {
    const parentTag = overlayEl?.parentElement?.tagName ?? 'unknown';
    console.warn(`[PvP Sync] FogOverlay not mounted at root parent=${parentTag}`);
  }
  console.info(`[PvP Sync] FogOverlay viewport size = ${window.innerWidth}/${window.innerHeight}`);
  if (overlayEl) {
    const rect = overlayEl.getBoundingClientRect();
    console.info(`[PvP Sync] FogOverlay rect = ${Math.round(rect.width)}x${Math.round(rect.height)}`);
  }
}

function scheduleRootFogPhaseTimer(delayMs = 0, callback = null) {
  const safeDelay = Math.max(0, Math.round(Number(delayMs) || 0));
  const timerId = setTimeout(() => {
    rootFogPhaseTimers.delete(timerId);
    if (typeof callback === 'function') {
      callback();
    }
  }, safeDelay);
  rootFogPhaseTimers.add(timerId);
}

function resolveFogTimeline(durationMs = PVP_FOG_TRANSITION_MS) {
  const totalMs = Math.max(1500, Math.min(2200, Math.round(Number(durationMs) || PVP_FOG_TRANSITION_MS)));
  const thinEndMs = Math.max(420, Math.min(520, Math.round(totalMs * 0.28)));
  const buildEndRaw = Math.round(totalMs * 0.72);
  const buildEndMs = Math.max(thinEndMs + 500, Math.min(1300, Math.min(totalMs - 320, buildEndRaw)));
  const holdEndMs = totalMs;
  return {
    totalMs,
    thinEndMs,
    buildEndMs,
    holdEndMs
  };
}

function beginPvpFogTransition(fogStartAtMs = Date.now(), options = {}) {
  if (currentScreen.value === 'battle' && battleSessionMode.value === 'pvp') return;
  const fogDurationRaw = Number(options?.fogDurationMs ?? PVP_FOG_TRANSITION_MS);
  const timeline = resolveFogTimeline(fogDurationRaw);
  const fogDurationMs = timeline.totalMs;
  const normalizedFogStartAt = Number.isFinite(Number(fogStartAtMs))
    ? Number(fogStartAtMs)
    : Date.now();
  const nowMs = Date.now();
  const suggestedBattleAt = Math.max(nowMs, normalizedFogStartAt + fogDurationMs);
  const battleAt = Math.max(suggestedBattleAt, nowMs + fogDurationMs);
  const delay = Math.max(fogDurationMs, battleAt - nowMs);
  clearPendingPvpStartTimer();
  rootFogTimeline.durationMs = fogDurationMs;
  rootFogTimeline.thinEndMs = timeline.thinEndMs;
  rootFogTimeline.buildEndMs = timeline.buildEndMs;
  rootFogTimeline.holdEndMs = timeline.holdEndMs;
  rootFogOverlayVisible.value = true;
  rootFogOverlayPhase.value = 'pre';
  matchmakingStatus.fogPending = true;
  matchmakingStatus.fogEndAtMs = battleAt;
  refreshPvpReadyMessage();
  console.info(`[PvP Sync] 霧化轉場啟動 fogDuration=${fogDurationMs}ms battleDelay=${delay}ms thinEnd=${timeline.thinEndMs} buildEnd=${timeline.buildEndMs}`);
  scheduleRootFogPhaseTimer(0, () => {
    rootFogOverlayPhase.value = 'thin';
    console.info('[PvP Sync] fog phase=thin');
  });
  scheduleRootFogPhaseTimer(timeline.thinEndMs, () => {
    rootFogOverlayPhase.value = 'build';
    console.info('[PvP Sync] fog phase=build');
  });
  scheduleRootFogPhaseTimer(timeline.buildEndMs, () => {
    rootFogOverlayPhase.value = 'hold';
    console.info('[PvP Sync] fog phase=hold');
    console.info('[PvP Sync] fog reached full density');
  });
  if (delay === 0) {
    console.info('[PvP Sync] now enterPvpBattle');
    startPvpBattle();
    return;
  }
  pendingPvpFogTimer = setTimeout(() => {
    pendingPvpFogTimer = null;
    console.info('[PvP Sync] now enterPvpBattle');
    startPvpBattle();
  }, delay);
}

function startPreBattleCountdown({
  startAt = Date.now(),
  fogDurationMs = PVP_FOG_TRANSITION_MS,
  seed = '',
  source = 'unknown'
} = {}) {
  if (currentScreen.value === 'battle' && battleSessionMode.value === 'pvp') return;
  clearPendingPvpStartTimer();
  const safeStartAt = Number.isFinite(Number(startAt)) ? Math.round(Number(startAt)) : 0;
  if (safeStartAt <= 0) {
    console.warn('[PvP Sync] startPreBattleCountdown 缺少有效 startAt，忽略本次倒數啟動');
    return;
  }
  if (seed) lastPvpBattleSeed = seed;

  matchmakingStatus.startPending = true;
  matchmakingStatus.fogPending = false;
  matchmakingStatus.fogEndAtMs = 0;
  const normalizedFogDurationMs = Math.max(1500, Math.min(2200, Math.round(Number(fogDurationMs) || PVP_FOG_TRANSITION_MS)));
  const nowMs = Date.now();
  const remainingMs = safeStartAt - nowMs;
  const delay = Math.max(0, Math.round(remainingMs));
  const displayNumber = Math.min(9, Math.max(1, Math.ceil(Math.max(0, remainingMs) / 1000)));

  matchmakingStatus.startAtMs = safeStartAt;
  countdownNowMs.value = nowMs;
  refreshPvpReadyMessage();
  console.info(`[PvP Sync] 排程開戰 source=${String(source)} hostStartAt=${safeStartAt} delay=${delay} fogDuration=${normalizedFogDurationMs}`);
  console.info(`[PvP Sync] countdown hostStartAt = ${safeStartAt}`);
  console.info(`[PvP Sync] countdown now = ${nowMs}`);
  console.info(`[PvP Sync] countdown remainingMs = ${Math.round(remainingMs)}`);
  console.info(`[PvP Sync] countdown displayNumber = ${displayNumber}`);

  if (delay === 0) {
    console.info('[PvP Sync] countdown complete, start fog_transition');
    beginPvpFogTransition(safeStartAt, { fogDurationMs: normalizedFogDurationMs });
    return;
  }

  pendingPvpStartTimer = setTimeout(() => {
    pendingPvpStartTimer = null;
    console.info('[PvP Sync] countdown complete, start fog_transition');
    beginPvpFogTransition(safeStartAt, { fogDurationMs: normalizedFogDurationMs });
  }, delay);
}

function checkBothReady(reason = '') {
  console.info(`[PvP Sync] checkBothReady被呼叫 reason=${reason} selfReady=${String(matchmakingStatus.localReady)} opponentReady=${String(matchmakingStatus.opponentReady)} phase=${matchmakingStatus.phase}`);
  if (matchmakingStatus.phase !== 'matched') return;
  if (!matchmakingStatus.localReady || !matchmakingStatus.opponentReady) return;
  if (matchmakingStatus.startPending) return;

  const isHost = isCurrentPlayerMatchHost();
  console.info(`[PvP Sync] isHost狀態: ${isHost ? 'host' : 'guest'}`);
  if (!isHost) {
    refreshPvpReadyMessage();
    return;
  }

  const seed = generatePvpBattleSeed();
  lastPvpBattleSeed = seed;
  const startAt = Date.now() + PVP_READY_COUNTDOWN_MS + PVP_START_GUARD_MS;
  console.info(`[PvP Sync] host送出start_battle seed=${seed}`);
  void sendPvpRealtimeEvent('start_battle', {
    mode: 'pvp',
    seed,
    startAt,
    fogDurationMs: PVP_FOG_TRANSITION_MS
  });
  startPreBattleCountdown({
    source: 'host_local',
    startAt,
    fogDurationMs: PVP_FOG_TRANSITION_MS,
    seed
  });
}

function markLocalPlayerReady() {
  if (matchmakingStatus.phase !== 'matched') return;
  if (matchmakingStatus.startPending) return;
  const nextReady = !matchmakingStatus.localReady;
  matchmakingStatus.localReady = nextReady;
  refreshPvpReadyMessage();
  console.info(`[PvP Sync] 本機${nextReady ? '送出ready' : '取消ready'}`);
  void sendPvpRealtimeEvent('ready', { ready: nextReady });
  if (!nextReady) return;
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

function broadcastHostBattleEndNow(reason = 'skill_cast_complete') {
  if (!isCurrentBattlePvP.value) return;
  if (!isCurrentPlayerMatchHost()) return;
  if (battleEndBroadcasted) return;

  const hostPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
  const guestPlayerId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  const battleEndId = `battle-end-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  battleEndBroadcasted = true;
  console.info(`[PvP Sync] host立即送出battle_end battleEndId=${battleEndId} reason=${reason}`);
  void sendPvpRealtimeEvent('battle_end', {
    battleEndId,
    hostPlayerId,
    guestPlayerId,
    hostHp: Math.max(0, Math.round(Number(playerHp.value ?? 0))),
    guestHp: Math.max(0, Math.round(Number(opponentHp.value ?? 0))),
    endedAtMs: Date.now()
  });

  if (gameState.value !== 'gameResult') {
    gameState.value = 'gameResult';
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
  const targetRule = resolveSkillTargetRule(resolvedSkill);
  const targetPlayerIdForCast = targetRule === 'self' ? localPlayerId : opponentPlayerId;
  const requestCastId = `cast-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  emitSkillLifecycleStage('cast_request', {
    castId: requestCastId,
    skillId: resolvedSkill.id,
    casterPlayerId: localPlayerId,
    targetPlayerId: targetPlayerIdForCast,
    localRole: 'caster',
    castResult: {
      success: true,
      outcome: 'requested',
      failReason: ''
    }
  }, {
    source: isCurrentPlayerMatchHost() ? 'local_host' : 'local_guest',
    battleRemainingMsAtRequest: Math.max(0, Math.round(Number(timeLeft.value ?? 0) * 1000))
  });

  if (isCurrentPlayerMatchHost()) {
    const castPayload = buildHostAuthoritativeSkillCastPayload({
      skillId: resolvedSkill.id,
      casterPlayerId: localPlayerId,
      targetPlayerId: targetPlayerIdForCast,
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
    if (matchmakingStatus.startPending && !isReady) {
      console.info('[PvP Sync] 倒數已開始，忽略對手取消ready');
      return;
    }
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
    const fogDurationMs = Number(normalizedPacket?.payload?.fogDurationMs ?? PVP_FOG_TRANSITION_MS);
    const seed = String(normalizedPacket?.payload?.seed ?? '').trim();
    if (!Number.isFinite(startAt) || startAt <= 0) {
      console.warn('[PvP Sync] 收到start_battle但缺少有效startAt，忽略本次啟動');
      return;
    }
    console.info(`[PvP Sync] 收到start_battle，進入PvP seed=${seed || 'none'}`);
    startPreBattleCountdown({
      source: 'remote_packet',
      startAt,
      fogDurationMs,
      seed
    });
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
    appliedSkillCastDamageIds.clear();
    appliedSkillCastHitEventIds.clear();
    const castToClear = activeSkillCast;
    activeSkillCast = null;
    awaitingLocalSkillCastAck = false;
    statusEffectEngine?.reset?.('battle_end_packet');
    void clearSkillAnimation('battle_end', castToClear);
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
    statusEffectEngine?.reset?.('forfeit_packet');
    resetSkillCastSyncState();
    forceOpponentDefeat();
  }
}

watch(
  isRootCountdownOverlayVisible,
  (visible) => {
    countdownNowMs.value = Date.now();
    if (visible) {
      ensureRootCountdownTimer();
      lastLoggedCountdownTick = null;
      console.info('[PvP Sync] countdown animation start');
      void logRootCountdownOverlayMetrics();
      const startAt = Number(matchmakingStatus.startAtMs);
      const nowMs = Date.now();
      const remainingMs = startAt - nowMs;
      const displayNumber = Math.min(9, Math.max(1, Math.ceil(Math.max(0, remainingMs) / 1000)));
      console.info(`[PvP Sync] countdown hostStartAt = ${Math.round(startAt)}`);
      console.info(`[PvP Sync] countdown now = ${nowMs}`);
      console.info(`[PvP Sync] countdown remainingMs = ${Math.round(remainingMs)}`);
      console.info(`[PvP Sync] countdown displayNumber = ${displayNumber}`);
      console.info(`[PvP Sync] countdown tick = ${displayNumber}`);
      lastLoggedCountdownTick = displayNumber;
      return;
    }
    clearRootCountdownTimer();
    lastLoggedCountdownTick = null;
  },
  { flush: 'post' }
);

watch(
  rootCountdownNumber,
  (tick) => {
    if (!isRootCountdownOverlayVisible.value) return;
    if (tick === lastLoggedCountdownTick) return;
    const startAt = Number(matchmakingStatus.startAtMs);
    const nowMs = Date.now();
    const remainingMs = startAt - nowMs;
    const displayNumber = Math.min(9, Math.max(1, Math.ceil(Math.max(0, remainingMs) / 1000)));
    console.info(`[PvP Sync] countdown hostStartAt = ${Math.round(startAt)}`);
    console.info(`[PvP Sync] countdown now = ${nowMs}`);
    console.info(`[PvP Sync] countdown remainingMs = ${Math.round(remainingMs)}`);
    console.info(`[PvP Sync] countdown displayNumber = ${displayNumber}`);
    console.info(`[PvP Sync] countdown tick = ${tick}`);
    lastLoggedCountdownTick = tick;
  }
);

watch(
  isRootFogOverlayVisible,
  (visible, prevVisible) => {
    if (visible) {
      console.info('[PvP Sync] fog_transition start');
      void logRootFogOverlayMetrics();
      return;
    }
    if (prevVisible) {
      console.info('[PvP Sync] fog_transition complete');
    }
  },
  { flush: 'post' }
);

watch(
  timeLeft,
  (value) => {
    if (!isCurrentBattlePvP.value) return;
    if (currentScreen.value !== 'battle') return;
    const remainingMs = Math.max(0, Math.round(Number(value ?? 0) * 1000));
    statusEffectEngine?.syncBattleRemainingMs?.(remainingMs);
  }
);

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
  statusEffectEngine?.reset?.('forfeit_exit');
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
  clearRootCountdownTimer();
  statusEffectEngine?.reset?.('app_unmount');
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
  statusEffectEngine?.reset?.('start_pve_battle');
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
  statusEffectEngine?.reset?.('start_pvp_battle');
  resetSkillCastSyncState();
  battleEndBroadcasted = false;
  matchmakingStatus.startPending = false;
  matchmakingStatus.startAtMs = 0;
  matchmakingStatus.fogPending = false;
  matchmakingStatus.fogEndAtMs = 0;
  console.info(`[PvP Sync] 進入PvP戰鬥流程 seed=${lastPvpBattleSeed || 'none'}`);
  battleSessionMode.value = 'pvp';
  selectedStageId.value = STAGE_IDS.STAGE_02;
  resetTutorialState();
  currentScreen.value = 'battle';
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  setPaused(false);
  initGame();
  void nextTick().then(() => {
    if (!rootFogOverlayVisible.value) return;
    console.info('[PvP Sync] fog fade out after battle mounted');
    rootFogOverlayPhase.value = 'fade-out';
    pendingRootFogFadeOutTimer = setTimeout(() => {
      pendingRootFogFadeOutTimer = null;
      rootFogOverlayVisible.value = false;
      rootFogOverlayPhase.value = 'pre';
    }, 320);
  });
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
  statusEffectEngine?.reset?.('go_stage_select_from_result');
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
  statusEffectEngine?.reset?.('go_matchmaking_from_result');
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
  statusEffectEngine?.reset?.('return_home');
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
