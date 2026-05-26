<template>
  <main
    id="app-shell"
    :class="{ 'is-finishing': currentScreen === 'battle' && gameState === 'finishing' }"
  >
    <IntroOpeningScreen
      v-if="currentScreen === 'introOpening'"
      @skip="enterIntroStartScreenFromOpening"
      @complete="enterIntroStartScreenFromOpening"
    />

    <IntroStartScreen
      v-else-if="currentScreen === 'introStart'"
      @start="enterHomeFromIntroStart"
    />

    <HomeScreen
      v-else-if="currentScreen === 'home'"
      :is-skill-loadout-unlocked="isSkillLoadoutUnlocked"
      @open-battle-mode="openBattleMode"
      @open-study="openStudy"
      @open-settings="openSettings"
      @open-character-select="openCharacterSelect"
      @open-skill-loadout="openSkillLoadout"
      @open-leaderboard="openLeaderboard"
    />

    <BattleModeScreen
      v-else-if="currentScreen === 'battleMode'"
      @back-home="goHomeFromBattleMode"
      @open-stage-select="openStageSelect"
      @open-matchmaking="openMatchmaking"
    />

    <StageSelectScreen
      v-else-if="currentScreen === 'stageSelect'"
      :stages="visibleStageList"
      :selected-stage-id="selectedStageId"
      :unlocked-stage-ids="unlockedStageIds"
      @back-home="goHomeFromStageSelect"
      @select-stage="handleSelectStageAndStart"
    />

    <MatchmakingScreen
      v-else-if="currentScreen === 'matchmaking'"
      :status="matchmakingStatus"
      :capabilities="matchCapabilities"
      :game-center-status="gameCenterStatus"
      :game-center-session="gameCenterSession"
      @back-home="goHomeFromMatchmaking"
      @open-settings="goSettingsFromMatchmaking"
      @start-match="startPvPMatchmaking"
      @cancel-match="cancelPvPMatchmaking"
      @ready-battle="markLocalPlayerReady"
    />

    <PvpBattleView
      v-else-if="currentScreen === 'battle'"
      :should-show-battle-menu-trigger="shouldShowBattleMenuTrigger"
      :selected-character="selectedCharacter"
      :is-enemy-turn="isEnemyTurn"
      :cutscene-skill-name="cutsceneSkillName"
      :active-skill-animation="activeSkillAnimation"
      :game-state="gameState"
      :is-splitting="isSplitting"
      :target-transform="targetTransform"
      :reticle-offset-transform="reticleOffsetTransform"
      :announcement-text="announcementText"
      :battle-hud-player-name="battleHudPlayerName"
      :battle-hud-opponent-name="battleHudOpponentName"
      :player-max-hp="playerMaxHp"
      :opponent-max-hp="opponentMaxHp"
      :player-hp="playerHp"
      :opponent-hp="opponentHp"
      :opponent-round-hits="opponentRoundHits"
      :combo="combo"
      :time-left="timeLeft"
      :skill-points="skillPoints"
      :player-skill-cooldowns="playerSkillCooldowns"
      :player-skill-cooldown-pending="playerSkillCooldownPending"
      :selected-skills="selectedSkills"
      :hide-skill-hud="shouldHideSkillHud"
      :disable-skill-buttons="shouldLockStage02TutorialSkills"
      :player-debuff="playerDebuff"
      :is-tutorial-untimed="isTutorialUntimed"
      :is-tutorial-guide-active="isTutorialGuideActive"
      :is-pre-battle-dialogue-active="isPreBattleDialogueActive"
      :pre-battle-dialogue-meta="currentPreBattleDialogueMeta"
      :is-battle-menu-open="isBattleMenuOpen"
      :current-story-step-meta="currentStoryStepMeta"
      :tutorial-hit-progress="tutorialHitProgress"
      :tutorial-state-required-hits="tutorialState.requiredHits"
      :tutorial-focus-rect="tutorialFocusRect"
      :should-render-battle-result-layer="shouldRenderBattleResultLayer"
      :current-pvp-result-outcome="currentPvpResultOutcome"
      :is-current-battle-pvp="isCurrentBattlePvP"
      :battle-menu-view="battleMenuView"
      :audio-volume="audioVolume"
      :sfx-volume="sfxVolume"
      :sfx-enabled="sfxEnabled"
      :bgm-enabled="bgmEnabled"
      :vibration-enabled="vibrationEnabled"
      @open-battle-menu="openBattleMenu"
      @use-skill="handlePlayerSkillUse"
      @advance-tutorial-step="advanceTutorialStep"
      @advance-pre-battle-dialogue="advanceStagePreBattleDialogue"
      @init-game="initGame"
      @go-stage-select-from-result="goStageSelectFromResult"
      @go-matchmaking-from-result="goMatchmakingFromResult"
      @return-to-home="returnToHome"
      @restart-battle-from-menu="restartBattleFromMenu"
      @open-menu-settings="openMenuSettings"
      @close-battle-menu="closeBattleMenu"
      @back-to-main-menu-view="backToMainMenuView"
      @set-audio-volume="setAudioVolume"
      @set-sfx-volume="setSfxVolume"
      @set-sfx-enabled="setSfxEnabled"
      @set-bgm-enabled="setBgmEnabled"
      @set-vibration-enabled="setVibrationEnabled"
    />

    <StudyTraining
      v-else-if="currentScreen === 'study'"
      :state="studyState"
      :unlocked-track-keys="unlockedTrackKeys"
      :on-settle-reward="claimKnowledgePointReward"
      @back-home="goHomeFromStudy"
      @record-answer="recordStudyAnswer"
    />

    <SettingsScreen
      v-else-if="currentScreen === 'settings'"
      :volume="audioVolume"
      :sfx-volume="sfxVolume"
      :sfx-enabled="sfxEnabled"
      :bgm-enabled="bgmEnabled"
      :vibration-enabled="vibrationEnabled"
      :game-center-status="gameCenterStatus"
      :pvp-nickname="pvpNickname"
      :game-center-session="gameCenterSession"
      @back-home="goHomeFromSettings"
      @volume-change="setAudioVolume"
      @sfx-volume-change="setSfxVolume"
      @sfx-toggle="setSfxEnabled"
      @bgm-toggle="setBgmEnabled"
      @vibration-toggle="setVibrationEnabled"
      @gamecenter-connect="connectGameCenterFromSettings"
      @gamecenter-refresh="refreshGameCenterFromSettings"
      @gamecenter-clear-local="clearLocalGameCenterBinding"
      @pvp-nickname-change="setPvpNickname"
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
import { DOJO_DAILY_CAP_POINTS } from './data/dojoQuestionBanks.js';
import { skillPool } from './data/skillPool.js';
import { stageConfigs, STAGE_IDS } from './data/stageConfigs.js';
import { getStagePreBattleDialogue } from './data/story/stagePreBattleDialogues.js';
import { buildHostAuthoritativeSkillCast, resolveSkillEffectType, resolveSkillTargetRule } from './engines/SkillEngine.js';
import { createSkillLifecycleEngine } from './engines/SkillLifecycleEngine.js';
import { createSkillVisualEngine } from './engines/SkillVisualEngine.js';
import { createStatusEffectEngine } from './engines/StatusEffectEngine.js';
import { useBattleGame } from './composables/useBattleGame.js';
import { filterSkillPoolByMode, usePveBattleFlow } from './composables/usePveBattleFlow.js';
import { usePvpBattleFlow } from './composables/usePvpBattleFlow.js';
import { useStageUnlocks } from './composables/useStageUnlocks.js';
import { useStoryFlow } from './composables/useStoryFlow.js';
import { useSwipeControls } from './composables/useSwipeControls.js';
import { drawSlashLine, showDamagePopup, showFeedbackPop, triggerImpactShake } from './utils/effects.js';
import { sfx } from './services/SoundEngine.js';
import { triggerHaptic } from './services/hapticsService.js';
import { createMatchService } from './services/match/MatchService.js';
import { appStorage } from './services/storage/preferencesStorage.js';
import {
  authenticateFirebaseAnonymous,
  claimFirebaseKnowledgePointReward,
  getFirebasePlayerKnowledge,
  getFirebasePlayerProgress,
  isFirebaseBridgeAvailable,
  saveFirebasePlayerProgress,
  upsertFirebaseUser
} from './services/firebase/playerProgressService.js';
import BattleModeScreen from './components/BattleModeScreen.vue';
import HomeScreen from './components/HomeScreen.vue';
import MatchmakingScreen from './components/MatchmakingScreen.vue';
import PvpBattleView from './components/PvpBattleView.vue';
import SettingsScreen from './components/SettingsScreen.vue';
import StudyTraining from './components/StudyTraining.vue';
import CharacterSelectScreen from './components/CharacterSelectScreen.vue';
import SkillLoadoutScreen from './components/SkillLoadoutScreen.vue';
import StageSelectScreen from './components/StageSelectScreen.vue';
import LeaderboardScreen from './components/LeaderboardScreen.vue';
import IntroOpeningScreen from './components/IntroOpeningScreen.vue';
import IntroStartScreen from './components/IntroStartScreen.vue';

const currentScreen = ref('introOpening');
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
  expectedPlayerCount: 0,
  connectedPlayerCount: 0,
  matchSessionId: '',
  matchedEnteredAtMs: 0,
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
const remotePvpDisplayNameByPlayer = new Map();
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
let pendingSkillCastPostResumeTickTrace = null;
let pvpCountdownClockOffsetMs = 0;
let pvpClockOffsetMs = 0;
let battleEndBroadcasted = false;
const activeSkillAnimation = ref(null);
const skillAnimationPlaybackByCastId = new Map();
const PVP_READY_COUNTDOWN_MS = 3200;
const PVP_START_GUARD_MS = 350;
const PVP_FOG_TRANSITION_MS = 1800;
const PVP_FALLBACK_COUNTDOWN_MS = PVP_READY_COUNTDOWN_MS + PVP_START_GUARD_MS;
const PVP_MIN_ACCEPTABLE_REMAINING_MS = 3000;
const PVP_MAX_ACCEPTABLE_REMAINING_MS = 12000;
const PVP_SESSION_SCOPED_MESSAGE_TYPES = new Set([
  'profile_sync',
  'ready',
  'prepare_battle',
  'prepare_ack',
  'battle_go',
  'start_battle',
  'battle_start',
  'skill_cast_request',
  'skill_cast',
  'damage',
  'forfeit',
  'battle_end'
]);
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
let pendingGuestSessionSyncRequestTimer = null;
const pendingSessionScopedPackets = [];
let pendingPrepareBattleState = null;
const pvpTerminal = ref(false);
const pvpBattleEnded = ref(false);
const PVP_END_FOG_DURATION_MS = 1300;
const pvpEndUiState = reactive({
  phase: 'idle',
  reason: '',
  matchSessionId: '',
  result: null,
  startedAtMs: 0,
  completedAtMs: 0
});
let pendingPvpEndFogCompleteTimer = null;
const endedMatchSessionId = ref('');
const endedMatchSessionAtMs = ref(0);
const recentEndedMatchSessionIds = new Map();
const RECENT_ENDED_SESSION_TTL_MS = 120000;

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

function playGuestSkillRequestFeedback(skillDefinition = null) {
  if (!skillDefinition || typeof skillDefinition !== 'object') return;
  const skillName = String(skillDefinition?.name ?? '').trim() || '技能';
  showFeedbackPop(`${skillName} 準備中`, '#60a5fa', window.innerWidth / 2, window.innerHeight / 2);
  if (vibrationEnabled.value) {
    triggerHaptic(8);
  }
  triggerImpactShake(Math.random() * 360, 12, 0.018);
  console.info(`[PvP Sync] guest_precast_feedback skillId=${skillDefinition.id} skillName=${skillName} localNow=${Date.now()} source=skill_cast_request`);
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
  dailyKnowledge: {
    dateKey: '',
    points: 0
  },
  tracks: {
    optometry: { level: 0, answered: 0, correct: 0 },
    optics: { level: 0, answered: 0, correct: 0 },
    contactLens: { level: 0, answered: 0, correct: 0 },
    other: { level: 0, answered: 0, correct: 0 }
  }
});
const STUDY_SAVE_KEY = 'samureye.study.v1';
const SETTINGS_SAVE_KEY = 'samureye.settings.v1';
const GAME_CENTER_SESSION_SAVE_KEY = 'samureye.gamecenter.session.v1';
const LEGACY_ACCOUNT_SAVE_KEY = 'samureye.account.v1';
const LEGACY_STORAGE_KEYS = [STUDY_SAVE_KEY, LEGACY_ACCOUNT_SAVE_KEY, SETTINGS_SAVE_KEY, GAME_CENTER_SESSION_SAVE_KEY];
const STUDY_PROFILE_SCHEMA_VERSION = 4;
const SETTINGS_SCHEMA_VERSION = 1;
const GAME_CENTER_SESSION_SCHEMA_VERSION = 1;
const FIREBASE_PROGRESS_SCHEMA_VERSION = 1;
const MAX_SKILL_SLOTS = 3;
const SKILL_DEFAULT_COST = 40;
const SKILL_DEFAULT_DAMAGE = 30;
const NO_ENEMY_SKILLS = Object.freeze(Object.assign([], { __disableFallback: true }));
const stageList = stageConfigs;
let hasMigratedStorage = false;
let hasHydratedRuntimeSettings = false;
let hasHydratedGameCenterSession = false;
let isFirebaseHydrated = false;
let gameCenterAuthPromise = null;
let isApplyingRemotePlayerProgress = false;
let remotePlayerProgressSaveTimer = null;
let remotePlayerProgressSaveInFlight = false;
let remotePlayerProgressDirty = false;
let remotePlayerProgressPendingReason = '';
const GAME_CENTER_STATUS_SET = ['checking', 'authenticated', 'unauthenticated', 'error'];
const gameCenterStatus = ref('checking');
const gameCenterBindingEnabled = ref(true);
const gameCenterSession = reactive({
  isAuthenticated: false,
  playerId: '',
  displayName: '',
  alias: '',
  gameCenterId: '',
  lastAuthenticatedAt: 0
});
const firebaseSession = reactive({
  uid: '',
  isAuthenticated: false,
  isAnonymous: false,
  lastAuthenticatedAt: 0
});
const pvpNickname = ref('');
const selectedStageId = ref(STAGE_IDS.STAGE_01);
const preBattleDialogueState = reactive({
  active: false,
  stageId: '',
  title: '',
  lines: [],
  index: 0
});
const selectablePlayerSkills = computed(() => {
  const sharedCandidates = skillPool.filter(skill => !skill.bossOnly && skill.equipable !== false);
  const pveIds = new Set(filterSkillPoolByMode(sharedCandidates, 'pve').map(skill => skill.id));
  const pvpIds = new Set(filterSkillPoolByMode(sharedCandidates, 'pvp').map(skill => skill.id));
  const enabledIds = new Set([...pveIds, ...pvpIds]);
  return sharedCandidates.filter(skill => enabledIds.has(skill.id));
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
  clearedStageIds: [],
  unlockedSkillIds: []
});
let pveEnemySkillPoolResolver = null;
let pveBattleProgressionResolver = null;

function getEnemySkillPool() {
  if (typeof pveEnemySkillPoolResolver === 'function') {
    return pveEnemySkillPoolResolver();
  }
  return NO_ENEMY_SKILLS;
}

function getBattleProgression() {
  if (typeof pveBattleProgressionResolver === 'function') {
    return pveBattleProgressionResolver();
  }
  if (battleSessionMode.value === 'pvp') {
    return getPvpBattleProgression();
  }
  return getStandardBattleProgression();
}

let storyFlow = null;
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
const isTutorialStage = computed(() => currentStageConfig.value.type === 'tutorial');
const isCurrentBattlePvP = computed(() => battleSessionMode.value === 'pvp');
const isPvpEndingFogPhase = computed(() => pvpEndUiState.phase === 'ending_fog');
const isPvpResultLockedPhase = computed(() => pvpEndUiState.phase === 'result');
const isPvpResultOrEndingPhase = computed(() => isPvpEndingFogPhase.value || isPvpResultLockedPhase.value);
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
const currentPvpResultOutcome = computed(() => {
  if (
    currentScreen.value === 'battle'
    && isCurrentBattlePvP.value
    && isPvpResultLockedPhase.value
  ) {
    const lockedOutcome = String(pvpEndUiState.result?.localOutcome ?? '').trim().toLowerCase();
    if (lockedOutcome === 'win' || lockedOutcome === 'lose' || lockedOutcome === 'draw') {
      return lockedOutcome;
    }
  }
  return currentBattleOutcome.value;
});
const shouldRenderBattleResultLayer = computed(() => {
  if (currentScreen.value !== 'battle') return false;
  if (!isCurrentBattlePvP.value) return gameState.value === 'gameResult';
  return gameState.value === 'gameResult' || isPvpResultLockedPhase.value;
});
const shouldShowBattleMenuTrigger = computed(() => {
  if (currentScreen.value !== 'battle') return false;
  if (gameState.value === 'gameResult') return false;
  if (isCurrentBattlePvP.value && isPvpResultOrEndingPhase.value) return false;
  return true;
});
const isTutorialUntimed = computed(() => isTutorialStage.value);
const isPreBattleDialogueActive = computed(() => {
  return currentScreen.value === 'battle'
    && battleSessionMode.value === 'pve'
    && Boolean(preBattleDialogueState.active)
    && Array.isArray(preBattleDialogueState.lines)
    && preBattleDialogueState.lines.length > 0;
});
const shouldHideSkillHud = computed(() => {
  const isStage02TutorialSkillLocked =
    String(selectedStageId.value ?? '').trim() === STAGE_IDS.STAGE_02_TUTORIAL
    && !stage02SkillLessonState.skillHudVisible;

  return currentScreen.value === 'battle'
    && battleSessionMode.value === 'pve'
    && (
      String(selectedStageId.value ?? '').trim() === STAGE_IDS.STAGE_01
      || String(selectedStageId.value ?? '').trim() === STAGE_IDS.STAGE_02
      || isStage02TutorialSkillLocked
    );
});
const {
  clearedStageSet,
  unlockedStageIds,
  unlockedStageSet
} = useStageUnlocks({
  stageList,
  clearedStageIds: () => stageProgress.clearedStageIds
});
const visibleStageList = computed(() => {
  return stageList.filter(stage => unlockedStageSet.value.has(stage.id));
});
const isSkillLoadoutUnlocked = computed(() => {
  return clearedStageSet.value.has(STAGE_IDS.STAGE_01);
});
const unlockedTrackKeys = computed(() => {
  return ['optometry', 'optics', 'contactLens', 'other'];
});
const currentStageConfig = computed(() => {
  return stageList.find(stage => stage.id === selectedStageId.value) ?? stageList[0];
});
const isGameCenterProvider = computed(() => matchCapabilities.provider === 'gamecenter');
const stage02SkillLessonState = reactive({
  triggered: false,
  awaitingSkillCast: false,
  completed: false,
  counterAnimating: false,
  skillHudVisible: false
});

function resetStage02SkillLessonState() {
  stage02SkillLessonState.triggered = false;
  stage02SkillLessonState.awaitingSkillCast = false;
  stage02SkillLessonState.completed = false;
  stage02SkillLessonState.counterAnimating = false;
  stage02SkillLessonState.skillHudVisible = false;
}

function isStage02TutorialBattle() {
  return battleSessionMode.value === 'pve'
    && currentScreen.value === 'battle'
    && String(selectedStageId.value ?? '').trim() === STAGE_IDS.STAGE_02_TUTORIAL;
}

const {
  getEnemySkillPool: getEnemySkillPoolFromPveFlow,
  getBattleProgression: getBattleProgressionFromPveFlow,
  openStageSelect,
  goHomeFromStageSelect,
  selectStageAndStart: selectStageAndStartPveFlow,
  startPveBattle: startPveBattleFromPveFlow
} = usePveBattleFlow({
  currentScreen,
  battleSessionMode,
  selectedStageId,
  stageList,
  currentStageConfig,
  unlockedStageSet,
  normalizedSkillPool,
  noEnemySkills: NO_ENEMY_SKILLS,
  resetPvpTerminalState,
  statusEffectEngineRef: () => statusEffectEngine,
  resetSkillCastSyncState,
  resetTutorialState,
  setBattleMenuState: (open = false, view = 'main') => {
    isBattleMenuOpen.value = Boolean(open);
    battleMenuView.value = String(view || 'main');
  },
  setPaused,
  initGame,
  onBeforeStartBattle: () => {
    battleEndBroadcasted = false;
  },
  getStandardBattleProgression,
  getPvpBattleProgression
});

pveEnemySkillPoolResolver = getEnemySkillPoolFromPveFlow;
pveBattleProgressionResolver = getBattleProgressionFromPveFlow;

const currentPreBattleDialogueLine = computed(() => {
  const index = Math.max(0, Math.floor(Number(preBattleDialogueState.index) || 0));
  const lines = Array.isArray(preBattleDialogueState.lines) ? preBattleDialogueState.lines : [];
  return lines[index] ?? { speaker: '', text: '' };
});

const isLastPreBattleDialogueLine = computed(() => {
  const lines = Array.isArray(preBattleDialogueState.lines) ? preBattleDialogueState.lines : [];
  if (lines.length <= 0) return true;
  return preBattleDialogueState.index >= (lines.length - 1);
});

const currentPreBattleDialogueStageLabel = computed(() => {
  const stageId = String(preBattleDialogueState.stageId ?? '').trim();
  const stage = stageList.find(item => item.id === stageId);
  const label = String(stage?.label ?? '').trim();
  return label || '關卡劇情';
});

const currentPreBattleDialogueMeta = computed(() => {
  if (!isPreBattleDialogueActive.value) return null;

  const speaker = String(currentPreBattleDialogueLine.value?.speaker ?? '').trim();
  const titleFromDialogue = String(preBattleDialogueState.title ?? '').trim();
  const title = speaker || titleFromDialogue || currentPreBattleDialogueStageLabel.value;
  const description = String(currentPreBattleDialogueLine.value?.text ?? '').trim();

  return {
    title,
    description,
    buttonText: isLastPreBattleDialogueLine.value ? '開始戰鬥' : '下一句',
    showNextButton: true,
    cardPosition: 'bottom',
    showFocusRect: false,
    showGestureDemo: false,
    showProgress: false
  };
});

function resetPreBattleDialogueState() {
  preBattleDialogueState.active = false;
  preBattleDialogueState.stageId = '';
  preBattleDialogueState.title = '';
  preBattleDialogueState.lines = [];
  preBattleDialogueState.index = 0;
}

function applyStagePreBattleDialogue(dialogue = null, stageId = '') {
  if (!dialogue || typeof dialogue !== 'object') {
    resetPreBattleDialogueState();
    return;
  }
  preBattleDialogueState.active = true;
  preBattleDialogueState.stageId = String(dialogue.stageId ?? stageId).trim();
  preBattleDialogueState.title = String(dialogue.title ?? '').trim();
  preBattleDialogueState.lines = Array.isArray(dialogue.lines) ? dialogue.lines : [];
  preBattleDialogueState.index = 0;
  setPaused(true);
}

function handleSelectStageAndStart(stageId = '') {
  const targetStageId = String(stageId ?? '').trim();
  if (!targetStageId) return;
  if (!stageList.some(stage => stage.id === targetStageId)) return;
  if (unlockedStageSet && !unlockedStageSet.value?.has(targetStageId)) return;

  const dialogue = getStagePreBattleDialogue(targetStageId);
  selectedStageId.value = targetStageId;
  if (dialogue) {
    startPveBattleFromPveFlow({ deferInitGame: true });
    applyStagePreBattleDialogue(dialogue, targetStageId);
    return;
  }
  selectStageAndStartPveFlow(targetStageId);
  resetPreBattleDialogueState();
}

function advanceStagePreBattleDialogue() {
  if (!preBattleDialogueState.active) return;
  if (currentScreen.value !== 'battle') return;
  if (battleSessionMode.value !== 'pve') return;

  if (!isLastPreBattleDialogueLine.value) {
    preBattleDialogueState.index += 1;
    return;
  }

  resetPreBattleDialogueState();
  setPaused(false);
  initGame();
}

const selectedSkills = computed(() => {
  const skillMap = new Map(normalizedSkillPool.value.map(skill => [skill.id, skill]));
  const filledIds = buildFilledSkillIds(playerConfig.equippedSkillIds);
  return filledIds.map(id => skillMap.get(id)).filter(Boolean);
});

function sanitizeBattleHudName(value = '', fallback = '') {
  const text = String(value ?? '').trim();
  if (text) return text;
  return String(fallback ?? '').trim();
}

const battleHudPlayerName = computed(() => {
  return sanitizeBattleHudName(resolveLocalPvpDisplayName(), 'SAMUREYE');
});

const battleHudOpponentName = computed(() => {
  if (isCurrentBattlePvP.value) {
    const opponentName = sanitizeBattleHudName(matchmakingStatus.opponentProfile?.displayName, '');
    const opponentGcName = sanitizeBattleHudName(matchmakingStatus.opponentProfile?.gameCenterDisplayName, '');
    const opponentAlias = sanitizeBattleHudName(matchmakingStatus.opponentProfile?.alias, '');
    return opponentName || opponentGcName || opponentAlias || '對手連線中';
  }

  const stageMonsterName = sanitizeBattleHudName(currentStageConfig.value?.monsterName, '');
  const stageLabelName = sanitizeBattleHudName(currentStageConfig.value?.label, '');
  return stageMonsterName || stageLabelName || '怪物';
});

storyFlow = useStoryFlow({
  currentScreen,
  isTutorialStage,
  isTutorialUntimed,
  currentStageId: computed(() => String(currentStageConfig.value?.id ?? selectedStageId.value ?? '').trim()),
  playerTotalHits,
  playerName: battleHudPlayerName,
  setPaused,
  grantSkillPoints: (nextValue = 0) => {
    skillPoints.value = Math.max(0, Math.round(Number(nextValue) || 0));
  }
});

const {
  storyState: tutorialState,
  storyFocusRect: tutorialFocusRect,
  storyHitProgress: tutorialHitProgress,
  isStoryGuideActive: isTutorialGuideActive,
  currentStoryStepMeta,
  resetStoryState: resetStoryStateInternal,
  beginStoryGuide: beginStoryGuideInternal,
  shouldAutoStartStoryGuide: shouldAutoStartTutorialGuideInternal,
  advanceStoryStep: advanceStoryStepInternal,
  tryAdvancePracticeStep,
  updateStoryFocusRectFromTarget: updateStoryFocusRectFromTargetInternal
} = storyFlow;

function getStandardBattleProgression() {
  const optometryLv = studyState.tracks.optometry.level;
  const opticsLv = studyState.tracks.optics.level;
  const contactLv = studyState.tracks.contactLens.level;

  return {
    maxHp: GAME_CONFIG.maxHp + (opticsLv * 20),
    targetHitDamage: GAME_CONFIG.targetHitDamage + optometryLv,
    skillPointGainPerHit: GAME_CONFIG.skillPointGainPerHit + contactLv
  };
}

function getPvpBattleProgression() {
  return {
    maxHp: 500,
    targetHitDamage: 10,
    skillPointGainPerHit: GAME_CONFIG.skillPointGainPerHit,
    enemyHp: 500,
    enemyDamage: 10,
    enemyAttackIntervalMs: 600,
    enemyAttackIntervalVarianceMs: 0,
    enemyMissRate: 0,
    enemyCriticalRate: 0,
    enemyCriticalMultiplier: 1,
    enemySkillCastIntervalMs: 3000,
    enemySkillCastVarianceMs: 0,
    enemySkillCastChance: 0,
    enemySkillStartDelayMs: 0
  };
}

function shouldSkipTutorialRoundIntro() {
  if (!storyFlow) return Boolean(isTutorialStage.value);
  return storyFlow.shouldSkipRoundIntro();
}

function shouldUseUntimedTutorial() {
  if (!storyFlow) return Boolean(isTutorialUntimed.value);
  return storyFlow.shouldDisableRoundTimer();
}

function getTutorialForcedTargetId() {
  if (!storyFlow) return null;
  return storyFlow.getForcedTargetId();
}

function resetTutorialState() {
  resetStage02SkillLessonState();
  if (!storyFlow) return;
  resetStoryStateInternal();
}

function isStage02SkillLessonCastStepActive() {
  return isStage02TutorialBattle()
    && stage02SkillLessonState.awaitingSkillCast
    && tutorialState.active
    && String(tutorialState.step ?? '').trim() === 'cast';
}

const shouldLockStage02TutorialSkills = computed(() => {
  if (!isStage02TutorialBattle()) return false;
  if (!stage02SkillLessonState.skillHudVisible) return false;
  return !isStage02SkillLessonCastStepActive();
});

async function activateStage02SkillLesson() {
  if (!isStage02TutorialBattle()) return;
  if (stage02SkillLessonState.triggered || stage02SkillLessonState.completed) return;
  if (stage02SkillLessonState.counterAnimating) return;
  if (gameState.value !== 'playing') return;

  stage02SkillLessonState.triggered = true;
  stage02SkillLessonState.awaitingSkillCast = false;
  stage02SkillLessonState.completed = false;
  stage02SkillLessonState.counterAnimating = true;
  stage02SkillLessonState.skillHudVisible = false;

  opponentHp.value = 40;
  setPaused(true);
  const counterSkillName = '視變體反擊';
  let lessonStarted = false;

  try {
    const cinematicAlive = await playSkillCinematic({
      skillName: counterSkillName,
      isEnemyTurn: true,
      casterSide: 'opponent'
    });
    if (!cinematicAlive || !isStage02TutorialBattle()) return;

    const currentPlayerHp = Math.max(0, Math.round(Number(playerHp.value ?? 0)));
    if (currentPlayerHp > 10) {
      applyRemoteDamage(currentPlayerHp - 10, '#f97316');
    } else if (currentPlayerHp < 10) {
      playerHp.value = 10;
    }

    const exitAlive = await finishSkillCinematic({
      casterSide: 'opponent',
      exitDurationMs: 180
    });
    if (!exitAlive || !isStage02TutorialBattle()) return;

    if (gameState.value !== 'finishing' && gameState.value !== 'gameResult') {
      gameState.value = 'playing';
      console.info('[PvE Tutorial] stage_02_tutorial counter cinematic complete, restore gameState=playing');
    }

    skillPoints.value = Math.max(100, Math.round(Number(skillPoints.value ?? 0)));
    stage02SkillLessonState.awaitingSkillCast = true;
    beginTutorialGuide();
    lessonStarted = true;
  } finally {
    stage02SkillLessonState.counterAnimating = false;
    if (!lessonStarted && isStage02TutorialBattle()) {
      stage02SkillLessonState.triggered = false;
      stage02SkillLessonState.awaitingSkillCast = false;
    }
  }
}

function beginTutorialGuide() {
  if (!storyFlow) return;
  beginStoryGuideInternal();
}

function advanceTutorialStep() {
  if (!storyFlow) return;
  const previousStep = String(tutorialState.step ?? '').trim();
  advanceStoryStepInternal();
  if (isStage02TutorialBattle()) {
    const nextStep = String(tutorialState.step ?? '').trim();
    stage02SkillLessonState.skillHudVisible = nextStep === 'skills' || nextStep === 'cast';
    if (previousStep !== nextStep) {
      console.info(`[PvE Tutorial] stage_02_tutorial step transition ${previousStep || '-'} -> ${nextStep || '-'} skillHudVisible=${String(stage02SkillLessonState.skillHudVisible)}`);
    }
  }
}

function updateTutorialFocusRectFromTarget() {
  if (!storyFlow) return Promise.resolve();
  return updateStoryFocusRectFromTargetInternal();
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

function sanitizePvpNickname(value, fallback = '') {
  const normalizedFallback = String(fallback ?? '').trim();
  const raw = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return normalizedFallback;
  const clipped = Array.from(raw).slice(0, 16).join('').trim();
  return clipped || normalizedFallback;
}

function normalizeTrack(rawTrack = {}) {
  return {
    level: Math.max(0, Math.floor(sanitizeNumber(rawTrack.level, 0))),
    answered: Math.max(0, Math.floor(sanitizeNumber(rawTrack.answered, 0))),
    correct: Math.max(0, Math.floor(sanitizeNumber(rawTrack.correct, 0)))
  };
}

function getStudyDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDailyKnowledge(rawDaily = {}, fallbackDateKey = getStudyDateKey()) {
  const data = rawDaily ?? {};
  const rawDate = String(data.dateKey ?? '').trim();
  const dateKey = rawDate || fallbackDateKey;
  const points = Math.max(0, Math.floor(sanitizeNumber(data.points, 0)));
  return {
    dateKey,
    points: Math.min(DOJO_DAILY_CAP_POINTS, points)
  };
}

function syncStudyDailyKnowledgeDate() {
  const today = getStudyDateKey();
  if (studyState.dailyKnowledge.dateKey === today) return;
  studyState.dailyKnowledge = {
    dateKey: today,
    points: 0
  };
}

function buildDefaultStudyData() {
  const today = getStudyDateKey();
  return {
    knowledgePoints: 0,
    answered: 0,
    correct: 0,
    dailyKnowledge: {
      dateKey: today,
      points: 0
    },
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
      clearedStageIds: [],
      unlockedSkillIds: []
    }
  };
}

function normalizeStudyData(rawData = {}) {
  const data = rawData ?? {};
  const tracks = data.tracks ?? {};
  const fallbackDaily =
    data.dailyKnowledge && typeof data.dailyKnowledge === 'object'
      ? data.dailyKnowledge
      : data.dailyStats;
  const rawPlayerConfig = data.playerConfig ?? {};
  const rawStageProgress = data.stageProgress ?? {};
  const dedupedSkillIds = buildFilledSkillIds(rawPlayerConfig.equippedSkillIds);
  const normalizedCharacter = characters.find(item => item.id === rawPlayerConfig.characterId)?.id ?? characters[0].id;
  const availableStageIds = new Set(stageList.map(stage => stage.id));
  const availableSkillIds = new Set(skillPool.map(skill => skill.id));
  const clearedStageIds = Array.isArray(rawStageProgress.clearedStageIds)
    ? [...new Set(rawStageProgress.clearedStageIds.filter(id => availableStageIds.has(id)))]
    : [];
  const unlockedSkillIds = Array.isArray(rawStageProgress.unlockedSkillIds)
    ? [...new Set(
      rawStageProgress.unlockedSkillIds
        .map(id => String(id ?? '').trim())
        .filter(id => availableSkillIds.has(id))
    )]
    : [];

  return {
    knowledgePoints: Math.max(0, Math.floor(sanitizeNumber(data.knowledgePoints, data.points ?? 0))),
    answered: Math.max(0, Math.floor(sanitizeNumber(data.answered, 0))),
    correct: Math.max(0, Math.floor(sanitizeNumber(data.correct, 0))),
    dailyKnowledge: normalizeDailyKnowledge(fallbackDaily, getStudyDateKey()),
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
      clearedStageIds,
      unlockedSkillIds
    }
  };
}

function applyStudyData(nextData) {
  const data = normalizeStudyData(nextData);
  studyState.knowledgePoints = data.knowledgePoints;
  studyState.answered = data.answered;
  studyState.correct = data.correct;
  studyState.dailyKnowledge = data.dailyKnowledge;
  studyState.tracks.optometry = data.tracks.optometry;
  studyState.tracks.optics = data.tracks.optics;
  studyState.tracks.contactLens = data.tracks.contactLens;
  studyState.tracks.other = data.tracks.other;
  playerConfig.characterId = data.playerConfig.characterId;
  playerConfig.equippedSkillIds = data.playerConfig.equippedSkillIds;
  stageProgress.clearedStageIds = data.stageProgress.clearedStageIds;
  stageProgress.unlockedSkillIds = data.stageProgress.unlockedSkillIds;
  syncStudyDailyKnowledgeDate();
}

function snapshotStudyData() {
  syncStudyDailyKnowledgeDate();
  return {
    knowledgePoints: studyState.knowledgePoints,
    answered: studyState.answered,
    correct: studyState.correct,
    dailyKnowledge: studyState.dailyKnowledge,
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
      clearedStageIds: stageProgress.clearedStageIds,
      unlockedSkillIds: stageProgress.unlockedSkillIds
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
    vibrationEnabled: sanitizeBoolean(data.vibrationEnabled, vibrationEnabled.value),
    pvpNickname: sanitizePvpNickname(data.pvpNickname, pvpNickname.value),
    gameCenterBindingEnabled: sanitizeBoolean(data.gameCenterBindingEnabled, true)
  };
}

function snapshotRuntimeSettings() {
  return {
    audioVolume: audioVolume.value,
    sfxVolume: sfxVolume.value,
    sfxEnabled: sfxEnabled.value,
    bgmEnabled: bgmEnabled.value,
    vibrationEnabled: vibrationEnabled.value,
    pvpNickname: sanitizePvpNickname(pvpNickname.value),
    gameCenterBindingEnabled: sanitizeBoolean(gameCenterBindingEnabled.value, true)
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

function setPvpNickname(value = '') {
  pvpNickname.value = sanitizePvpNickname(value);
  applyLocalPvpDisplayNameToMatchStatus();
  applyOpponentPvpDisplayNameToMatchStatus();
  if (matchmakingStatus.phase === 'matched' || matchmakingStatus.phase === 'searching') {
    void broadcastLocalPvpProfileSync('nickname_changed');
  }
  persistRuntimeSettingsIfReady();
}

function setGameCenterBindingEnabled(enabled, { persist = true } = {}) {
  gameCenterBindingEnabled.value = sanitizeBoolean(enabled, true);
  if (persist) {
    persistRuntimeSettingsIfReady();
  }
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
    setPvpNickname(normalized.pvpNickname);
    setGameCenterBindingEnabled(normalized.gameCenterBindingEnabled, { persist: false });
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
  if (gameCenterSession.isAuthenticated) {
    const playerId = String(gameCenterSession.playerId || gameCenterSession.gameCenterId || '').trim();
    if (playerId) return `gc:${playerId}`;
  }
  return 'guest';
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

async function saveStudyStateForActiveAccount() {
  const allProfiles = await loadAllStudyProfiles();
  const profileKey = getActiveProfileKey();
  allProfiles.profiles[profileKey] = normalizeStudyData(snapshotStudyData());
  await saveAllStudyProfiles(allProfiles);
}

function normalizeSkillIdList(rawIds = []) {
  if (!Array.isArray(rawIds)) return [];
  const ids = rawIds
    .map(id => String(id ?? '').trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

function normalizeRemoteProgressPayload(rawProgress = {}) {
  const data = rawProgress && typeof rawProgress === 'object' ? rawProgress : {};
  const stats = data.stats && typeof data.stats === 'object' ? data.stats : {};
  const stage = data.stageProgress && typeof data.stageProgress === 'object' ? data.stageProgress : {};
  const questions = data.questionProgress && typeof data.questionProgress === 'object' ? data.questionProgress : {};
  const tracksFromQuestion = questions.tracks && typeof questions.tracks === 'object' ? questions.tracks : {};
  const tracksFromStats = stats.trackLevels && typeof stats.trackLevels === 'object' ? stats.trackLevels : {};
  const trackSource = Object.keys(tracksFromQuestion).length > 0 ? tracksFromQuestion : tracksFromStats;
  const normalizedCharacter = characters.find(item => item.id === stats.characterId)?.id ?? playerConfig.characterId;
  const normalizedLevel = Math.max(0, Math.floor(sanitizeNumber(data.level, 0)));
  const normalizedSp = Math.max(0, Math.floor(sanitizeNumber(data.sp, 0)));
  const normalizedAnswered = Math.max(0, Math.floor(sanitizeNumber(questions.answered, stats.answered ?? 0)));
  const normalizedCorrect = Math.max(0, Math.floor(sanitizeNumber(questions.correct, stats.correct ?? 0)));

  return {
    level: normalizedLevel,
    sp: normalizedSp,
    learnedSkills: normalizeSkillIdList(data.learnedSkills),
    equippedSkills: buildFilledSkillIds(normalizeSkillIdList(data.equippedSkills)),
    stats: {
      ...stats,
      characterId: normalizedCharacter
    },
    stageProgress: {
      clearedStageIds: Array.isArray(stage.clearedStageIds)
        ? [...new Set(stage.clearedStageIds.map(id => String(id ?? '').trim()).filter(Boolean))]
        : [],
      unlockedSkillIds: normalizeSkillIdList(stage.unlockedSkillIds)
    },
    questionProgress: {
      answered: normalizedAnswered,
      correct: normalizedCorrect,
      tracks: {
        optometry: normalizeTrack(trackSource.optometry),
        optics: normalizeTrack(trackSource.optics),
        contactLens: normalizeTrack(trackSource.contactLens),
        other: normalizeTrack(trackSource.other)
      }
    },
    schemaVersion: Math.max(1, Math.floor(sanitizeNumber(data.schemaVersion, FIREBASE_PROGRESS_SCHEMA_VERSION)))
  };
}

function buildRemoteProgressPayloadFromLocalState() {
  const normalized = normalizeStudyData(snapshotStudyData());
  const trackLevels = normalized.tracks;
  const summedLevel = Object.values(trackLevels)
    .reduce((sum, track) => sum + Math.max(0, Math.floor(sanitizeNumber(track.level, 0))), 0);
  const learnedSkills = normalizeSkillIdList(normalized.playerConfig.equippedSkillIds);
  return {
    level: summedLevel,
    sp: Math.max(0, Math.floor(sanitizeNumber(normalized.knowledgePoints, 0))),
    learnedSkills,
    equippedSkills: buildFilledSkillIds(normalized.playerConfig.equippedSkillIds),
    stats: {
      characterId: normalized.playerConfig.characterId,
      trackLevels,
      answered: normalized.answered,
      correct: normalized.correct,
      dailyKnowledgePointsEarned: normalized.dailyKnowledge.points,
      dailyKnowledgePointsDate: normalized.dailyKnowledge.dateKey
    },
    stageProgress: {
      clearedStageIds: normalized.stageProgress.clearedStageIds,
      unlockedSkillIds: normalizeSkillIdList(normalized.stageProgress.unlockedSkillIds)
    },
    questionProgress: {
      answered: normalized.answered,
      correct: normalized.correct,
      tracks: trackLevels
    },
    schemaVersion: FIREBASE_PROGRESS_SCHEMA_VERSION
  };
}

function buildDefaultRemoteProgressPayload() {
  const defaults = normalizeStudyData(buildDefaultStudyData());
  const trackLevels = defaults.tracks;
  return {
    level: 0,
    sp: 0,
    learnedSkills: [],
    equippedSkills: buildFilledSkillIds(defaults.playerConfig.equippedSkillIds),
    stats: {
      characterId: defaults.playerConfig.characterId,
      trackLevels,
      answered: 0,
      correct: 0,
      dailyKnowledgePointsEarned: defaults.dailyKnowledge.points,
      dailyKnowledgePointsDate: defaults.dailyKnowledge.dateKey
    },
    stageProgress: {
      clearedStageIds: [],
      unlockedSkillIds: []
    },
    questionProgress: {
      answered: 0,
      correct: 0,
      tracks: trackLevels
    },
    schemaVersion: FIREBASE_PROGRESS_SCHEMA_VERSION
  };
}

function buildStudyDataFromRemoteProgress(rawProgress = {}) {
  const progress = normalizeRemoteProgressPayload(rawProgress);
  return normalizeStudyData({
    knowledgePoints: studyState.knowledgePoints,
    answered: progress.questionProgress.answered,
    correct: progress.questionProgress.correct,
    tracks: progress.questionProgress.tracks,
    playerConfig: {
      characterId: progress.stats.characterId ?? playerConfig.characterId,
      equippedSkillIds: progress.equippedSkills
    },
    stageProgress: {
      clearedStageIds: progress.stageProgress.clearedStageIds,
      unlockedSkillIds: progress.stageProgress.unlockedSkillIds
    }
  });
}

function normalizePlayerKnowledgeForToday(rawData = {}, today = getStudyDateKey()) {
  const data = rawData && typeof rawData === 'object' ? rawData : {};
  const knowledgePoints = Math.max(0, Math.floor(sanitizeNumber(data.knowledgePoints, studyState.knowledgePoints)));
  const dateKey = String(data.dailyKnowledgePointsDate ?? '').trim();
  const dailyEarnedRaw = Math.max(0, Math.floor(sanitizeNumber(data.dailyKnowledgePointsEarned, 0)));
  const localDailyDate = String(studyState.dailyKnowledge?.dateKey ?? '').trim();
  const localDailyPoints = Math.max(0, Math.floor(sanitizeNumber(studyState.dailyKnowledge?.points, 0)));
  const localDailyEarnedFallback = localDailyDate === today
    ? Math.min(DOJO_DAILY_CAP_POINTS, localDailyPoints)
    : 0;
  const dailyEarned = dateKey === today
    ? Math.min(DOJO_DAILY_CAP_POINTS, dailyEarnedRaw)
    : (dateKey ? 0 : localDailyEarnedFallback);
  return {
    knowledgePoints,
    dailyKnowledge: {
      dateKey: today,
      points: dailyEarned
    },
    firestoreDateKey: dateKey || today
  };
}

function resolveGameCenterIdentityForUserDocument() {
  return {
    gameCenterPlayerId: String(gameCenterSession.playerId || gameCenterSession.gameCenterId || '').trim(),
    displayName: String(gameCenterSession.displayName || gameCenterSession.alias || '').trim(),
    alias: String(gameCenterSession.alias || gameCenterSession.displayName || '').trim()
  };
}

function clearRemotePlayerProgressSaveTimer() {
  if (!remotePlayerProgressSaveTimer) return;
  clearTimeout(remotePlayerProgressSaveTimer);
  remotePlayerProgressSaveTimer = null;
}

function removeProtectedProgressFields(rawPayload = {}) {
  const payload = rawPayload && typeof rawPayload === 'object' ? { ...rawPayload } : {};
  const containsKnowledgePoints = Object.prototype.hasOwnProperty.call(payload, 'knowledgePoints');
  const containsDailyKnowledgePointsEarned = Object.prototype.hasOwnProperty.call(payload, 'dailyKnowledgePointsEarned');
  const containsDailyKnowledgePointsDate = Object.prototype.hasOwnProperty.call(payload, 'dailyKnowledgePointsDate');
  const containsProtectedFields = containsKnowledgePoints || containsDailyKnowledgePointsEarned || containsDailyKnowledgePointsDate;

  if (containsProtectedFields) {
    console.warn('[FirebaseSync] WARNING saveProgress payload contains protected fields');
    console.warn(`containsKnowledgePoints=${String(containsKnowledgePoints)}`);
    console.warn(`containsDailyKnowledgePointsEarned=${String(containsDailyKnowledgePointsEarned)}`);
    console.warn(`containsDailyKnowledgePointsDate=${String(containsDailyKnowledgePointsDate)}`);
  }

  if (containsKnowledgePoints) delete payload.knowledgePoints;
  if (containsDailyKnowledgePointsEarned) delete payload.dailyKnowledgePointsEarned;
  if (containsDailyKnowledgePointsDate) delete payload.dailyKnowledgePointsDate;

  return {
    payload,
    containsKnowledgePoints,
    containsDailyKnowledgePointsEarned,
    containsDailyKnowledgePointsDate
  };
}

async function flushRemotePlayerProgressSave(reason = 'unknown') {
  if (!isFirebaseHydrated) {
    console.info('[FirebaseSync] saveProgress skipped because Firebase not hydrated');
    console.info(`reason=${String(reason || 'unknown')}`);
    return;
  }
  if (!firebaseSession.uid) return;
  if (isApplyingRemotePlayerProgress) return;

  if (remotePlayerProgressSaveInFlight) {
    remotePlayerProgressDirty = true;
    if (reason) remotePlayerProgressPendingReason = reason;
    return;
  }

  remotePlayerProgressSaveInFlight = true;
  const rawPayload = buildRemoteProgressPayloadFromLocalState();
  const {
    payload,
    containsKnowledgePoints,
    containsDailyKnowledgePointsEarned,
    containsDailyKnowledgePointsDate
  } = removeProtectedProgressFields(rawPayload);
  const flushReason = String(reason || remotePlayerProgressPendingReason || 'unknown').trim() || 'unknown';
  remotePlayerProgressPendingReason = '';
  const payloadKeys = Object.keys(payload).sort();
  console.info('[FirebaseSync] saveProgress requested');
  console.info(`reason=${flushReason}`);
  console.info(`isFirebaseHydrated=${String(isFirebaseHydrated)}`);
  console.info(`knowledgePoints=${String(studyState.knowledgePoints)}`);
  console.info(`dailyKnowledgePointsEarned=${String(studyState.dailyKnowledge?.points ?? 0)}`);
  console.info(`dailyKnowledgePointsDate=${String(studyState.dailyKnowledge?.dateKey ?? '')}`);
  console.info(`payloadIncludesKnowledgePoints=${String(containsKnowledgePoints)}`);
  console.info(`payloadIncludesDailyKnowledgePointsEarned=${String(containsDailyKnowledgePointsEarned)}`);
  console.info(`payloadIncludesDailyKnowledgePointsDate=${String(containsDailyKnowledgePointsDate)}`);
  console.info(`payloadKeys=${payloadKeys.join(',')}`);

  try {
    await saveFirebasePlayerProgress(firebaseSession.uid, payload);
    remotePlayerProgressDirty = false;
    console.info(`[FirebaseSync] progress saved reason=${flushReason}`);
  } catch (error) {
    remotePlayerProgressDirty = true;
    console.warn(`[FirebaseSync] progress save failed reason=${flushReason}:`, error);
  } finally {
    remotePlayerProgressSaveInFlight = false;
    if (remotePlayerProgressDirty) {
      queueRemotePlayerProgressSave('retry_after_failure');
    }
  }
}

function queueRemotePlayerProgressSave(reason = 'unknown') {
  if (!isFirebaseHydrated) {
    console.info('[FirebaseSync] saveProgress skipped because Firebase not hydrated');
    console.info(`reason=${String(reason || 'unknown')}`);
    return;
  }
  if (!firebaseSession.uid) return;
  if (isApplyingRemotePlayerProgress) return;

  remotePlayerProgressDirty = true;
  remotePlayerProgressPendingReason = String(reason || '').trim() || remotePlayerProgressPendingReason;
  clearRemotePlayerProgressSaveTimer();
  remotePlayerProgressSaveTimer = setTimeout(() => {
    remotePlayerProgressSaveTimer = null;
    void flushRemotePlayerProgressSave(remotePlayerProgressPendingReason || reason);
  }, 900);
}

async function runGameCenterAutoAuthForStartup() {
  if (matchService.providerName === 'gamecenter') {
    gameCenterStatus.value = 'checking';
    if (gameCenterBindingEnabled.value) {
      console.info('GameCenter auto-auth start source=app_start');
      await ensureGameCenterAuthenticated({ source: 'app_start', interactive: true, force: true });
    } else {
      console.info('GameCenter auto-auth skipped: local binding disabled');
      gameCenterStatus.value = 'unauthenticated';
    }
    return;
  }
  gameCenterStatus.value = 'authenticated';
}

async function bootstrapRemotePlayerProgressSync() {
  isFirebaseHydrated = false;
  if (!isFirebaseBridgeAvailable()) {
    console.warn('[FirebaseSync] FirebaseBridge unavailable. Using Preferences cache only.');
    isFirebaseHydrated = false;
    await runGameCenterAutoAuthForStartup();
    return;
  }

  try {
    const authPayload = await authenticateFirebaseAnonymous();
    if (!authPayload?.uid) {
      throw new Error('Firebase 匿名登入成功但沒有 uid。');
    }

    firebaseSession.uid = String(authPayload.uid).trim();
    firebaseSession.isAuthenticated = Boolean(authPayload.isAuthenticated);
    firebaseSession.isAnonymous = Boolean(authPayload.isAnonymous);
    firebaseSession.lastAuthenticatedAt = Date.now();

    console.info(`✅ Firebase anonymous uid: ${firebaseSession.uid}`);

    await runGameCenterAutoAuthForStartup();

    const identity = resolveGameCenterIdentityForUserDocument();
    await upsertFirebaseUser({
      uid: firebaseSession.uid,
      gameCenterPlayerId: identity.gameCenterPlayerId,
      displayName: identity.displayName,
      alias: identity.alias
    });

    const today = getStudyDateKey();
    const progressResult = await getFirebasePlayerProgress(firebaseSession.uid);
    let playerKnowledgeResult = await getFirebasePlayerKnowledge(firebaseSession.uid, today);
    const playerKnowledgeMeta = playerKnowledgeResult?.meta ?? {};
    const shouldInitializePlayerKnowledge = (
      Math.floor(sanitizeNumber(playerKnowledgeResult?.data?.updatedAt, 0)) <= 0
      || !playerKnowledgeMeta.hasKnowledgePoints
      || !playerKnowledgeMeta.hasDailyKnowledgePointsEarned
      || !playerKnowledgeMeta.hasDailyKnowledgePointsDate
    );
    if (shouldInitializePlayerKnowledge) {
      const localDailyDateKey = String(studyState.dailyKnowledge?.dateKey ?? '').trim();
      const localDailyPoints = Math.max(
        0,
        Math.floor(sanitizeNumber(studyState.dailyKnowledge?.points, 0))
      );
      const baselineDailyKnowledgePointsEarned = localDailyDateKey === today
        ? Math.min(DOJO_DAILY_CAP_POINTS, localDailyPoints)
        : 0;
      const baselineDailyKnowledgePointsDate = localDailyDateKey === today ? today : '';
      console.info('[FirebaseSync] player knowledge missing required fields; initialize via transaction');
      console.info(`hasKnowledgePoints=${String(playerKnowledgeMeta.hasKnowledgePoints)}`);
      console.info(`hasDailyKnowledgePointsEarned=${String(playerKnowledgeMeta.hasDailyKnowledgePointsEarned)}`);
      console.info(`hasDailyKnowledgePointsDate=${String(playerKnowledgeMeta.hasDailyKnowledgePointsDate)}`);
      console.info(`fallbackProgressSp=${String(playerKnowledgeMeta.fallbackProgressSp ?? 0)}`);
      console.info(`baselineDailyKnowledgePointsEarned=${String(baselineDailyKnowledgePointsEarned)}`);
      console.info(`baselineDailyKnowledgePointsDate=${String(baselineDailyKnowledgePointsDate)}`);
      const initializedKnowledge = await claimFirebaseKnowledgePointReward(firebaseSession.uid, {
        calculatedReward: 0,
        dailyKnowledgePointLimit: DOJO_DAILY_CAP_POINTS,
        dateKey: today,
        baselineDailyKnowledgePointsEarned,
        baselineDailyKnowledgePointsDate
      });
      playerKnowledgeResult = {
        uid: initializedKnowledge.uid,
        data: initializedKnowledge.data,
        meta: {
          hasKnowledgePoints: true,
          hasDailyKnowledgePointsEarned: true,
          hasDailyKnowledgePointsDate: true
        }
      };
    }
    let progressPayload = null;
    if (progressResult.exists && progressResult.data) {
      progressPayload = normalizeRemoteProgressPayload(progressResult.data);
      console.info('[FirebaseSync] loaded existing player progress.');
    } else {
      progressPayload = buildDefaultRemoteProgressPayload();
      await saveFirebasePlayerProgress(firebaseSession.uid, progressPayload);
      console.info('[FirebaseSync] created default player progress.');
    }

    isApplyingRemotePlayerProgress = true;
    const baseStudyData = buildStudyDataFromRemoteProgress(progressPayload);
    const playerKnowledge = normalizePlayerKnowledgeForToday(playerKnowledgeResult?.data ?? {}, today);
    console.info('[FirebaseSync] before hydrate from Firestore');
    console.info(`knowledgePoints=${playerKnowledge.knowledgePoints}`);
    console.info(`dailyKnowledgePointsEarned=${playerKnowledge.dailyKnowledge.points}`);
    console.info(`dailyKnowledgePointsDate=${playerKnowledge.firestoreDateKey}`);
    console.info(`localKnowledgePoints=${String(studyState.knowledgePoints)}`);
    console.info(`localDailyKnowledgePointsEarned=${String(studyState.dailyKnowledge?.points ?? 0)}`);
    console.info(`localDailyKnowledgePointsDate=${String(studyState.dailyKnowledge?.dateKey ?? '')}`);
    applyStudyData({
      ...baseStudyData,
      knowledgePoints: playerKnowledge.knowledgePoints,
      dailyKnowledge: playerKnowledge.dailyKnowledge
    });
    await saveStudyStateForActiveAccount();
    isApplyingRemotePlayerProgress = false;

    isFirebaseHydrated = true;
    remotePlayerProgressDirty = false;
    remotePlayerProgressPendingReason = '';
    console.info('[FirebaseSync] after hydrate from Firestore');
    console.info(`knowledgePoints=${String(studyState.knowledgePoints)}`);
    console.info(`dailyKnowledgePointsEarned=${String(studyState.dailyKnowledge?.points ?? 0)}`);
    console.info(`dailyKnowledgePointsDate=${String(studyState.dailyKnowledge?.dateKey ?? '')}`);
    console.info(`isFirebaseHydrated=${String(isFirebaseHydrated)}`);
    console.info('[FirebaseSync] player progress hydrated from Firestore.');
  } catch (error) {
    isApplyingRemotePlayerProgress = false;
    isFirebaseHydrated = false;
    console.warn('[FirebaseSync] bootstrap failed. Keeping local cache as fallback:', error);
  }
}

function resolveLocalPvpDisplayName() {
  const nickname = sanitizePvpNickname(pvpNickname.value);
  if (nickname) return nickname;
  const gameCenterName = String(gameCenterSession.displayName || gameCenterSession.alias || '').trim();
  if (gameCenterName) return gameCenterName;
  const profileGcName = String(matchmakingStatus.localProfile?.gameCenterDisplayName ?? '').trim();
  if (profileGcName) return profileGcName;
  const profileName = String(matchmakingStatus.localProfile?.displayName ?? '').trim();
  if (profileName) return profileName;
  return 'SAMUREYE';
}

function applyLocalPvpDisplayNameToMatchStatus() {
  if (!matchmakingStatus.localProfile || typeof matchmakingStatus.localProfile !== 'object') return;
  const baseGcName = String(matchmakingStatus.localProfile.gameCenterDisplayName ?? matchmakingStatus.localProfile.displayName ?? '').trim();
  if (baseGcName) {
    matchmakingStatus.localProfile.gameCenterDisplayName = baseGcName;
  }
  matchmakingStatus.localProfile.displayName = resolveLocalPvpDisplayName();
}

function applyOpponentPvpDisplayNameToMatchStatus() {
  if (!matchmakingStatus.opponentProfile || typeof matchmakingStatus.opponentProfile !== 'object') return;
  const opponentId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  const baseGcName = String(matchmakingStatus.opponentProfile.gameCenterDisplayName ?? matchmakingStatus.opponentProfile.displayName ?? '').trim() || '對手連線中';
  matchmakingStatus.opponentProfile.gameCenterDisplayName = baseGcName;
  const customName = opponentId ? sanitizePvpNickname(remotePvpDisplayNameByPlayer.get(opponentId), '') : '';
  matchmakingStatus.opponentProfile.displayName = customName || baseGcName;
}

async function broadcastLocalPvpProfileSync(reason = 'unknown') {
  if (matchmakingStatus.phase !== 'matched') return;
  const matchSessionId = getCurrentPvpMatchSessionId();
  if (!matchSessionId) return;
  const displayName = resolveLocalPvpDisplayName();
  const localPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
  if (!displayName || !localPlayerId) return;
  await sendPvpRealtimeEvent('profile_sync', {
    displayName,
    playerId: localPlayerId,
    matchSessionId,
    reason: String(reason || '').trim()
  });
}

function normalizeGameCenterStatus(value = 'checking') {
  const text = String(value || '').trim().toLowerCase();
  if (GAME_CENTER_STATUS_SET.includes(text)) return text;
  return 'checking';
}

function sanitizeGameCenterTimestamp(value = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function normalizeGameCenterSession(raw = {}) {
  const next = raw && typeof raw === 'object' ? raw : {};
  return {
    isAuthenticated: Boolean(next.isAuthenticated),
    playerId: String(next.playerId ?? '').trim(),
    displayName: String(next.displayName ?? '').trim(),
    alias: String(next.alias ?? '').trim(),
    gameCenterId: String(next.gameCenterId ?? '').trim(),
    lastAuthenticatedAt: sanitizeGameCenterTimestamp(next.lastAuthenticatedAt)
  };
}

function getGameCenterSessionSnapshot() {
  return normalizeGameCenterSession(gameCenterSession);
}

async function saveGameCenterSessionCache() {
  if (!hasHydratedGameCenterSession) return;
  const payload = {
    version: GAME_CENTER_SESSION_SCHEMA_VERSION,
    data: getGameCenterSessionSnapshot()
  };
  try {
    await appStorage.setItem(GAME_CENTER_SESSION_SAVE_KEY, JSON.stringify(payload));
    console.info('GameCenter session saved');
  } catch (error) {
    console.warn('Failed to save Game Center session:', error);
  }
}

function applyGameCenterSession(nextRaw = {}, { status = null, persist = true } = {}) {
  const normalized = normalizeGameCenterSession(nextRaw);
  const prev = getGameCenterSessionSnapshot();
  const nextStatus = normalizeGameCenterStatus(status ?? (normalized.isAuthenticated ? 'authenticated' : 'unauthenticated'));

  gameCenterSession.isAuthenticated = normalized.isAuthenticated;
  gameCenterSession.playerId = normalized.playerId;
  gameCenterSession.displayName = normalized.displayName;
  gameCenterSession.alias = normalized.alias;
  gameCenterSession.gameCenterId = normalized.gameCenterId;
  gameCenterSession.lastAuthenticatedAt = normalized.lastAuthenticatedAt;
  gameCenterStatus.value = nextStatus;

  const changed = prev.isAuthenticated !== normalized.isAuthenticated
    || prev.playerId !== normalized.playerId
    || prev.displayName !== normalized.displayName
    || prev.alias !== normalized.alias
    || prev.gameCenterId !== normalized.gameCenterId
    || prev.lastAuthenticatedAt !== normalized.lastAuthenticatedAt;

  if (changed && persist) {
    void saveGameCenterSessionCache();
  }
}

function buildGameCenterSessionFromProfile(profile = {}, { isAuthenticated = false } = {}) {
  const playerId = String(profile?.id ?? '').trim();
  const gameCenterId = String(profile?.gameCenterId ?? '').trim();
  const displayName = String(profile?.gameCenterDisplayName ?? profile?.displayName ?? '').trim();
  const alias = displayName;
  const keepTimestamp = sanitizeGameCenterTimestamp(gameCenterSession.lastAuthenticatedAt);
  return normalizeGameCenterSession({
    isAuthenticated,
    playerId,
    displayName,
    alias,
    gameCenterId,
    lastAuthenticatedAt: isAuthenticated ? (keepTimestamp || Date.now()) : keepTimestamp
  });
}

function syncGameCenterSessionFromMatchStatus(nextStatus = {}) {
  if (!isGameCenterProvider.value) return;
  const phase = String(nextStatus.phase ?? '').trim().toLowerCase();
  const hasExistingIdentity = Boolean(
    String(gameCenterSession.playerId || gameCenterSession.gameCenterId || '').trim()
  );
  const isAuthResolving = gameCenterStatus.value === 'checking' || Boolean(gameCenterAuthPromise);
  if (!gameCenterBindingEnabled.value) {
    if (phase === 'error') {
      gameCenterStatus.value = 'error';
    }
    return;
  }
  const localProfile = nextStatus.localProfile && typeof nextStatus.localProfile === 'object'
    ? nextStatus.localProfile
    : {};
  const candidate = buildGameCenterSessionFromProfile(localProfile, { isAuthenticated: true });
  const hasIdentity = Boolean(candidate.playerId || candidate.gameCenterId);

  if (hasIdentity) {
    const wasAuthenticated = Boolean(gameCenterSession.isAuthenticated);
    const previousTimestamp = sanitizeGameCenterTimestamp(gameCenterSession.lastAuthenticatedAt);
    applyGameCenterSession({
      ...candidate,
      isAuthenticated: true,
      lastAuthenticatedAt: previousTimestamp || Date.now()
    }, { status: 'authenticated' });
    if (!wasAuthenticated) {
      console.info('GameCenter session restored');
    }
    return;
  }

  if (phase === 'auth_required') {
    if (isAuthResolving) {
      gameCenterStatus.value = 'checking';
      if (hasExistingIdentity) {
        console.info('[GameCenter] getLocalPlayer returned unauthenticated during checking; keep existing session until authenticate resolves.');
      }
      return;
    }
    const resolvedStatus = gameCenterStatus.value === 'checking' ? 'checking' : 'unauthenticated';
    applyGameCenterSession({
      isAuthenticated: false,
      playerId: '',
      displayName: '',
      alias: '',
      gameCenterId: '',
      lastAuthenticatedAt: sanitizeGameCenterTimestamp(gameCenterSession.lastAuthenticatedAt)
    }, { status: resolvedStatus });
    return;
  }

  if (phase === 'error') {
    gameCenterStatus.value = 'error';
  }
}

async function loadGameCenterSessionCache() {
  await ensureStorageReady();
  try {
    const raw = await appStorage.getItem(GAME_CENTER_SESSION_SAVE_KEY);
    if (!raw) {
      hasHydratedGameCenterSession = true;
      return;
    }
    const parsed = JSON.parse(raw);
    const data = parsed?.version === GAME_CENTER_SESSION_SCHEMA_VERSION && parsed?.data && typeof parsed.data === 'object'
      ? parsed.data
      : parsed;
    const normalized = normalizeGameCenterSession(data);
    applyGameCenterSession(normalized, { status: 'checking', persist: false });
    if (normalized.isAuthenticated) {
      console.info('GameCenter session restored');
    }
  } catch (error) {
    console.warn('Failed to load Game Center session:', error);
  } finally {
    hasHydratedGameCenterSession = true;
  }
}

async function ensureGameCenterAuthenticated({ source = 'unknown', interactive = false, force = false } = {}) {
  if (!isGameCenterProvider.value) {
    gameCenterStatus.value = 'authenticated';
    return getGameCenterSessionSnapshot();
  }

  if (!interactive && !force && gameCenterSession.isAuthenticated) {
    gameCenterStatus.value = 'authenticated';
    return getGameCenterSessionSnapshot();
  }

  if (gameCenterAuthPromise) return gameCenterAuthPromise;
  gameCenterStatus.value = 'checking';
  gameCenterAuthPromise = (async () => {
    try {
      await matchService.signIn({
        displayName: resolveLocalPvpDisplayName(),
        silent: !interactive
      });
      syncGameCenterSessionFromMatchStatus(matchmakingStatus);
      if (source === 'app_start' && gameCenterSession.isAuthenticated) {
        const playerId = String(gameCenterSession.playerId || gameCenterSession.gameCenterId || '').trim() || 'unknown';
        console.info(`GameCenter auth success from app_start playerId=${playerId}`);
      }
      if (interactive && gameCenterSession.isAuthenticated) {
        console.info('GameCenter authenticated from settings');
      }
      if (!gameCenterSession.isAuthenticated && gameCenterStatus.value !== 'error') {
        gameCenterStatus.value = 'unauthenticated';
      }
    } catch (error) {
      gameCenterStatus.value = 'error';
      console.warn(`[GameCenter] ensureGameCenterAuthenticated failed (source=${source}):`, error);
    }
    return getGameCenterSessionSnapshot();
  })();

  try {
    return await gameCenterAuthPromise;
  } finally {
    gameCenterAuthPromise = null;
  }
}

async function connectGameCenterFromSettings() {
  console.info('GameCenter settings connect clicked');
  // User explicitly wants to reconnect: re-enable local binding before auth.
  setGameCenterBindingEnabled(true);
  const session = await ensureGameCenterAuthenticated({ source: 'settings_connect', interactive: true });
  if (session.isAuthenticated) {
    if (firebaseSession.uid && isFirebaseBridgeAvailable()) {
      const identity = resolveGameCenterIdentityForUserDocument();
      try {
        await upsertFirebaseUser({
          uid: firebaseSession.uid,
          gameCenterPlayerId: identity.gameCenterPlayerId,
          displayName: identity.displayName,
          alias: identity.alias
        });
      } catch (error) {
        console.warn('[FirebaseSync] failed to update users/{uid} from settings_connect:', error);
      }
    }
    await saveRuntimeSettings();
  }
}

async function refreshGameCenterFromSettings() {
  console.info('Settings manual reconnect clicked');
  // Manual refresh is also an explicit reconnect intent.
  setGameCenterBindingEnabled(true);
  const session = await ensureGameCenterAuthenticated({ source: 'settings_refresh', interactive: true, force: true });
  if (session.isAuthenticated) {
    if (firebaseSession.uid && isFirebaseBridgeAvailable()) {
      const identity = resolveGameCenterIdentityForUserDocument();
      try {
        await upsertFirebaseUser({
          uid: firebaseSession.uid,
          gameCenterPlayerId: identity.gameCenterPlayerId,
          displayName: identity.displayName,
          alias: identity.alias
        });
      } catch (error) {
        console.warn('[FirebaseSync] failed to update users/{uid} from settings_refresh:', error);
      }
    }
    await saveRuntimeSettings();
  }
}

async function clearLocalGameCenterBinding() {
  await ensureStorageReady();
  try {
    await appStorage.removeItem(GAME_CENTER_SESSION_SAVE_KEY);
  } catch (error) {
    console.warn('Failed to clear Game Center session cache:', error);
  }
  setGameCenterBindingEnabled(false);
  await saveRuntimeSettings();
  applyGameCenterSession({
    isAuthenticated: false,
    playerId: '',
    displayName: '',
    alias: '',
    gameCenterId: '',
    lastAuthenticatedAt: 0
  }, { status: 'unauthenticated', persist: false });
}

function applyMatchStatus(nextStatus = {}) {
  const prevPhase = matchmakingStatus.phase;
  matchmakingStatus.provider = nextStatus.provider ?? matchmakingStatus.provider;
  matchmakingStatus.phase = nextStatus.phase ?? 'idle';
  matchmakingStatus.message = nextStatus.message ?? '';
  matchmakingStatus.queueSeconds = Number.isFinite(Number(nextStatus.queueSeconds))
    ? Number(nextStatus.queueSeconds)
    : 0;
  matchmakingStatus.expectedPlayerCount = normalizeConnectedPlayerCount(
    Number.isFinite(Number(nextStatus.expectedPlayerCount))
      ? Number(nextStatus.expectedPlayerCount)
      : matchmakingStatus.expectedPlayerCount
  );
  matchmakingStatus.connectedPlayerCount = normalizeConnectedPlayerCount(
    Number.isFinite(Number(nextStatus.connectedPlayerCount))
      ? Number(nextStatus.connectedPlayerCount)
      : matchmakingStatus.connectedPlayerCount
  );
  matchmakingStatus.localProfile = {
    ...matchmakingStatus.localProfile,
    ...(nextStatus.localProfile ?? {})
  };
  matchmakingStatus.opponentProfile = nextStatus.opponentProfile ?? null;
  matchmakingStatus.errorMessage = nextStatus.errorMessage ?? '';
  applyLocalPvpDisplayNameToMatchStatus();
  applyOpponentPvpDisplayNameToMatchStatus();

  const nextPhase = matchmakingStatus.phase;
  if (
    isCurrentBattlePvP.value
    && currentScreen.value === 'battle'
    && !isPvpTerminalState()
    && prevPhase === 'matched'
    && nextPhase !== 'matched'
  ) {
    beginPvpEndSequence(`match_phase_${nextPhase || 'unknown'}`, {
      phase: 'ended',
      localOutcome: 'win',
      message: '對戰連線中斷，已結束本場對戰。'
    });
  }
  if (nextPhase === 'matched' && prevPhase !== 'matched') {
    matchmakingStatus.matchedEnteredAtMs = Date.now();
    resetPvpRealtimeState();
    applyLocalPvpDisplayNameToMatchStatus();
    applyOpponentPvpDisplayNameToMatchStatus();
    ensurePvpMatchSessionForMatchedState('matched_enter');
    void broadcastLocalPvpProfileSync('matched_enter');
  }
  if (nextPhase === 'matched') {
    ensurePvpMatchSessionForMatchedState('matched_status_update');
    if (!hasActiveMatchedOpponent()) {
      if (matchmakingStatus.localReady || matchmakingStatus.opponentReady || matchmakingStatus.startPending) {
        console.info('[PvP Sync] matched 狀態失去有效對手連線，重置ready/session流程');
      }
      resetPvpReadyState();
      if (currentScreen.value === 'matchmaking') {
        clearCurrentPvpMatchSessionId('matched_without_active_opponent');
        matchmakingStatus.phase = 'idle';
        matchmakingStatus.message = '對手已離線，請重新配對。';
        matchmakingStatus.errorMessage = '';
        matchmakingStatus.opponentProfile = null;
        matchmakingStatus.queueSeconds = 0;
        matchmakingStatus.expectedPlayerCount = 0;
        matchmakingStatus.connectedPlayerCount = 0;
        console.info('[PvP End] phase set to idle');
      }
    }
  }
  if (nextPhase !== 'matched') {
    matchmakingStatus.matchedEnteredAtMs = 0;
    matchmakingStatus.expectedPlayerCount = 0;
    matchmakingStatus.connectedPlayerCount = 0;
    clearCurrentPvpMatchSessionId(`phase_${nextPhase || 'unknown'}`);
    resetPvpReadyState();
  } else {
    refreshPvpReadyMessage();
  }
  syncGameCenterSessionFromMatchStatus(matchmakingStatus);
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

function clearPendingPvpEndFogTimer() {
  if (!pendingPvpEndFogCompleteTimer) return;
  clearTimeout(pendingPvpEndFogCompleteTimer);
  pendingPvpEndFogCompleteTimer = null;
}

function clearPvpEndUiState(reason = 'reset') {
  clearPendingPvpEndFogTimer();
  if (pvpEndUiState.phase !== 'idle') {
    console.info(`[PvP End] clear end sequence state reason=${reason}`);
  }
  pvpEndUiState.phase = 'idle';
  pvpEndUiState.reason = '';
  pvpEndUiState.matchSessionId = '';
  pvpEndUiState.result = null;
  pvpEndUiState.startedAtMs = 0;
  pvpEndUiState.completedAtMs = 0;
}

function normalizePvpLocalOutcome(value = '') {
  const outcome = String(value ?? '').trim().toLowerCase();
  if (outcome === 'win' || outcome === 'lose' || outcome === 'draw') return outcome;
  return '';
}

function clearPendingGuestSessionSyncRequestTimer() {
  if (!pendingGuestSessionSyncRequestTimer) return;
  clearTimeout(pendingGuestSessionSyncRequestTimer);
  pendingGuestSessionSyncRequestTimer = null;
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

function normalizeConnectedPlayerCount(value = 0) {
  const next = Number(value);
  if (!Number.isFinite(next) || next < 0) return 0;
  return Math.floor(next);
}

function getCurrentPvpMatchSessionId() {
  return String(matchmakingStatus.matchSessionId ?? '').trim();
}

function setCurrentPvpMatchSessionId(sessionId = '', reason = '') {
  const next = String(sessionId || '').trim();
  const prev = getCurrentPvpMatchSessionId();
  matchmakingStatus.matchSessionId = next;
  if (next) {
    if (endedMatchSessionId.value && endedMatchSessionId.value !== next) {
      clearActiveEndedMatchSession('new_active_session');
    }
    console.info(`[PvP Sync] current matchSessionId=${next}${reason ? ` reason=${reason}` : ''}`);
    clearPendingGuestSessionSyncRequestTimer();
    if (!prev || prev !== next) {
      drainPendingSessionScopedPackets(next, reason || 'set_session_id');
    }
  }
}

function clearCurrentPvpMatchSessionId(reason = '') {
  const prev = getCurrentPvpMatchSessionId();
  pendingSessionScopedPackets.length = 0;
  clearPendingGuestSessionSyncRequestTimer();
  if (!prev) return;
  matchmakingStatus.matchSessionId = '';
  console.info(`[PvP Sync] clear matchSessionId=${prev}${reason ? ` reason=${reason}` : ''}`);
}

function pruneRecentEndedMatchSessions(nowMs = Date.now()) {
  for (const [sessionId, endedAtMs] of recentEndedMatchSessionIds.entries()) {
    if (!sessionId) {
      recentEndedMatchSessionIds.delete(sessionId);
      continue;
    }
    if (!Number.isFinite(Number(endedAtMs))) {
      recentEndedMatchSessionIds.delete(sessionId);
      continue;
    }
    if (nowMs - Number(endedAtMs) > RECENT_ENDED_SESSION_TTL_MS) {
      recentEndedMatchSessionIds.delete(sessionId);
    }
  }
}

function isRecentlyEndedMatchSession(sessionId = '') {
  const normalized = String(sessionId || '').trim();
  if (!normalized) return false;
  pruneRecentEndedMatchSessions(Date.now());
  if (endedMatchSessionId.value && endedMatchSessionId.value === normalized) return true;
  return recentEndedMatchSessionIds.has(normalized);
}

function markEndedMatchSession(sessionId = '', reason = '') {
  const normalized = String(sessionId || '').trim();
  if (!normalized) return;
  const nowMs = Date.now();
  endedMatchSessionId.value = normalized;
  endedMatchSessionAtMs.value = nowMs;
  recentEndedMatchSessionIds.set(normalized, nowMs);
  pruneRecentEndedMatchSessions(nowMs);
  console.info(`[PvP End] endedMatchSessionId set=${normalized}${reason ? ` reason=${reason}` : ''}`);
}

function clearActiveEndedMatchSession(reason = '') {
  const prev = String(endedMatchSessionId.value || '').trim();
  if (!prev) return;
  endedMatchSessionId.value = '';
  endedMatchSessionAtMs.value = 0;
  console.info(`[PvP End] clear endedMatchSessionId=${prev}${reason ? ` reason=${reason}` : ''}`);
}

function generatePvpMatchSessionId() {
  const localPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile) || 'local';
  const opponentPlayerId = resolveMatchPlayerId(matchmakingStatus.opponentProfile) || 'opponent';
  const sortedPair = [localPlayerId, opponentPlayerId].sort((a, b) => a.localeCompare(b)).join('::');
  return `${sortedPair}::${Date.now()}::${Math.floor(Math.random() * 1_000_000)}`;
}

function isPacketFromCurrentMatchedOpponent(packet = {}) {
  const sourcePlayerId = String(packet?._sourcePlayerId ?? '').trim();
  const opponentId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  if (!sourcePlayerId || !opponentId) return false;
  return sourcePlayerId === opponentId;
}

function canAcceptInitialSessionSync(packet = {}) {
  if (getCurrentPvpMatchSessionId()) return false;
  const phase = String(matchmakingStatus.phase ?? '').trim();
  if (phase !== 'matched' && phase !== 'searching') return false;
  return isPacketFromCurrentMatchedOpponent(packet);
}

function queuePendingSessionScopedPacket(type, packet = {}) {
  const incomingSessionId = resolvePacketMatchSessionId(packet);
  if (!incomingSessionId) return;
  const sourcePlayerId = String(packet?._sourcePlayerId ?? '').trim();
  const hasSamePacket = pendingSessionScopedPackets.some((item) => (
    item.type === type
    && item.matchSessionId === incomingSessionId
    && item.sourcePlayerId === sourcePlayerId
  ));
  if (hasSamePacket) return;
  pendingSessionScopedPackets.push({
    type,
    matchSessionId: incomingSessionId,
    sourcePlayerId,
    packet
  });
  console.info(`[PvP Sync] queued ${type} while waiting matchSessionId=${incomingSessionId}`);
}

function drainPendingSessionScopedPackets(sessionId = '', reason = '') {
  const nextSessionId = String(sessionId || '').trim();
  if (!nextSessionId) return;
  if (pendingSessionScopedPackets.length === 0) return;

  const remaining = [];
  for (const item of pendingSessionScopedPackets) {
    if (item.matchSessionId !== nextSessionId) {
      remaining.push(item);
      continue;
    }
    if (item.type === 'profile_sync') {
      const sourcePlayerId = String(item?.packet?._sourcePlayerId ?? item?.packet?.payload?.playerId ?? '').trim();
      const localPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
      if (!sourcePlayerId || sourcePlayerId === localPlayerId) continue;
      const customName = sanitizePvpNickname(item?.packet?.payload?.displayName, '');
      if (!customName) continue;
      remotePvpDisplayNameByPlayer.set(sourcePlayerId, customName);
      if (matchmakingStatus.opponentProfile && typeof matchmakingStatus.opponentProfile === 'object') {
        const opponentId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
        if (!opponentId) {
          matchmakingStatus.opponentProfile.id = sourcePlayerId;
        }
        if (!opponentId || opponentId === sourcePlayerId) {
          applyOpponentPvpDisplayNameToMatchStatus();
        }
      }
      console.info(`[PvP Sync] drained queued profile_sync matchSessionId=${nextSessionId}`);
      continue;
    }

    if (item.type === 'ready') {
      if (matchmakingStatus.phase !== 'matched') continue;
      if (!hasActiveMatchedOpponent()) continue;
      const isReady = item?.packet?.payload?.ready !== false;
      if (matchmakingStatus.startPending && !isReady) continue;
      matchmakingStatus.opponentReady = Boolean(isReady);
      if (matchmakingStatus.opponentReady) {
        console.info('[PvP Sync] 設定opponentReady=true (queued ready)');
      }
      refreshPvpReadyMessage();
      checkBothReady('remote_ready_queued');
      continue;
    }

    if (item.type === 'prepare_battle') {
      if (matchmakingStatus.phase !== 'matched') continue;
      if (!hasActiveMatchedOpponent()) continue;
      if (isCurrentPlayerMatchHost()) continue;
      const normalized = normalizeBattleGoPayload({
        ...item.packet.payload,
        matchSessionId: nextSessionId
      });
      if (!normalized.prepareId) continue;
      pendingPrepareBattleState = {
        ...normalized,
        goSent: false,
        ackPlayerId: item.sourcePlayerId
      };
      matchmakingStatus.startPending = true;
      refreshPvpReadyMessage();
      console.info(`[PvP Sync] drained queued prepare_battle prepareId=${normalized.prepareId}`);
      void sendPvpRealtimeEvent('prepare_ack', {
        prepareId: normalized.prepareId,
        seed: normalized.seed,
        countdownMs: normalized.countdownMs,
        fogDurationMs: normalized.fogDurationMs
      });
      continue;
    }

    if (item.type === 'battle_go') {
      if (matchmakingStatus.phase !== 'matched') continue;
      if (!hasActiveMatchedOpponent()) continue;
      const normalized = normalizeBattleGoPayload({
        ...item.packet.payload,
        matchSessionId: nextSessionId
      });
      scheduleBattleStartFromBattleGo({
        ...normalized,
        matchSessionId: nextSessionId
      }, `queued_battle_go_${reason || 'session_ready'}`);
      console.info(`[PvP Sync] drained queued battle_go matchSessionId=${nextSessionId}`);
      continue;
    }

    if (item.type === 'start_battle' || item.type === 'battle_start') {
      if (matchmakingStatus.phase !== 'matched') continue;
      if (!hasActiveMatchedOpponent()) continue;
      const mode = String(item?.packet?.payload?.mode ?? '').trim().toLowerCase();
      if (mode && mode !== 'pvp') continue;
      scheduleBattleStartFromBattleGo({
        ...item.packet.payload,
        matchSessionId: nextSessionId
      }, `queued_${item.type}_${reason || 'session_ready'}`);
      console.info(`[PvP Sync] drained queued ${item.type} matchSessionId=${nextSessionId}`);
      continue;
    }

    remaining.push(item);
  }

  pendingSessionScopedPackets.length = 0;
  remaining.forEach(item => pendingSessionScopedPackets.push(item));
}

function hasActiveMatchedOpponent() {
  if (matchmakingStatus.phase !== 'matched') return false;
  const connectedCount = normalizeConnectedPlayerCount(matchmakingStatus.connectedPlayerCount);
  if (connectedCount <= 0) return false;
  const opponentId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  if (!opponentId || opponentId === 'pending-opponent') return false;
  return true;
}

function requestHostSessionSync(reason = 'guest_session_missing') {
  if (matchmakingStatus.phase !== 'matched') return;
  if (isCurrentPlayerMatchHost()) return;
  if (!hasActiveMatchedOpponent()) return;
  if (getCurrentPvpMatchSessionId()) return;
  console.info('[PvP Sync] guest session missing -> request session_sync');
  void sendPvpRealtimeEvent('session_sync_request', {
    reason
  });
}

function scheduleGuestSessionSyncRequest(reason = 'matched_enter') {
  if (isCurrentPlayerMatchHost()) return;
  if (matchmakingStatus.phase !== 'matched') return;
  if (!hasActiveMatchedOpponent()) return;
  if (getCurrentPvpMatchSessionId()) return;
  clearPendingGuestSessionSyncRequestTimer();
  pendingGuestSessionSyncRequestTimer = setTimeout(() => {
    pendingGuestSessionSyncRequestTimer = null;
    if (getCurrentPvpMatchSessionId()) return;
    requestHostSessionSync(reason);
  }, 1000);
}

function hostResendSessionSync(reason = 'session_sync_request') {
  if (!isCurrentPlayerMatchHost()) return;
  if (matchmakingStatus.phase !== 'matched') return;
  if (!hasActiveMatchedOpponent()) return;
  let sessionId = getCurrentPvpMatchSessionId();
  if (!sessionId) {
    sessionId = generatePvpMatchSessionId();
    setCurrentPvpMatchSessionId(sessionId, `${reason}:host_regenerate`);
  }
  console.info(`[PvP Sync] host resend session_sync reason=${reason}`);
  void sendPvpRealtimeEvent('session_sync', {
    matchSessionId: sessionId,
    sessionIssuedAtMs: Number(matchmakingStatus.matchedEnteredAtMs || Date.now()),
    source: reason
  });
  void broadcastLocalPvpProfileSync(`resend_${reason}`);
}

function ensurePvpMatchSessionForMatchedState(reason = 'matched_state') {
  if (matchmakingStatus.phase !== 'matched') return;
  if (!hasActiveMatchedOpponent()) return;
  if (getCurrentPvpMatchSessionId()) return;

  if (!isCurrentPlayerMatchHost()) {
    console.info(`[PvP Sync] guest等待host同步matchSessionId reason=${reason}`);
    scheduleGuestSessionSyncRequest(reason);
    return;
  }

  const nextSessionId = generatePvpMatchSessionId();
  setCurrentPvpMatchSessionId(nextSessionId, `${reason}:host_generate`);
  void sendPvpRealtimeEvent('session_sync', {
    matchSessionId: nextSessionId,
    sessionIssuedAtMs: Number(matchmakingStatus.matchedEnteredAtMs || Date.now()),
    source: reason
  });
}

function resolvePacketMatchSessionId(packet = {}) {
  const direct = String(packet?.matchSessionId ?? '').trim();
  if (direct) return direct;
  const fromPayload = String(packet?.payload?.matchSessionId ?? '').trim();
  return fromPayload;
}

function shouldIgnoreStalePvpMessage(type, packet = {}) {
  if (!PVP_SESSION_SCOPED_MESSAGE_TYPES.has(type)) return false;
  const incomingSessionId = resolvePacketMatchSessionId(packet);
  const currentSessionId = getCurrentPvpMatchSessionId();
  const isEndEvent = type === 'forfeit' || type === 'battle_end';

  if (!incomingSessionId) {
    console.info(`[PvP Sync] ignored stale PvP message type=${type} reason=missing_matchSessionId`);
    return true;
  }

  if (!currentSessionId) {
    if (
      isEndEvent
      && pvpEndUiState.phase === 'ending_fog'
      && incomingSessionId
      && incomingSessionId === String(pvpEndUiState.matchSessionId || '').trim()
    ) {
      console.info('[PvP End] duplicate end ignored during ending_fog');
      return true;
    }
    if (isRecentlyEndedMatchSession(incomingSessionId) && isEndEvent) {
      if (pvpEndUiState.phase === 'ending_fog') {
        console.info('[PvP End] duplicate end ignored during ending_fog');
        return true;
      }
      if (type === 'battle_end') {
        console.info('[PvP End] duplicate battle_end ignored after forfeit');
      } else {
        console.info(`[PvP End] duplicate end ignored session=${incomingSessionId}`);
      }
      return true;
    }
    if (
      canAcceptInitialSessionSync(packet)
      && (
        type === 'profile_sync'
        || type === 'ready'
        || type === 'prepare_battle'
        || type === 'battle_go'
        || type === 'start_battle'
        || type === 'battle_start'
      )
    ) {
      queuePendingSessionScopedPacket(type, packet);
      scheduleGuestSessionSyncRequest(`queued_${type}`);
      return true;
    }
    console.info(`[PvP Sync] ignored stale PvP message type=${type} reason=no_active_session`);
    return true;
  }

  if (incomingSessionId !== currentSessionId) {
    if (
      isEndEvent
      && pvpEndUiState.phase === 'ending_fog'
      && incomingSessionId
      && incomingSessionId === String(pvpEndUiState.matchSessionId || '').trim()
    ) {
      console.info('[PvP End] duplicate end ignored during ending_fog');
      return true;
    }
    if (isRecentlyEndedMatchSession(incomingSessionId) && isEndEvent) {
      if (pvpEndUiState.phase === 'ending_fog') {
        console.info('[PvP End] duplicate end ignored during ending_fog');
        return true;
      }
      if (type === 'battle_end') {
        console.info('[PvP End] duplicate battle_end ignored after forfeit');
      } else {
        console.info(`[PvP End] duplicate end ignored session=${incomingSessionId}`);
      }
      return true;
    }
    console.info(`[PvP Sync] ignored stale PvP message type=${type} incoming=${incomingSessionId} current=${currentSessionId}`);
    return true;
  }

  return false;
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
  skillAnimationPlaybackByCastId.clear();
  const castToClear = activeSkillCast;
  activeSkillCast = null;
  pendingSkillCastPostResumeTickTrace = null;
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

function resolvePvpClockOffsetMs() {
  const rawOffset = Number(pvpClockOffsetMs);
  return Number.isFinite(rawOffset) ? Math.round(rawOffset) : 0;
}

function convertHostTimeToLocalMs(hostTimeMs) {
  const rawHostTime = Number(hostTimeMs);
  if (!Number.isFinite(rawHostTime) || rawHostTime <= 0) return null;
  return Math.round(rawHostTime + resolvePvpClockOffsetMs());
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
  const hostCastStartAtMs = Number.isFinite(Number(payload.castStartAtMs))
    ? Math.round(Number(payload.castStartAtMs))
    : null;
  const castStartAtMs = hostCastStartAtMs === null
    ? null
    : (convertHostTimeToLocalMs(hostCastStartAtMs) ?? hostCastStartAtMs);
  const battleRemainingMsAtCast = Number.isFinite(Number(payload.battleRemainingMsAtCast))
    ? Math.max(0, Math.round(Number(payload.battleRemainingMsAtCast)))
    : (Number.isFinite(Number(payload.effectiveBattleTime))
      ? Math.max(0, Math.round(Number(payload.effectiveBattleTime)))
      : null);
  const resumeAtMsRaw = Number(payload.resumeAtMs);
  const hostResumeAtMs = Number.isFinite(resumeAtMsRaw)
    ? Math.round(resumeAtMsRaw)
    : (Number.isFinite(hostCastStartAtMs) ? Math.round(hostCastStartAtMs + pauseDurationMs) : null);
  const resumeAtMs = hostResumeAtMs === null
    ? (Number.isFinite(castStartAtMs) ? Math.round(castStartAtMs + pauseDurationMs) : null)
    : (convertHostTimeToLocalMs(hostResumeAtMs) ?? hostResumeAtMs);
  const hostResolveAtMs = Number.isFinite(Number(payload.resolveAtMs))
    ? Math.round(Number(payload.resolveAtMs))
    : null;
  const resolveAtMs = hostResolveAtMs === null
    ? null
    : (convertHostTimeToLocalMs(hostResolveAtMs) ?? hostResolveAtMs);
  const effectDurationMs = Number.isFinite(Number(payload.effectDurationMs))
    ? Math.max(0, Math.round(Number(payload.effectDurationMs)))
    : Math.max(
      0,
      Math.round(Number(
        payload?.effectTimeline?.durationMs
        ?? payload?.statusEffects?.durationMs
        ?? skillDefinition?.effectDurationMs
        ?? 0
      ))
    );
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
      const hostAtMs = Number.isFinite(atMsRaw) ? Math.round(atMsRaw) : null;
      const atMs = hostAtMs === null ? null : (convertHostTimeToLocalMs(hostAtMs) ?? hostAtMs);
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
    clockOffsetMs: resolvePvpClockOffsetMs(),
    hostCastStartAtMs,
    castStartAtMs,
    hostResumeAtMs,
    resumeAtMs,
    effectDurationMs,
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
      effectStartAtMs: (() => {
        const hostValue = Number.isFinite(Number(statusEffectsPayload?.effectStartAtMs))
          ? Math.round(Number(statusEffectsPayload?.effectStartAtMs))
          : 0;
        if (hostValue <= 0) return 0;
        return convertHostTimeToLocalMs(hostValue) ?? hostValue;
      })(),
      effectEndAtMs: (() => {
        const hostValue = Number.isFinite(Number(statusEffectsPayload?.effectEndAtMs))
          ? Math.round(Number(statusEffectsPayload?.effectEndAtMs))
          : 0;
        if (hostValue <= 0) return 0;
        return convertHostTimeToLocalMs(hostValue) ?? hostValue;
      })(),
      success: typeof statusEffectsPayload?.success === 'boolean'
        ? statusEffectsPayload.success
        : (typeof resultSuccess === 'boolean' ? resultSuccess : null),
      casterFeedbackText: String(statusEffectsPayload?.casterFeedbackText ?? '').trim(),
      targetVisualKey: String(statusEffectsPayload?.targetVisualKey ?? '').trim(),
      endVisualKey: String(statusEffectsPayload?.endVisualKey ?? '').trim(),
      failReason: String(statusEffectsPayload?.failReason ?? resultPayload?.failReason ?? '').trim()
    },
    effectTimeline: {
      effectStartAtMs: (() => {
        const hostValue = Number.isFinite(Number(effectTimelinePayload?.effectStartAtMs))
          ? Math.round(Number(effectTimelinePayload?.effectStartAtMs))
          : 0;
        if (hostValue <= 0) return 0;
        return convertHostTimeToLocalMs(hostValue) ?? hostValue;
      })(),
      durationMs: Math.max(0, Math.round(Number(effectTimelinePayload?.durationMs ?? 0))),
      tickMs: Math.max(0, Math.round(Number(effectTimelinePayload?.tickMs ?? 0))),
      effectEndAtMs: (() => {
        const hostValue = Number.isFinite(Number(effectTimelinePayload?.effectEndAtMs))
          ? Math.round(Number(effectTimelinePayload?.effectEndAtMs))
          : 0;
        if (hostValue <= 0) return 0;
        return convertHostTimeToLocalMs(hostValue) ?? hostValue;
      })()
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
      effectStartAtMs: (() => {
        const hostValue = Number.isFinite(Number(resultStatusEffectPayload?.effectStartAtMs))
          ? Math.round(Number(resultStatusEffectPayload?.effectStartAtMs))
          : 0;
        if (hostValue <= 0) return 0;
        return convertHostTimeToLocalMs(hostValue) ?? hostValue;
      })(),
      effectEndAtMs: (() => {
        const hostValue = Number.isFinite(Number(resultStatusEffectPayload?.effectEndAtMs))
          ? Math.round(Number(resultStatusEffectPayload?.effectEndAtMs))
          : 0;
        if (hostValue <= 0) return 0;
        return convertHostTimeToLocalMs(hostValue) ?? hostValue;
      })(),
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
  const normalizedRemainingMs = Math.max(0, Math.round(remainingMs));
  timeLeft.value = normalizedRemainingMs / 1000;
  return normalizedRemainingMs;
}

function applySkillCastAuthoritativeDamage(cast = null, reason = 'resolve') {
  if (!cast || typeof cast !== 'object') return;
  if (isPvpTerminalState() || gameState.value === 'gameResult' || gameState.value === 'finishing') {
    console.info('[PvP End] skill_cast ignored: battle already ended');
    return;
  }
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
  if (isPvpTerminalState() || gameState.value === 'gameResult' || gameState.value === 'finishing') {
    console.info('[PvP End] skill_cast ignored: battle already ended');
    return;
  }
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

  const totalHitCount = Array.isArray(cast.hitEvents) ? cast.hitEvents.length : 0;
  const suppressPerHitHaptic = isCurrentBattlePvP.value
    && totalHitCount >= 10
    && hitIndex % 2 === 0;

  skillVisualEngine.playHit({
    skill: cast.skillDefinition,
    cast,
    hitEvent: {
      ...hitEvent,
      heal,
      actualHeal: heal,
      suppressHaptic: suppressPerHitHaptic
    },
    role: cast.localRole
  });

  if (!isHeal && hpAfter <= 0) {
    cast.pendingBattleEnd = true;
  }

  const shouldLogHit = reason !== 'hit_event_timer'
    || hitIndex === 1
    || hitIndex === totalHitCount
    || hitIndex % 5 === 0;
  if (shouldLogHit) {
    console.info(`[PvP Sync] skill_cast hit castId=${cast.castId} hitIndex=${hitIndex} damage=${damage} heal=${heal} hpBefore=${hpBefore} hpAfter=${hpAfter} role=${cast.localRole} reason=${reason}`);
  }
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

function trackSkillAnimationPlayback(castId = '', playbackPromise = null) {
  const key = String(castId || '').trim();
  if (!key || !playbackPromise || typeof playbackPromise.then !== 'function') return;
  const trackedPromise = Promise.resolve(playbackPromise)
    .catch((error) => {
      console.warn(`[PvP Sync] skill animation playback failed castId=${key}`, error);
      throw error;
    })
    .finally(() => {
      const currentPromise = skillAnimationPlaybackByCastId.get(key);
      if (currentPromise === trackedPromise) {
        skillAnimationPlaybackByCastId.delete(key);
      }
    });
  skillAnimationPlaybackByCastId.set(key, trackedPromise);
}

async function waitForSkillAnimationPlayback(castId = '') {
  const key = String(castId || '').trim();
  if (!key) return;
  const playbackPromise = skillAnimationPlaybackByCastId.get(key);
  if (!playbackPromise || typeof playbackPromise.then !== 'function') return;
  try {
    await playbackPromise;
  } catch (error) {
    console.warn(`[PvP Sync] wait skill animation playback failed castId=${key}`, error);
  }
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
    phase: 'active',
    durationMs: cast.pauseDurationMs,
    castStartAtMs: Number.isFinite(Number(cast.castStartAtMs)) ? Math.round(Number(cast.castStartAtMs)) : Date.now(),
    resumeAtMs: Number.isFinite(Number(cast.resumeAtMs))
      ? Math.round(Number(cast.resumeAtMs))
      : null,
    startedAtMs: Date.now(),
    title: cast.skillName,
    visualEffects: effects.slice(0, 6)
  };
  activeSkillAnimation.value = animationPayload;
  console.info(`[PvP Sync] activeSkillAnimation已設定 castId=${animationPayload.castId} animationKey=${animationPayload.animationKey} role=${animationPayload.role}`);

  const isLocalCaster = cast.localRole === 'caster';
  const playbackPromise = playSkillCinematic({
    skillName: cast.skillName,
    isEnemyTurn: !isLocalCaster,
    casterSide: isLocalCaster ? 'local-player' : 'opponent',
    timelineSync: {
      castStartAtMs: Number.isFinite(Number(cast.castStartAtMs)) ? Math.round(Number(cast.castStartAtMs)) : Date.now(),
      resumeAtMs: Number.isFinite(Number(cast.resumeAtMs)) ? Math.round(Number(cast.resumeAtMs)) : null
    }
  });
  trackSkillAnimationPlayback(cast.castId, playbackPromise);
  await playbackPromise;
}

function markSkillAnimationExiting(cast = null, reason = 'unknown') {
  const castId = String(cast?.castId ?? '').trim();
  if (!castId) return;
  const animation = activeSkillAnimation.value;
  if (!animation || String(animation?.castId ?? '').trim() !== castId) return;
  if (String(animation?.phase ?? '').trim() === 'exiting') return;
  activeSkillAnimation.value = {
    ...animation,
    phase: 'exiting',
    exitingAtMs: Date.now(),
    exitingReason: reason
  };
}

async function clearSkillAnimation(reason = 'unknown', cast = null) {
  const animation = activeSkillAnimation.value;
  if (!animation && !cast) return;
  const role = cast?.localRole ?? animation?.role ?? '';
  const castId = String(cast?.castId ?? animation?.castId ?? '').trim() || '-';
  const expectedResumeAtMs = Number.isFinite(Number(cast?.resumeAtMs ?? animation?.resumeAtMs))
    ? Math.round(Number(cast?.resumeAtMs ?? animation?.resumeAtMs))
    : -1;
  const clockOffsetMs = Number.isFinite(Number(cast?.clockOffsetMs ?? animation?.clockOffsetMs))
    ? Math.round(Number(cast?.clockOffsetMs ?? animation?.clockOffsetMs))
    : resolvePvpClockOffsetMs();
  const isResumeExit = String(reason ?? '').trim() === 'skill_cast_resume';
  const localNowAtExitStart = Date.now();
  console.info(
    `[PvP Sync] skill_exit_start castId=${castId} role=${role || '-'} localNow=${localNowAtExitStart} `
      + `expectedResumeAtMs=${expectedResumeAtMs} clockOffsetMs=${clockOffsetMs} triggerReason=${reason}`
  );
  if (isResumeExit) {
    emitSkillLifecycleStage('skill_exit_start', cast ?? animation ?? {}, {
      source: 'skill_cast_resume',
      reason
    });
  }
  await waitForSkillAnimationPlayback(castId);
  await finishSkillCinematic({
    casterSide: role === 'caster' ? 'local-player' : 'opponent',
    exitDurationMs: 160
  });
  console.info(`[PvP Sync] skill_exit_complete castId=${castId} localNow=${Date.now()} triggerReason=${reason}`);
  if (isResumeExit) {
    emitSkillLifecycleStage('skill_exit_complete', cast ?? animation ?? {}, {
      source: 'skill_cast_resume',
      reason
    });
  }
  const localNow = Date.now();
  if (!activeSkillAnimation.value || activeSkillAnimation.value.castId === castId) {
    activeSkillAnimation.value = null;
  }
  console.info(`[PvP Sync] clear_activeSkillAnimation_after_exit castId=${castId} localNow=${localNow} triggerReason=${reason}`);
  console.info(`[PvP Sync] SkillAnimationLayer卸載 castId=${castId} localNow=${localNow} reason=skill_exit_complete expectedResumeAtMs=${expectedResumeAtMs}`);
  console.info(`[PvP Sync] 技能動畫已清除 reason=skill_exit_complete triggerReason=${reason}`);
}

function tryStartQueuedSkillCast(reason = 'queue_check') {
  if (isPvpTerminalState()) return;
  if (activeSkillCast) return;
  if (queuedSkillCasts.length <= 0) return;
  if (currentScreen.value !== 'battle') return;
  if (!isCurrentBattlePvP.value) return;
  if (gameState.value === 'gameResult' || gameState.value === 'finishing') return;
  if (isPaused.value) return;

  const nextCast = queuedSkillCasts.shift() ?? null;
  if (!nextCast) return;
  pendingSkillCastPostResumeTickTrace = null;
  activeSkillCast = nextCast;
  queuedSkillCastIds.delete(nextCast.castId);

  const syncedBattleRemainingMsAtCast = syncBattleTimeFromSkillCast(nextCast);
  const expectedBattleRemainingMsAtCast = Number.isFinite(Number(nextCast.battleRemainingMsAtCast))
    ? Math.max(0, Math.round(Number(nextCast.battleRemainingMsAtCast)))
    : null;
  const castStartNowMs = Date.now();
  const expectedResumeAtMs = Number.isFinite(Number(nextCast.resumeAtMs))
    ? Math.round(Number(nextCast.resumeAtMs))
    : -1;
  const hostResumeAtMs = Number.isFinite(Number(nextCast.hostResumeAtMs))
    ? Math.round(Number(nextCast.hostResumeAtMs))
    : -1;
  const expectedCastStartAtMs = Number.isFinite(Number(nextCast.castStartAtMs))
    ? Math.round(Number(nextCast.castStartAtMs))
    : -1;
  const hostCastStartAtMs = Number.isFinite(Number(nextCast.hostCastStartAtMs))
    ? Math.round(Number(nextCast.hostCastStartAtMs))
    : -1;
  const castClockOffsetMs = Number.isFinite(Number(nextCast.clockOffsetMs))
    ? Math.round(Number(nextCast.clockOffsetMs))
    : resolvePvpClockOffsetMs();
  console.info(
    `[PvP Sync] handleSkillCast啟動 castId=${nextCast.castId} role=${nextCast.localRole} skillId=${nextCast.skillId} `
      + `localNow=${castStartNowMs} pauseDurationMs=${nextCast.pauseDurationMs} effectDurationMs=${nextCast.effectDurationMs ?? 0} `
      + `clockOffsetMs=${castClockOffsetMs} hostCastStartAtMs=${hostCastStartAtMs} localCastStartAtMs=${expectedCastStartAtMs} `
      + `hostResumeAtMs=${hostResumeAtMs} localResumeAtMs=${expectedResumeAtMs} battleRemainingMsAtCast=${nextCast.battleRemainingMsAtCast} `
      + `syncedBattleRemainingMsAtCast=${Number.isFinite(Number(syncedBattleRemainingMsAtCast)) ? syncedBattleRemainingMsAtCast : -1} reason=${reason}`
  );
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
  const fallbackResumeDelay = Math.max(resolveDelay + 50, pauseDurationMs);
  const authoritativeResumeAtMs = Number.isFinite(Number(nextCast.resumeAtMs))
    ? Math.round(Number(nextCast.resumeAtMs))
    : null;
  const authoritativeHostResumeAtMs = Number.isFinite(Number(nextCast.hostResumeAtMs))
    ? Math.round(Number(nextCast.hostResumeAtMs))
    : null;
  const authoritativeHostCastStartAtMs = Number.isFinite(Number(nextCast.hostCastStartAtMs))
    ? Math.round(Number(nextCast.hostCastStartAtMs))
    : null;
  const effectiveClockOffsetMs = Number.isFinite(Number(nextCast.clockOffsetMs))
    ? Math.round(Number(nextCast.clockOffsetMs))
    : resolvePvpClockOffsetMs();
  const resumeDelayFromAuthority = Number.isFinite(authoritativeResumeAtMs)
    ? Math.round(authoritativeResumeAtMs - nowMs)
    : null;
  const resumeDelay = Number.isFinite(resumeDelayFromAuthority)
    ? Math.max(0, Math.min(pauseDurationMs, resumeDelayFromAuthority))
    : fallbackResumeDelay;
  console.info(
    `[PvP Sync] cast_timing castId=${nextCast.castId} localNow=${nowMs} pauseDurationMs=${pauseDurationMs} `
      + `clockOffsetMs=${effectiveClockOffsetMs} hostCastStartAtMs=${Number.isFinite(authoritativeHostCastStartAtMs) ? authoritativeHostCastStartAtMs : -1} `
      + `localCastStartAtMs=${Number.isFinite(expectedCastStartAtMs) ? expectedCastStartAtMs : -1} `
      + `hostResumeAtMs=${Number.isFinite(authoritativeHostResumeAtMs) ? authoritativeHostResumeAtMs : -1} `
      + `localResumeAtMs=${Number.isFinite(authoritativeResumeAtMs) ? authoritativeResumeAtMs : -1} `
      + `resolveDelayMs=${resolveDelay} fallbackResumeDelayMs=${fallbackResumeDelay} `
      + `resumeDelayMs=${resumeDelay} battleRemainingMsAtCast=${nextCast.battleRemainingMsAtCast}`
  );

  if (hasHitEvents) {
    scheduleSkillCastHitEvents(nextCast);
  } else {
    skillCastResolveTimer = setTimeout(() => {
      skillCastResolveTimer = null;
      if (isPvpTerminalState()) {
        console.info('[PvP End] skill_cast ignored: battle already ended');
        return;
      }
      applySkillCastAuthoritativeDamage(nextCast, 'resolve_at_ms');
    }, resolveDelay);
  }

  skillCastResumeTimer = setTimeout(() => {
    skillCastResumeTimer = null;
    const resumeNowMs = Date.now();
    const expectedResumeMs = Number.isFinite(Number(nextCast.resumeAtMs))
      ? Math.round(Number(nextCast.resumeAtMs))
      : null;
    const resumeSkewMs = Number.isFinite(expectedResumeMs)
      ? resumeNowMs - expectedResumeMs
      : null;
    if (isPvpTerminalState()) {
      console.info('[PvP End] skill_cast ignored: battle already ended');
      activeSkillCast = null;
      return;
    }
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
    markSkillAnimationExiting(nextCast, 'skill_cast_resume');
    emitSkillLifecycleStage('cast_end_animation', nextCast, {
      source: 'skill_cast_resume'
    });

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

    const finalizeResume = () => {
      if (isPvpTerminalState()) {
        console.info('[PvP End] skill_cast ignored: battle already ended');
        activeSkillCast = null;
        return;
      }
      const restoredBattleRemainingMs = syncBattleTimeFromSkillCast(nextCast);
      const normalizedRestoredBattleRemainingMs = Number.isFinite(Number(restoredBattleRemainingMs))
        ? Math.max(0, Math.round(Number(restoredBattleRemainingMs)))
        : (Number.isFinite(expectedBattleRemainingMsAtCast) ? expectedBattleRemainingMsAtCast : -1);
      setPaused(false);
      pendingSkillCastPostResumeTickTrace = {
        castId: nextCast.castId,
        resumeAtMs: Number.isFinite(Number(expectedResumeMs)) ? Math.round(Number(expectedResumeMs)) : resumeNowMs,
        restoredBattleRemainingMs: normalizedRestoredBattleRemainingMs,
        expectedBattleRemainingMsAtCast: Number.isFinite(expectedBattleRemainingMsAtCast)
          ? expectedBattleRemainingMsAtCast
          : normalizedRestoredBattleRemainingMs
      };
      emitSkillLifecycleStage('resume_battle', nextCast, {
        source: 'skill_cast_resume'
      });
      const animationCleared = !activeSkillAnimation.value || activeSkillAnimation.value.castId !== nextCast.castId;
      const endStateInputLocked = isPvpEndUiLocked();
      const logClockOffsetMs = Number.isFinite(Number(nextCast.clockOffsetMs))
        ? Math.round(Number(nextCast.clockOffsetMs))
        : resolvePvpClockOffsetMs();
      const logHostCastStartAtMs = Number.isFinite(Number(nextCast.hostCastStartAtMs))
        ? Math.round(Number(nextCast.hostCastStartAtMs))
        : -1;
      const logLocalCastStartAtMs = Number.isFinite(Number(nextCast.castStartAtMs))
        ? Math.round(Number(nextCast.castStartAtMs))
        : -1;
      const logHostResumeAtMs = Number.isFinite(Number(nextCast.hostResumeAtMs))
        ? Math.round(Number(nextCast.hostResumeAtMs))
        : -1;
      console.info(
        `[PvP Sync] skill_cast_resume castId=${nextCast.castId} localNow=${Date.now()} `
          + `clockOffsetMs=${logClockOffsetMs} hostCastStartAtMs=${logHostCastStartAtMs} localCastStartAtMs=${logLocalCastStartAtMs} `
          + `hostResumeAtMs=${logHostResumeAtMs} localResumeAtMs=${Number.isFinite(expectedResumeMs) ? expectedResumeMs : -1} `
          + `resumeDelayMs=${Number.isFinite(resumeSkewMs) ? resumeSkewMs : 'NaN'} `
          + `restoredBattleRemainingMs=${normalizedRestoredBattleRemainingMs} expectedBattleRemainingMsAtCast=${Number.isFinite(expectedBattleRemainingMsAtCast) ? expectedBattleRemainingMsAtCast : -1} `
          + `animationCleared=${animationCleared ? 'true' : 'false'} battleTimerResumed=${isPaused.value ? 'false' : 'true'} `
          + `inputLocked=${endStateInputLocked ? 'true' : 'false'}`
      );
      console.info(`[PvP Sync] skill_cast 結束 castId=${nextCast.castId}，恢復倒數`);
      activeSkillCast = null;
      tryStartQueuedSkillCast('next_cast');
    };

    void clearSkillAnimation('skill_cast_resume', nextCast);
    finalizeResume();
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
  const localNow = Date.now();
  const currentLocalBattleRemainingMs = Math.max(0, Math.round(Number(timeLeft.value ?? 0) * 1000));
  const authoritativeBattleRemainingMsAtCast = Math.max(0, Math.round(Number(cast.battleRemainingMsAtCast ?? 0)));
  const battleRemainingDiffMs = currentLocalBattleRemainingMs - authoritativeBattleRemainingMsAtCast;
  const resumeAtMs = Number.isFinite(Number(cast.resumeAtMs)) ? Math.round(Number(cast.resumeAtMs)) : -1;
  const hostResumeAtMs = Number.isFinite(Number(cast.hostResumeAtMs)) ? Math.round(Number(cast.hostResumeAtMs)) : -1;
  const localCastStartAtMs = Number.isFinite(Number(cast.castStartAtMs)) ? Math.round(Number(cast.castStartAtMs)) : -1;
  const hostCastStartAtMs = Number.isFinite(Number(cast.hostCastStartAtMs)) ? Math.round(Number(cast.hostCastStartAtMs)) : -1;
  const clockOffsetMs = Number.isFinite(Number(cast.clockOffsetMs)) ? Math.round(Number(cast.clockOffsetMs)) : resolvePvpClockOffsetMs();
  const effectDurationMs = Math.max(0, Math.round(Number(cast.effectDurationMs ?? 0)));
  console.info(
    `[PvP Sync] 收到skill_cast castId=${cast.castId} role=${cast.localRole} skillId=${cast.skillId} `
      + `clockOffsetMs=${clockOffsetMs} hostCastStartAtMs=${hostCastStartAtMs} localCastStartAtMs=${localCastStartAtMs} `
      + `hostResumeAtMs=${hostResumeAtMs} localResumeAtMs=${resumeAtMs} localNow=${localNow} `
      + `pauseDurationMs=${cast.pauseDurationMs} effectDurationMs=${effectDurationMs} `
      + `battleRemainingMsAtCast=${authoritativeBattleRemainingMsAtCast} currentLocalBattleRemainingMs=${currentLocalBattleRemainingMs} diffMs=${battleRemainingDiffMs} `
      + `animationKey=${cast.animationKey} queueReason=${reason}`
  );
  tryStartQueuedSkillCast('incoming_cast');
}

function dispatchHostSkillCast(castPayload = null, reason = 'host_dispatch') {
  if (!castPayload || typeof castPayload !== 'object') return;
  const authoritativeBattleRemainingMsAtCast = Math.max(0, Math.round(Number(castPayload.battleRemainingMsAtCast ?? 0)));
  const requestBattleRemainingMsAtRequest = Number(castPayload.requestBattleRemainingMsAtRequest);
  const hasRequestRemaining = Number.isFinite(requestBattleRemainingMsAtRequest);
  const requestRemainingMs = hasRequestRemaining ? Math.max(0, Math.round(requestBattleRemainingMsAtRequest)) : -1;
  const requestDiffMs = hasRequestRemaining
    ? (requestRemainingMs - authoritativeBattleRemainingMsAtCast)
    : Number.NaN;
  const resumeAtMs = Number.isFinite(Number(castPayload.resumeAtMs))
    ? Math.round(Number(castPayload.resumeAtMs))
    : -1;
  const castStartAtMs = Number.isFinite(Number(castPayload.castStartAtMs))
    ? Math.round(Number(castPayload.castStartAtMs))
    : -1;
  console.info(
    `[PvP Sync] host廣播skill_cast castId=${castPayload.castId} caster=${castPayload.casterPlayerId} skillId=${castPayload.skillId} `
      + `localNow=${Date.now()} authoritativeBattleRemainingMsAtCast=${authoritativeBattleRemainingMsAtCast} `
      + `requestBattleRemainingMsAtRequest=${requestRemainingMs} diffMs=${Number.isFinite(requestDiffMs) ? requestDiffMs : 'NaN'} `
      + `castStartAtMs=${castStartAtMs} resumeAtMs=${resumeAtMs} reason=${reason}`
  );
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

function isPvpTerminalState() {
  return Boolean(pvpTerminal.value || pvpBattleEnded.value);
}

function isPvpEndUiLocked() {
  return pvpEndUiState.phase === 'ending_fog' || pvpEndUiState.phase === 'result';
}

function applyPvpEndOutcomeToHp(localOutcome = '') {
  if (localOutcome === 'win') {
    opponentHp.value = 0;
    if (playerHp.value <= 0) playerHp.value = 1;
    return;
  }
  if (localOutcome === 'lose') {
    playerHp.value = 0;
    if (opponentHp.value <= 0) opponentHp.value = 1;
    return;
  }
  if (localOutcome === 'draw') {
    const hp = Math.max(1, Math.min(
      Math.max(0, Math.round(Number(playerMaxHp.value ?? 1))),
      Math.max(0, Math.round(Number(opponentMaxHp.value ?? 1))),
    ));
    playerHp.value = hp;
    opponentHp.value = hp;
  }
}

function buildPvpEndResultSnapshot(reason = 'unknown', result = {}) {
  const normalizedReason = String(reason || 'unknown').trim() || 'unknown';
  const explicitOutcome = normalizePvpLocalOutcome(result?.localOutcome);
  const currentOutcome = normalizePvpLocalOutcome(currentBattleOutcome.value) || 'draw';
  const localOutcome = explicitOutcome || currentOutcome;
  const inBattle = currentScreen.value === 'battle' && isCurrentBattlePvP.value;
  const explicitPhase = String(result?.phase ?? '').trim();
  const phase = explicitPhase || (inBattle ? 'ended' : 'idle');
  const sessionId = String(
    result?.matchSessionId
    ?? getCurrentPvpMatchSessionId()
    ?? endedMatchSessionId.value
    ?? ''
  ).trim();
  return {
    reason: normalizedReason,
    phase,
    localOutcome,
    message: String(result?.message ?? '').trim(),
    matchSessionId: sessionId,
    endedAtMs: Math.max(0, Math.round(Number(result?.endedAtMs ?? Date.now()))),
    hostHp: Math.max(0, Math.round(Number(result?.hostHp ?? playerHp.value))),
    guestHp: Math.max(0, Math.round(Number(result?.guestHp ?? opponentHp.value))),
    winner: result?.winner ?? null,
    loser: result?.loser ?? null,
    raw: result
  };
}

function lockPvpBattleInputForEnd(reason = 'unknown') {
  pvpBattleEnded.value = true;
  pvpTerminal.value = true;
  battleEndBroadcasted = true;
  clearPendingPvpStartTimer();
  clearPendingPvpEndFogTimer();
  clearRootCountdownTimer();
  clearPendingGuestSessionSyncRequestTimer();
  resetSkillCastSyncState();
  statusEffectEngine?.reset?.(`finalize_${reason}`);
  pendingPrepareBattleState = null;
  pendingSessionScopedPackets.length = 0;
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  matchmakingStatus.localReady = false;
  matchmakingStatus.opponentReady = false;
  matchmakingStatus.startPending = false;
  matchmakingStatus.startAtMs = 0;
  matchmakingStatus.fogPending = false;
  matchmakingStatus.fogEndAtMs = 0;
  countdownNowMs.value = Date.now();
  setPaused(true);
  if (gameState.value !== 'finishing') {
    gameState.value = 'finishing';
  }
  console.info('[PvP End] battle input locked before end fog');
  console.info('[PvP End] all skill/status timers cancelled');
  console.info('[PvP End] timers cleared');
  console.info('[PvP End] ready state cleared');
}

function completePvpEndSequence(reason = 'unknown') {
  if (pvpEndUiState.phase !== 'ending_fog') {
    if (pvpEndUiState.phase === 'result') {
      console.info('[PvP UI] result view locked after end fog');
    }
    return;
  }
  const snapshot = pvpEndUiState.result && typeof pvpEndUiState.result === 'object'
    ? pvpEndUiState.result
    : buildPvpEndResultSnapshot(reason, {});

  clearPendingPvpEndFogTimer();
  pvpEndUiState.phase = 'result';
  pvpEndUiState.completedAtMs = Date.now();

  applyPvpEndOutcomeToHp(snapshot.localOutcome);
  gameState.value = 'gameResult';
  setPaused(true);

  if (snapshot.matchSessionId) {
    markEndedMatchSession(snapshot.matchSessionId, `complete_${snapshot.reason}`);
  }

  clearCurrentPvpMatchSessionId(`complete_${snapshot.reason}`);
  matchmakingStatus.phase = snapshot.phase === 'idle' ? 'idle' : 'ended';
  matchmakingStatus.message = snapshot.message || (snapshot.phase === 'idle'
    ? '對戰已結束，請重新配對。'
    : '對戰已結束。');
  matchmakingStatus.errorMessage = '';
  matchmakingStatus.queueSeconds = 0;
  matchmakingStatus.expectedPlayerCount = 0;
  matchmakingStatus.connectedPlayerCount = 0;
  matchmakingStatus.opponentProfile = null;

  console.info('[PvP End] end fog complete, mount result screen');
  console.info('[PvP End] result screen mounted after end fog');
  console.info('[PvP UI] result view locked after end fog');
  console.info(`[PvP End] phase set to ${matchmakingStatus.phase}`);

  rootFogOverlayPhase.value = 'fade-out';
  pendingRootFogFadeOutTimer = setTimeout(() => {
    pendingRootFogFadeOutTimer = null;
    rootFogOverlayVisible.value = false;
    rootFogOverlayPhase.value = 'pre';
  }, 320);
}

function beginPvpEndSequence(reason = 'unknown', result = {}) {
  const snapshot = buildPvpEndResultSnapshot(reason, result);
  const currentSessionId = snapshot.matchSessionId;
  const inBattle = currentScreen.value === 'battle' && isCurrentBattlePvP.value;

  if (!inBattle) {
    finalizePvpBattle(snapshot.reason, {
      ...result,
      phase: snapshot.phase,
      localOutcome: snapshot.localOutcome,
      matchSessionId: snapshot.matchSessionId,
      message: snapshot.message
    });
    return;
  }

  if (pvpEndUiState.phase === 'ending_fog') {
    if (!currentSessionId || currentSessionId === pvpEndUiState.matchSessionId) {
      console.info('[PvP End] duplicate end ignored during ending_fog');
      return;
    }
  }
  if (pvpEndUiState.phase === 'result') {
    if (!currentSessionId || currentSessionId === pvpEndUiState.matchSessionId) {
      console.info(`[PvP End] duplicate end ignored session=${currentSessionId || pvpEndUiState.matchSessionId || 'none'}`);
      console.info('[PvP End] finalize skipped: already terminal');
      return;
    }
  }

  console.info(`[PvP End] begin end sequence reason=${snapshot.reason}`);
  lockPvpBattleInputForEnd(snapshot.reason);
  pvpEndUiState.phase = 'ending_fog';
  pvpEndUiState.reason = snapshot.reason;
  pvpEndUiState.matchSessionId = snapshot.matchSessionId;
  pvpEndUiState.result = snapshot;
  pvpEndUiState.startedAtMs = Date.now();
  pvpEndUiState.completedAtMs = 0;

  matchmakingStatus.phase = 'ending';
  matchmakingStatus.message = snapshot.message || '對戰已結束，正在結算結果...';
  console.info('[PvP UI] battle kept as background during ending_fog');

  const timeline = resolveFogTimeline(PVP_END_FOG_DURATION_MS);
  rootFogTimeline.durationMs = timeline.totalMs;
  rootFogTimeline.thinEndMs = timeline.thinEndMs;
  rootFogTimeline.buildEndMs = timeline.buildEndMs;
  rootFogTimeline.holdEndMs = timeline.holdEndMs;
  rootFogOverlayVisible.value = true;
  rootFogOverlayPhase.value = 'pre';
  console.info('[PvP End] end fog start');

  scheduleRootFogPhaseTimer(0, () => {
    rootFogOverlayPhase.value = 'thin';
  });
  scheduleRootFogPhaseTimer(timeline.thinEndMs, () => {
    rootFogOverlayPhase.value = 'build';
  });
  scheduleRootFogPhaseTimer(timeline.buildEndMs, () => {
    rootFogOverlayPhase.value = 'hold';
    console.info('[PvP End] end fog full density');
  });

  clearPendingPvpEndFogTimer();
  pendingPvpEndFogCompleteTimer = setTimeout(() => {
    pendingPvpEndFogCompleteTimer = null;
    completePvpEndSequence(snapshot.reason);
  }, timeline.holdEndMs);
}

function resetPvpTerminalState(reason = 'reset') {
  if (!pvpTerminal.value && !pvpBattleEnded.value) return;
  console.info(`[PvP End] reset terminal state reason=${reason}`);
  pvpTerminal.value = false;
  pvpBattleEnded.value = false;
  clearActiveEndedMatchSession(`terminal_reset_${reason}`);
  clearPvpEndUiState(`terminal_reset_${reason}`);
  rootFogOverlayVisible.value = false;
  rootFogOverlayPhase.value = 'pre';
}

function finalizePvpBattle(reason = 'unknown', result = {}) {
  const normalizedReason = String(reason || 'unknown').trim() || 'unknown';
  const snapshot = buildPvpEndResultSnapshot(normalizedReason, result);
  const inPvpBattle = currentScreen.value === 'battle' && isCurrentBattlePvP.value;
  const nextPhase = snapshot.phase;
  const localOutcome = snapshot.localOutcome;
  const explicitMessage = snapshot.message;
  const resolvedMatchSessionId = snapshot.matchSessionId;
  const sameEndedSession = Boolean(
    resolvedMatchSessionId
    && isRecentlyEndedMatchSession(resolvedMatchSessionId)
  );

  if (isPvpTerminalState() && sameEndedSession && nextPhase !== 'idle') {
    if (normalizedReason.includes('battle_end')) {
      console.info('[PvP End] duplicate battle_end ignored after forfeit');
    } else {
      console.info(`[PvP End] duplicate end ignored session=${resolvedMatchSessionId}`);
    }
    console.info('[PvP End] finalize skipped: already terminal');
    return;
  }
  if (isPvpTerminalState() && !resolvedMatchSessionId && nextPhase !== 'idle') {
    console.info('[PvP End] finalize skipped: already terminal');
    return;
  }

  console.info(`[PvP End] finalizePvpBattle reason=${normalizedReason}`);
  pvpBattleEnded.value = true;
  pvpTerminal.value = true;
  battleEndBroadcasted = true;

  clearPendingPvpStartTimer();
  clearRootCountdownTimer();
  clearPendingGuestSessionSyncRequestTimer();
  resetSkillCastSyncState();
  statusEffectEngine?.reset?.(`finalize_${normalizedReason}`);
  console.info('[PvP End] all skill/status timers cancelled');
  pendingPrepareBattleState = null;
  pendingSessionScopedPackets.length = 0;
  countdownNowMs.value = Date.now();
  const shouldKeepActiveEndFog = pvpEndUiState.phase === 'ending_fog' && inPvpBattle && nextPhase !== 'idle';
  if (!shouldKeepActiveEndFog) {
    rootFogOverlayVisible.value = false;
    rootFogOverlayPhase.value = 'pre';
  }
  console.info('[PvP End] timers cleared');

  matchmakingStatus.localReady = false;
  matchmakingStatus.opponentReady = false;
  matchmakingStatus.startPending = false;
  matchmakingStatus.startAtMs = 0;
  matchmakingStatus.fogPending = false;
  matchmakingStatus.fogEndAtMs = 0;
  console.info('[PvP End] ready state cleared');

  if (inPvpBattle) {
    applyPvpEndOutcomeToHp(localOutcome);
    if (gameState.value !== 'gameResult') {
      gameState.value = 'gameResult';
    }
    setPaused(true);
    console.info('[PvP End] battle input locked');
    if (normalizedReason === 'remote_forfeit') {
      console.info('[PvP End] result screen mounted reason=remote_forfeit');
    }
  }

  if (resolvedMatchSessionId) {
    markEndedMatchSession(resolvedMatchSessionId, normalizedReason);
  }
  clearPvpEndUiState(`finalize_${normalizedReason}`);
  clearCurrentPvpMatchSessionId(`finalize_${normalizedReason}`);
  matchmakingStatus.phase = nextPhase;
  matchmakingStatus.message = explicitMessage || (nextPhase === 'idle'
    ? '對戰已結束，請重新配對。'
    : '對戰已結束。');
  matchmakingStatus.errorMessage = '';
  matchmakingStatus.queueSeconds = 0;
  matchmakingStatus.expectedPlayerCount = 0;
  matchmakingStatus.connectedPlayerCount = 0;
  matchmakingStatus.opponentProfile = null;
  console.info(`[PvP End] phase set to ${nextPhase}`);
}

function handleSkillCastRequest(payload = {}, sourcePlayerId = '') {
  if (!isCurrentPlayerMatchHost()) return;
  if (!isCurrentBattlePvP.value || currentScreen.value !== 'battle') return;
  if (isPvpTerminalState()) {
    console.info('[PvP End] skill_cast ignored: battle already ended');
    return;
  }
  if (gameState.value === 'gameResult' || gameState.value === 'finishing') return;
  const requesterId = String(sourcePlayerId ?? '').trim();
  if (!requesterId) return;
  const localPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
  const opponentPlayerId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  const requestedSkillId = String(payload?.skillId ?? '').trim();
  if (!requestedSkillId) return;
  const requestedSkill = resolveSkillDefinitionById(requestedSkillId);
  const requestBattleRemainingMsAtRequest = Number.isFinite(Number(payload?.requestedBattleRemainingMs))
    ? Math.max(0, Math.round(Number(payload.requestedBattleRemainingMs)))
    : null;
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
  if (requestBattleRemainingMsAtRequest !== null) {
    authoritativeCast.requestBattleRemainingMsAtRequest = requestBattleRemainingMsAtRequest;
  }
  const authoritativeBattleRemainingMsAtCast = Math.max(0, Math.round(Number(authoritativeCast.battleRemainingMsAtCast ?? 0)));
  const requestVsCastDiffMs = requestBattleRemainingMsAtRequest === null
    ? Number.NaN
    : (requestBattleRemainingMsAtRequest - authoritativeBattleRemainingMsAtCast);
  console.info(
    `[PvP Sync] host_authoritative_cast castId=${authoritativeCast.castId} localNow=${Date.now()} `
      + `authoritativeBattleRemainingMsAtCast=${authoritativeBattleRemainingMsAtCast} `
      + `requestBattleRemainingMsAtRequest=${requestBattleRemainingMsAtRequest ?? -1} `
      + `diffMs=${Number.isFinite(requestVsCastDiffMs) ? requestVsCastDiffMs : 'NaN'} source=remote_request`
  );
  dispatchHostSkillCast(authoritativeCast, 'host_handle_request');
}

function resetPvpReadyState() {
  clearPendingPvpStartTimer();
  clearPendingGuestSessionSyncRequestTimer();
  resetSkillCastSyncState();
  pendingPrepareBattleState = null;
  pvpCountdownClockOffsetMs = 0;
  pvpClockOffsetMs = 0;
  statusEffectEngine?.reset?.('reset_pvp_ready_state');
  if (!isPvpEndUiLocked()) {
    rootFogOverlayVisible.value = false;
    rootFogOverlayPhase.value = 'pre';
  }
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
  if (!isPvpTerminalState()) {
    battleEndBroadcasted = false;
  }
  lastPvpBattleSeed = '';
}

function refreshPvpReadyMessage() {
  if (matchmakingStatus.phase !== 'matched') return;
  if (!getCurrentPvpMatchSessionId()) {
    matchmakingStatus.message = '配對成功，正在同步對戰會話...';
    return;
  }
  if (!hasActiveMatchedOpponent()) {
    matchmakingStatus.message = '配對連線確認中，請稍候...';
    return;
  }
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
  if (isPvpTerminalState()) {
    console.info('[PvP End] start_battle blocked: terminal');
    return;
  }
  if (currentScreen.value === 'battle' && battleSessionMode.value === 'pvp') return;
  const fogDurationRaw = Number(options?.fogDurationMs ?? PVP_FOG_TRANSITION_MS);
  const timeline = resolveFogTimeline(fogDurationRaw);
  const fogDurationMs = timeline.totalMs;
  const normalizedFogStartAt = Number.isFinite(Number(fogStartAtMs))
    ? Number(fogStartAtMs)
    : Date.now();
  const nowMs = Date.now();
  const battleAt = normalizedFogStartAt + fogDurationMs;
  const delay = Math.max(0, battleAt - nowMs);
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
  console.info(`[PvP Sync] 霧化轉場啟動 fogDuration=${fogDurationMs}ms battleAt=${Math.round(battleAt)} battleDelay=${Math.round(delay)}ms thinEnd=${timeline.thinEndMs} buildEnd=${timeline.buildEndMs}`);
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

function normalizeBattleGoPayload(rawPayload = {}) {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
  const countdownMsRaw = Number(payload.countdownMs);
  const countdownMs = Number.isFinite(countdownMsRaw) && countdownMsRaw > 0
    ? Math.max(PVP_FALLBACK_COUNTDOWN_MS, Math.round(countdownMsRaw))
    : PVP_FALLBACK_COUNTDOWN_MS;
  const fogDurationMsRaw = Number(payload.fogDurationMs);
  const fogDurationMs = Number.isFinite(fogDurationMsRaw) && fogDurationMsRaw > 0
    ? Math.max(1500, Math.min(2200, Math.round(fogDurationMsRaw)))
    : PVP_FOG_TRANSITION_MS;
  const startAtRaw = Number(payload.startAt);
  const startAt = Number.isFinite(startAtRaw) && startAtRaw > 0
    ? Math.round(startAtRaw)
    : 0;
  return {
    seed: String(payload.seed ?? '').trim(),
    prepareId: String(payload.prepareId ?? '').trim(),
    countdownMs,
    fogDurationMs,
    startAt,
    matchSessionId: String(payload.matchSessionId ?? '').trim()
  };
}

function scheduleBattleStartFromBattleGo(rawPayload = {}, source = 'unknown') {
  if (isPvpTerminalState()) {
    console.info('[PvP End] start_battle blocked: terminal');
    return;
  }
  const normalized = normalizeBattleGoPayload(rawPayload);
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
  const currentSessionId = getCurrentPvpMatchSessionId();
  if (normalized.matchSessionId && currentSessionId && normalized.matchSessionId !== currentSessionId) {
    console.info(`[PvP Sync] ignored stale PvP message type=battle_go incoming=${normalized.matchSessionId} current=${currentSessionId}`);
    return;
  }

  const hostStartAtMsRaw = Number(payload.startAt);
  const hostStartAtMs = Number.isFinite(hostStartAtMsRaw) && hostStartAtMsRaw > 0
    ? Math.round(hostStartAtMsRaw)
    : (normalized.startAt > 0 ? normalized.startAt : Number.NaN);
  const localReceivedAtMs = Date.now();
  const localCountdownMs = normalized.countdownMs;
  const isHost = isCurrentPlayerMatchHost();
  if (isHost) {
    pvpClockOffsetMs = 0;
    pvpCountdownClockOffsetMs = 0;
  }
  if (!isHost && Number.isFinite(hostStartAtMs) && localCountdownMs > 0) {
    const referenceLocalStartAtMs = localReceivedAtMs + localCountdownMs;
    const computedOffsetMs = Math.round(referenceLocalStartAtMs - hostStartAtMs);
    pvpClockOffsetMs = computedOffsetMs;
    pvpCountdownClockOffsetMs = computedOffsetMs;
  }
  const adjustedHostStartAtMs = Number.isFinite(hostStartAtMs)
    ? Math.round(hostStartAtMs + (isHost ? 0 : pvpCountdownClockOffsetMs))
    : Number.NaN;
  const rawRemainingMs = Number.isFinite(adjustedHostStartAtMs)
    ? Math.round(adjustedHostStartAtMs - localReceivedAtMs)
    : Number.NaN;
  const effectiveStartAtMs = Number.isFinite(adjustedHostStartAtMs)
    ? adjustedHostStartAtMs
    : (localReceivedAtMs + localCountdownMs);
  const fallback = !Number.isFinite(hostStartAtMs);

  console.info(
    `[PvP Sync] scheduleBattleStartFromBattleGo source=${source} hostStartAtMs=${Number.isFinite(hostStartAtMs) ? Math.round(hostStartAtMs) : -1} `
      + `adjustedHostStartAtMs=${Number.isFinite(adjustedHostStartAtMs) ? adjustedHostStartAtMs : -1} `
      + `localReceivedAtMs=${localReceivedAtMs} rawRemainingMs=${Number.isFinite(rawRemainingMs) ? rawRemainingMs : 'NaN'} `
      + `localCountdownMs=${localCountdownMs} offsetMs=${pvpCountdownClockOffsetMs} pvpClockOffsetMs=${pvpClockOffsetMs} isHost=${isHost ? 'true' : 'false'} fallback=${fallback ? 'true' : 'false'}`
  );

  startPreBattleCountdown({
    source: `battle_go_schedule_${source}`,
    startAt: effectiveStartAtMs,
    fogDurationMs: normalized.fogDurationMs,
    matchSessionId: normalized.matchSessionId || currentSessionId,
    seed: normalized.seed
  });
}

function startPreBattleCountdown({
  startAt = Date.now(),
  fogDurationMs = PVP_FOG_TRANSITION_MS,
  seed = '',
  matchSessionId = '',
  source = 'unknown'
} = {}) {
  if (isPvpTerminalState()) {
    console.info('[PvP End] start_battle blocked: terminal');
    return;
  }
  if (currentScreen.value === 'battle' && battleSessionMode.value === 'pvp') return;
  const currentSessionId = getCurrentPvpMatchSessionId();
  const normalizedSessionId = String(matchSessionId || '').trim();
  if (normalizedSessionId && currentSessionId && normalizedSessionId !== currentSessionId) {
    console.info(`[PvP Sync] ignored stale PvP message type=start_battle incoming=${normalizedSessionId} current=${currentSessionId}`);
    return;
  }
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
  if (isPvpTerminalState()) {
    console.info('[PvP End] checkBothReady blocked: terminal');
    console.info('[PvP Sync] checkBothReady blocked: terminal or invalid session');
    return;
  }
  const matchSessionId = getCurrentPvpMatchSessionId();
  const opponentId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  const connectedCount = normalizeConnectedPlayerCount(matchmakingStatus.connectedPlayerCount);
  const hasValidMatch = matchmakingStatus.phase === 'matched'
    && Boolean(matchSessionId)
    && connectedCount > 0
    && Boolean(opponentId)
    && opponentId !== 'pending-opponent';

  if (!hasValidMatch) {
    console.info('[PvP Sync] checkBothReady blocked: terminal or invalid session');
    console.info(`[PvP Sync] checkBothReady blocked: invalid match or no active opponent phase=${matchmakingStatus.phase} session=${matchSessionId || 'none'} connected=${connectedCount} opponentId=${opponentId || 'none'}`);
    return;
  }
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
  const prepareId = `prepare-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const countdownMs = PVP_FALLBACK_COUNTDOWN_MS;
  const preparePayload = {
    mode: 'pvp',
    seed,
    prepareId,
    countdownMs,
    fogDurationMs: PVP_FOG_TRANSITION_MS,
    matchSessionId
  };
  pendingPrepareBattleState = {
    ...preparePayload,
    goSent: false,
    ackPlayerId: ''
  };
  matchmakingStatus.startPending = true;
  refreshPvpReadyMessage();
  console.info(`[PvP Sync] host送出prepare_battle prepareId=${prepareId} seed=${seed}`);
  void sendPvpRealtimeEvent('prepare_battle', preparePayload);
}

function markLocalPlayerReady() {
  if (isPvpTerminalState()) {
    console.info('[PvP End] checkBothReady blocked: terminal');
    return;
  }
  if (matchmakingStatus.phase !== 'matched') return;
  if (matchmakingStatus.startPending) return;
  const matchSessionId = getCurrentPvpMatchSessionId();
  if (!matchSessionId) {
    console.info('[PvP Sync] 無法準備：尚未同步 matchSessionId');
    refreshPvpReadyMessage();
    return;
  }
  if (!hasActiveMatchedOpponent()) {
    console.info('[PvP Sync] 無法準備：目前沒有有效對手連線');
    refreshPvpReadyMessage();
    return;
  }
  const nextReady = !matchmakingStatus.localReady;
  matchmakingStatus.localReady = nextReady;
  refreshPvpReadyMessage();
  console.info(`[PvP Sync] 本機${nextReady ? '送出ready' : '取消ready'}`);
  if (nextReady && isCurrentPlayerMatchHost()) {
    const sessionId = getCurrentPvpMatchSessionId();
    if (sessionId) {
      void sendPvpRealtimeEvent('session_sync', {
        matchSessionId: sessionId,
        sessionIssuedAtMs: Number(matchmakingStatus.matchedEnteredAtMs || Date.now()),
        source: 'host_ready_resync'
      });
    }
  }
  if (nextReady) {
    void broadcastLocalPvpProfileSync('local_ready');
  }
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
  remotePvpDisplayNameByPlayer.clear();
  clearCurrentPvpMatchSessionId('reset_realtime_state');
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
  const sessionScoped = PVP_SESSION_SCOPED_MESSAGE_TYPES.has(eventType);
  const currentSessionId = getCurrentPvpMatchSessionId();
  const nextPayload = payload && typeof payload === 'object'
    ? { ...payload }
    : {};
  const payloadSessionId = String(nextPayload.matchSessionId ?? '').trim();
  const resolvedSessionId = payloadSessionId || currentSessionId;

  if (sessionScoped && !resolvedSessionId) {
    console.info(`[PvP Sync] skip sendRealtimeEvent type=${eventType} reason=missing_matchSessionId`);
    return;
  }
  if (resolvedSessionId) {
    nextPayload.matchSessionId = resolvedSessionId;
  }

  const packet = {
    version: 1,
    type: eventType,
    seq: nextLocalPvpEventSeq(),
    ts: Date.now(),
    matchSessionId: resolvedSessionId || '',
    payload: nextPayload
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

function emitHostBattleEndPacket(reason = 'state_watch', { immediate = false } = {}) {
  if (!isCurrentBattlePvP.value) return null;
  if (!isCurrentPlayerMatchHost()) return null;
  if (battleEndBroadcasted) return null;

  const hostPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
  const guestPlayerId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  const battleEndId = `battle-end-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const packet = {
    battleEndId,
    hostPlayerId,
    guestPlayerId,
    hostHp: Math.max(0, Math.round(Number(playerHp.value ?? 0))),
    guestHp: Math.max(0, Math.round(Number(opponentHp.value ?? 0))),
    endedAtMs: Date.now()
  };
  battleEndBroadcasted = true;
  if (immediate) {
    console.info(`[PvP Sync] host立即送出battle_end battleEndId=${battleEndId} reason=${reason}`);
  } else {
    console.info(`[PvP Sync] host送出battle_end battleEndId=${battleEndId} reason=${reason}`);
  }
  void sendPvpRealtimeEvent('battle_end', packet);
  return packet;
}

function broadcastHostBattleEndNow(reason = 'skill_cast_complete') {
  const battleEndPacket = emitHostBattleEndPacket(reason, { immediate: true });
  if (!battleEndPacket) return;
  const localOutcome = playerHp.value > opponentHp.value
    ? 'win'
    : (playerHp.value < opponentHp.value ? 'lose' : 'draw');
  beginPvpEndSequence(`host_battle_end_${reason}`, {
    phase: 'ended',
    matchSessionId: String(battleEndPacket.matchSessionId ?? getCurrentPvpMatchSessionId() ?? '').trim(),
    localOutcome,
    message: '對戰已結束。'
  });
}

function maybeBroadcastHostBattleEnd(reason = 'state_watch') {
  if (!isCurrentBattlePvP.value) return;
  if (currentScreen.value !== 'battle') return;
  if (gameState.value !== 'gameResult') return;
  if (isPvpEndUiLocked()) return;
  const battleEndPacket = emitHostBattleEndPacket(reason, { immediate: false });
  if (!battleEndPacket) return;
  const localOutcome = playerHp.value > opponentHp.value
    ? 'win'
    : (playerHp.value < opponentHp.value ? 'lose' : 'draw');
  beginPvpEndSequence(`host_battle_end_${reason}`, {
    phase: 'ended',
    matchSessionId: String(battleEndPacket.matchSessionId ?? getCurrentPvpMatchSessionId() ?? '').trim(),
    localOutcome,
    message: '對戰已結束。'
  });
}

async function handlePlayerSkillUse(skill = null) {
  if (!skill || typeof skill !== 'object') return;

  if (!isCurrentBattlePvP.value || currentScreen.value !== 'battle') {
    if (
      battleSessionMode.value === 'pve'
      && currentScreen.value === 'battle'
      && String(selectedStageId.value ?? '').trim() === STAGE_IDS.STAGE_02
    ) {
      return;
    }
    if (isStage02SkillLessonCastStepActive()) {
      const castExecuted = await useSkillCore(skill, { allowWhenPaused: true });
      if (!castExecuted) return;
      stage02SkillLessonState.awaitingSkillCast = false;
      stage02SkillLessonState.completed = true;
      if (opponentHp.value > 0) {
        forceOpponentDefeat();
      }
      advanceTutorialStep();
      return;
    }

    if (isStage02TutorialBattle() && !isStage02SkillLessonCastStepActive()) {
      return;
    }

    await useSkillCore(skill);
    return;
  }

  if (isPvpTerminalState() || gameState.value === 'gameResult' || gameState.value === 'finishing') {
    console.info('[PvP End] skill_cast ignored: battle already ended');
    return;
  }

  const resolvedSkill = resolveSkillDefinitionById(skill.id);
  if (!canUseSkillInPvp(resolvedSkill)) return;

  const localPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
  const opponentPlayerId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
  const targetRule = resolveSkillTargetRule(resolvedSkill);
  const targetPlayerIdForCast = targetRule === 'self' ? localPlayerId : opponentPlayerId;
  const requestCastId = `cast-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const battleRemainingMsAtRequest = Math.max(0, Math.round(Number(timeLeft.value ?? 0) * 1000));
  console.info(
    `[PvP Sync] local_skill_request castId=${requestCastId} role=caster localNow=${Date.now()} `
      + `battleRemainingMsAtRequest=${battleRemainingMsAtRequest} skillId=${resolvedSkill.id}`
  );
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
    battleRemainingMsAtRequest
  });

  if (isCurrentPlayerMatchHost()) {
    const castPayload = buildHostAuthoritativeSkillCastPayload({
      skillId: resolvedSkill.id,
      casterPlayerId: localPlayerId,
      targetPlayerId: targetPlayerIdForCast,
      castId: requestCastId
    });
    castPayload.requestBattleRemainingMsAtRequest = battleRemainingMsAtRequest;
    const authoritativeBattleRemainingMsAtCast = Math.max(0, Math.round(Number(castPayload.battleRemainingMsAtCast ?? 0)));
    console.info(
      `[PvP Sync] host_authoritative_cast castId=${castPayload.castId} localNow=${Date.now()} `
        + `authoritativeBattleRemainingMsAtCast=${authoritativeBattleRemainingMsAtCast} `
        + `requestBattleRemainingMsAtRequest=${battleRemainingMsAtRequest} `
        + `diffMs=${battleRemainingMsAtRequest - authoritativeBattleRemainingMsAtCast} source=local_host`
    );
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
  playGuestSkillRequestFeedback(resolvedSkill);
  console.info(`[PvP Sync] guest送出skill_cast_request castId=${requestCastId} skillId=${resolvedSkill.id}`);
  void sendPvpRealtimeEvent('skill_cast_request', {
    requestCastId,
    skillId: resolvedSkill.id,
    animationKey: resolvedSkill.animationKey,
    requestedAtMs: Date.now(),
    requestedBattleRemainingMs: battleRemainingMsAtRequest
  });
}

function handleLocalPvpAttack(event = {}) {
  if (!isCurrentBattlePvP.value) return;
  if (currentScreen.value !== 'battle') return;
  if (isPvpTerminalState() || gameState.value === 'gameResult' || gameState.value === 'finishing') {
    console.info('[PvP End] damage ignored: battle already ended');
    return;
  }
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

  const packetState = String(normalizedPacket?.state ?? '').trim().toLowerCase();
  if (packetState === 'disconnected') {
    const reason = 'remote_disconnected';
    const inBattle = isCurrentBattlePvP.value && currentScreen.value === 'battle';
    if (inBattle) {
      beginPvpEndSequence(reason, {
        phase: 'ended',
        localOutcome: 'win',
        message: '對手已離線，判定你獲勝。'
      });
    } else {
      finalizePvpBattle(reason, {
        phase: 'idle',
        message: '對手已離線，請重新配對。'
      });
    }
    return;
  }

  const type = String(normalizedPacket.type ?? '').trim();
  console.info(`[PvP Sync] 解析後message.type=${type || 'unknown'}`);
  if (!type) return;
  if (isPvpTerminalState() && isPvpEndUiLocked() && type !== 'forfeit' && type !== 'battle_end') {
    console.info(`[PvP End] ${type} ignored: battle already ended`);
    return;
  }

  if (type === 'session_sync') {
    if (matchmakingStatus.phase !== 'matched' && matchmakingStatus.phase !== 'searching') return;
    const sourcePlayerId = String(normalizedPacket?._sourcePlayerId ?? '').trim();
    const opponentPlayerId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
    if (sourcePlayerId && opponentPlayerId && sourcePlayerId !== opponentPlayerId) {
      console.info('[PvP Sync] ignored stale PvP message type=session_sync reason=unexpected_sender');
      return;
    }
    const syncedSessionId = resolvePacketMatchSessionId(normalizedPacket);
    if (!syncedSessionId) return;
    const currentSessionId = getCurrentPvpMatchSessionId();
    if (!currentSessionId) {
      if (!canAcceptInitialSessionSync(normalizedPacket)) {
        console.info('[PvP Sync] ignored stale PvP message type=session_sync reason=no_valid_opponent_context');
        return;
      }
      console.info(`[PvP Sync] accepted host session_sync matchSessionId=${syncedSessionId}`);
      setCurrentPvpMatchSessionId(syncedSessionId, 'remote_session_sync_first_accept');
      console.info('[PvP Sync] currentMatchSessionId set from host');
      refreshPvpReadyMessage();
      return;
    }

    if (currentSessionId !== syncedSessionId) {
      console.info(`[PvP Sync] ignored stale PvP message type=session_sync incoming=${syncedSessionId} current=${currentSessionId}`);
      return;
    }

    setCurrentPvpMatchSessionId(syncedSessionId, 'remote_session_sync_refresh');
    refreshPvpReadyMessage();
    return;
  }

  if (type === 'session_sync_request') {
    if (!isCurrentPlayerMatchHost()) return;
    if (!hasActiveMatchedOpponent()) return;
    if (!isPacketFromCurrentMatchedOpponent(normalizedPacket)) return;
    hostResendSessionSync('session_sync_request');
    return;
  }

  if (type === 'prepare_battle') {
    if (isPvpTerminalState()) {
      console.info('[PvP End] start_battle blocked: terminal');
      return;
    }
    if (matchmakingStatus.phase !== 'matched') return;
    if (!hasActiveMatchedOpponent()) return;
    const sourcePlayerId = String(normalizedPacket?._sourcePlayerId ?? '').trim();
    if (!isPacketFromCurrentMatchedOpponent(normalizedPacket)) return;
    if (isCurrentPlayerMatchHost()) return;
    const normalized = normalizeBattleGoPayload({
      ...normalizedPacket.payload,
      matchSessionId: resolvePacketMatchSessionId(normalizedPacket)
    });
    if (!normalized.prepareId) return;
    pendingPrepareBattleState = {
      ...normalized,
      goSent: false,
      ackPlayerId: sourcePlayerId
    };
    matchmakingStatus.startPending = true;
    refreshPvpReadyMessage();
    console.info(`[PvP Sync] guest收到prepare_battle prepareId=${normalized.prepareId}`);
    void sendPvpRealtimeEvent('prepare_ack', {
      prepareId: normalized.prepareId,
      seed: normalized.seed,
      countdownMs: normalized.countdownMs,
      fogDurationMs: normalized.fogDurationMs
    });
    return;
  }

  if (type === 'prepare_ack') {
    if (isPvpTerminalState()) {
      console.info('[PvP End] start_battle blocked: terminal');
      return;
    }
    if (matchmakingStatus.phase !== 'matched') return;
    if (!hasActiveMatchedOpponent()) return;
    if (!isCurrentPlayerMatchHost()) return;
    if (!isPacketFromCurrentMatchedOpponent(normalizedPacket)) return;
    const prepareId = String(normalizedPacket?.payload?.prepareId ?? '').trim();
    if (!prepareId) return;
    if (!pendingPrepareBattleState || pendingPrepareBattleState.prepareId !== prepareId) {
      console.info(`[PvP Sync] 忽略prepare_ack，prepareId不一致 incoming=${prepareId}`);
      return;
    }
    if (pendingPrepareBattleState.goSent) return;
    pendingPrepareBattleState.goSent = true;
    pendingPrepareBattleState.ackPlayerId = String(normalizedPacket?._sourcePlayerId ?? '').trim();
    const battleGoStartAt = Date.now() + Math.max(PVP_FALLBACK_COUNTDOWN_MS, Math.round(Number(pendingPrepareBattleState.countdownMs) || PVP_FALLBACK_COUNTDOWN_MS));
    pendingPrepareBattleState.startAt = battleGoStartAt;
    console.info(`[PvP Sync] host收到prepare_ack，送出battle_go prepareId=${prepareId}`);
    void sendPvpRealtimeEvent('battle_go', {
      prepareId: pendingPrepareBattleState.prepareId,
      seed: pendingPrepareBattleState.seed,
      countdownMs: pendingPrepareBattleState.countdownMs,
      fogDurationMs: pendingPrepareBattleState.fogDurationMs,
      startAt: battleGoStartAt
    });
    scheduleBattleStartFromBattleGo({
      ...pendingPrepareBattleState,
      startAt: battleGoStartAt,
      matchSessionId: getCurrentPvpMatchSessionId()
    }, 'host_after_prepare_ack');
    return;
  }

  if (type === 'battle_go') {
    if (isPvpTerminalState()) {
      console.info('[PvP End] start_battle blocked: terminal');
      return;
    }
    if (matchmakingStatus.phase !== 'matched') return;
    if (!hasActiveMatchedOpponent()) return;
    const sourcePlayerId = String(normalizedPacket?._sourcePlayerId ?? '').trim();
    if (sourcePlayerId && !isCurrentPlayerMatchHost() && !isPacketFromCurrentMatchedOpponent(normalizedPacket)) return;
    if (sourcePlayerId && isCurrentPlayerMatchHost() && sourcePlayerId !== resolveMatchPlayerId(matchmakingStatus.localProfile)) {
      return;
    }
    const normalized = normalizeBattleGoPayload({
      ...normalizedPacket.payload,
      matchSessionId: resolvePacketMatchSessionId(normalizedPacket)
    });
    if (pendingPrepareBattleState && normalized.prepareId && pendingPrepareBattleState.prepareId && pendingPrepareBattleState.prepareId !== normalized.prepareId) {
      console.info(`[PvP Sync] 忽略battle_go，prepareId不一致 incoming=${normalized.prepareId}`);
      return;
    }
    pendingPrepareBattleState = {
      ...normalized,
      goSent: true,
      ackPlayerId: sourcePlayerId
    };
    scheduleBattleStartFromBattleGo({
      ...normalized,
      matchSessionId: resolvePacketMatchSessionId(normalizedPacket)
    }, sourcePlayerId ? 'remote_battle_go' : 'local_battle_go');
    return;
  }

  if (shouldIgnoreStalePvpMessage(type, normalizedPacket)) {
    return;
  }

  if (type === 'ready') {
    if (isPvpTerminalState()) {
      console.info('[PvP End] checkBothReady blocked: terminal');
      return;
    }
    if (matchmakingStatus.phase !== 'matched') return;
    if (!hasActiveMatchedOpponent()) {
      console.info('[PvP Sync] 忽略ready：目前沒有有效對手連線');
      return;
    }
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

  if (type === 'profile_sync') {
    const sourcePlayerId = String(normalizedPacket?._sourcePlayerId ?? normalizedPacket?.payload?.playerId ?? '').trim();
    const localPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
    if (!sourcePlayerId || sourcePlayerId === localPlayerId) return;
    const customName = sanitizePvpNickname(normalizedPacket?.payload?.displayName, '');
    if (!customName) return;
    remotePvpDisplayNameByPlayer.set(sourcePlayerId, customName);
    if (matchmakingStatus.opponentProfile && typeof matchmakingStatus.opponentProfile === 'object') {
      const opponentId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
      if (!opponentId) {
        matchmakingStatus.opponentProfile.id = sourcePlayerId;
      }
      if (!opponentId || opponentId === sourcePlayerId) {
        applyOpponentPvpDisplayNameToMatchStatus();
      }
    }
    return;
  }

  if (type === 'start_battle' || type === 'battle_start') {
    if (isPvpTerminalState()) {
      console.info('[PvP End] start_battle blocked: terminal');
      return;
    }
    if (matchmakingStatus.phase !== 'matched') return;
    if (!hasActiveMatchedOpponent()) {
      console.info('[PvP Sync] 忽略start_battle：目前沒有有效對手連線');
      return;
    }
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
    scheduleBattleStartFromBattleGo({
      ...normalizedPacket.payload,
      startAt,
      fogDurationMs,
      seed,
      matchSessionId: resolvePacketMatchSessionId(normalizedPacket)
    }, 'remote_packet');
    return;
  }

  if (type === 'skill_cast_request') {
    handleSkillCastRequest(normalizedPacket?.payload ?? {}, normalizedPacket?._sourcePlayerId ?? '');
    return;
  }

  if (type === 'skill_cast') {
    if (!isCurrentBattlePvP.value) return;
    if (currentScreen.value !== 'battle') return;
    if (isPvpTerminalState() || gameState.value === 'gameResult' || gameState.value === 'finishing') {
      console.info('[PvP End] skill_cast ignored: battle already ended');
      return;
    }
    handleSkillCast(normalizedPacket?.payload ?? {}, normalizedPacket?._sourcePlayerId ?? '');
    return;
  }

  if (type === 'damage') {
    if (!isCurrentBattlePvP.value) return;
    if (currentScreen.value !== 'battle') return;
    if (isPvpTerminalState() || gameState.value === 'gameResult' || gameState.value === 'finishing') {
      console.info('[PvP End] damage ignored: battle already ended');
      return;
    }
    const amount = Math.max(0, Number(normalizedPacket?.payload?.amount ?? 0));
    if (amount <= 0) return;
    const source = String(normalizedPacket?.payload?.source ?? '').trim();
    if (source === 'skill') return;

    applyRemoteDamage(amount);
    return;
  }

  if (type === 'battle_end') {
    const incomingSessionId = resolvePacketMatchSessionId(normalizedPacket);
    if (isPvpTerminalState() && incomingSessionId && isRecentlyEndedMatchSession(incomingSessionId)) {
      console.info('[PvP End] duplicate battle_end ignored after forfeit');
      console.info('[PvP End] finalize skipped: already terminal');
      return;
    }
    if (!isCurrentBattlePvP.value || currentScreen.value !== 'battle') {
      finalizePvpBattle('battle_end_packet', {
        phase: 'idle',
        matchSessionId: incomingSessionId,
        message: '對戰已結束，請重新配對。'
      });
      return;
    }
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

    const localOutcome = playerHp.value > opponentHp.value
      ? 'win'
      : (playerHp.value < opponentHp.value ? 'lose' : 'draw');
    beginPvpEndSequence('battle_end_packet', {
      phase: 'ended',
      matchSessionId: incomingSessionId,
      localOutcome,
      message: '對戰已結束。'
    });
    return;
  }

  if (type === 'forfeit') {
    const incomingSessionId = resolvePacketMatchSessionId(normalizedPacket) || getCurrentPvpMatchSessionId();
    if (isPvpTerminalState() && incomingSessionId && isRecentlyEndedMatchSession(incomingSessionId)) {
      console.info(`[PvP End] duplicate end ignored session=${incomingSessionId}`);
      console.info('[PvP End] finalize skipped: already terminal');
      return;
    }
    if (isCurrentBattlePvP.value && currentScreen.value === 'battle') {
      const localPlayerId = resolveMatchPlayerId(matchmakingStatus.localProfile);
      const remotePlayerId = resolveMatchPlayerId(matchmakingStatus.opponentProfile);
      const localDisplayName = resolveLocalPvpDisplayName();
      const remoteDisplayName = String(
        matchmakingStatus.opponentProfile?.displayName
        || matchmakingStatus.opponentProfile?.gameCenterDisplayName
        || '對手'
      ).trim() || '對手';
      const nowMs = Date.now();
      const localIsHost = isCurrentPlayerMatchHost();
      const hostPlayerId = localIsHost ? localPlayerId : remotePlayerId;
      const guestPlayerId = localIsHost ? remotePlayerId : localPlayerId;
      const hostHp = localIsHost ? playerHp.value : opponentHp.value;
      const guestHp = localIsHost ? opponentHp.value : playerHp.value;
      const remoteForfeitResult = {
        reason: 'remote_forfeit',
        winner: {
          playerId: localPlayerId,
          displayName: localDisplayName
        },
        loser: {
          playerId: remotePlayerId,
          displayName: remoteDisplayName
        },
        matchSessionId: incomingSessionId,
        endedAtMs: nowMs,
        hostPlayerId,
        guestPlayerId,
        hostHp: Math.max(0, Math.round(Number(hostHp ?? 0))),
        guestHp: Math.max(0, Math.round(Number(guestHp ?? 0)))
      };
      console.info('[PvP End] remote_forfeit result created');
      if (isCurrentPlayerMatchHost() && !battleEndBroadcasted) {
        emitHostBattleEndPacket('remote_forfeit', { immediate: true });
      }
      beginPvpEndSequence('remote_forfeit', {
        phase: 'ended',
        matchSessionId: incomingSessionId,
        result: remoteForfeitResult,
        localOutcome: 'win',
        message: '對手已投降，判定你獲勝。'
      });
      return;
    }
    finalizePvpBattle('remote_forfeit', {
      phase: 'idle',
      matchSessionId: incomingSessionId,
      message: '對手已離開配對，請重新配對。'
    });
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
  const isTerminalNow = isPvpTerminalState() || gameState.value === 'gameResult';

  resetTutorialState();
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  shouldAutoResumeBattleAfterForeground = false;
  if (!isTerminalNow) {
    console.info('[PvP UI] leave_battle_screen_after_result user_action=false');
    void sendPvpRealtimeEvent('forfeit', { reason: 'leave_battle_screen' });
    if (isCurrentPlayerMatchHost() && !battleEndBroadcasted) {
      broadcastHostBattleEndNow('local_forfeit_exit');
    }
    finalizePvpBattle('leave_battle_screen', {
      phase: 'idle',
      localOutcome: 'lose',
      message: '你已離開 PvP 對戰，視為投降。'
    });
  } else {
    console.info('[PvP UI] leave_battle_screen_after_result user_action=true');
    finalizePvpBattle('leave_battle_screen_after_result', {
      phase: 'idle',
      message: '對戰已結束，請重新配對。'
    });
  }
  stopGame();
  setPaused(false);
  battleSessionMode.value = 'pve';
  currentScreen.value = destination;
  return true;
}

function handleAppBackground() {
  if (appIsInBackground) return;
  appIsInBackground = true;

  persistRuntimeSettingsIfReady();
  if (remotePlayerProgressDirty && firebaseSession.uid) {
    void flushRemotePlayerProgressSave('app_background');
  }

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
  await loadGameCenterSessionCache();
  await loadStudyStateForActiveAccount();
  await loadRuntimeSettings();
  if (!gameCenterBindingEnabled.value) {
    applyGameCenterSession({
      isAuthenticated: false,
      playerId: '',
      displayName: '',
      alias: '',
      gameCenterId: '',
      lastAuthenticatedAt: 0
    }, { status: 'unauthenticated', persist: false });
  }
  hasHydratedRuntimeSettings = true;
  const sceneId = resolveBgmSceneId(currentScreen.value);
  sfx.setBgmScene(sceneId);
  setBgmEnabled(bgmEnabled.value);
  if (bgmEnabled.value) sfx.ensureBgmRunning();

  unsubscribeMatchStatus = matchService.subscribe((status) => {
    applyMatchStatus(status);
  });
  unsubscribeRealtimeEvents = matchService.subscribeRealtime((packet) => {
    handlePvpRealtimeEvent(packet);
  });

  try {
    const capabilities = await matchService.init();
    Object.assign(matchCapabilities, capabilities ?? {});
  } catch (error) {
    applyMatchStatus({
      phase: 'error',
      message: '配對系統初始化失敗。',
      errorMessage: String(error?.message ?? error ?? '')
    });
  }

  await bootstrapRemotePlayerProgressSync();

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
  clearPendingPvpEndFogTimer();
  clearRootCountdownTimer();
  clearRemotePlayerProgressSaveTimer();
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
  timeLeft,
  (nextValue, prevValue) => {
    if (!isCurrentBattlePvP.value || currentScreen.value !== 'battle') return;

    const currentBattleRemainingMs = Math.max(0, Math.round(Number(nextValue ?? 0) * 1000));
    const previousBattleRemainingMs = Math.max(0, Math.round(Number(prevValue ?? nextValue ?? 0) * 1000));

    if (
      isPaused.value
      && activeSkillCast
      && gameState.value === 'playing'
      && currentBattleRemainingMs !== previousBattleRemainingMs
    ) {
      console.warn(
        `[PvP Sync] skill_pause_timer_drift castId=${activeSkillCast.castId} localNow=${Date.now()} `
          + `previousBattleRemainingMs=${previousBattleRemainingMs} currentBattleRemainingMs=${currentBattleRemainingMs} `
          + `diffMs=${currentBattleRemainingMs - previousBattleRemainingMs} note=timer_changed_while_skill_paused`
      );
    }

    const postResumeTrace = pendingSkillCastPostResumeTickTrace;
    if (!postResumeTrace) return;
    if (isPaused.value || gameState.value !== 'playing') return;
    if (currentBattleRemainingMs >= postResumeTrace.restoredBattleRemainingMs) return;

    const localNow = Date.now();
    const elapsedSinceResumeMs = Math.max(0, localNow - postResumeTrace.resumeAtMs);
    const expectedRemainingMs = Math.max(0, postResumeTrace.restoredBattleRemainingMs - elapsedSinceResumeMs);
    console.info(
      `[PvP Sync] post_resume_first_tick castId=${postResumeTrace.castId} localNow=${localNow} `
        + `elapsedSinceResumeMs=${elapsedSinceResumeMs} displayedBattleRemainingMs=${currentBattleRemainingMs} `
        + `expectedRemainingMs=${expectedRemainingMs} expectedBattleRemainingMsAtCast=${postResumeTrace.expectedBattleRemainingMsAtCast}`
    );
    pendingSkillCastPostResumeTickTrace = null;
  }
);

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
  [gameState, currentScreen, () => pvpEndUiState.phase],
  ([state, screen, endPhase]) => {
    if (endPhase === 'ending_fog') {
      if (screen !== 'battle') {
        console.info('[PvP UI] ignored navigation to battle after result');
        currentScreen.value = 'battle';
        return;
      }
      if (state !== 'finishing') {
        console.info('[PvP UI] battle kept as background during ending_fog');
        gameState.value = 'finishing';
      }
      return;
    }
    if (endPhase !== 'result') return;
    if (screen !== 'battle') {
      console.info('[PvP UI] ignored navigation to battle after result');
      currentScreen.value = 'battle';
      return;
    }
    if (state !== 'gameResult') {
      console.info('[PvP UI] battle view blocked: terminal result active');
      gameState.value = 'gameResult';
    }
  }
);

watch(
  studyState,
  () => {
    if (isApplyingRemotePlayerProgress) return;
    void saveStudyStateForActiveAccount();
    queueRemotePlayerProgressSave('study_state_changed');
  },
  { deep: true }
);

watch(
  playerConfig,
  () => {
    if (isApplyingRemotePlayerProgress) return;
    void saveStudyStateForActiveAccount();
    queueRemotePlayerProgressSave('player_config_changed');
  },
  { deep: true }
);

watch(
  stageProgress,
  () => {
    if (isApplyingRemotePlayerProgress) return;
    void saveStudyStateForActiveAccount();
    queueRemotePlayerProgressSave('stage_progress_changed');
  },
  { deep: true }
);

watch(
  () => getActiveProfileKey(),
  (nextKey, prevKey) => {
    if (nextKey === prevKey) return;
    if (isFirebaseHydrated && firebaseSession.uid) {
      console.info('[FirebaseSync] active profile key changed; keeping Firestore-authoritative state.');
      return;
    }
    void loadStudyStateForActiveAccount();
  },
  { flush: 'post' }
);

watch(unlockedStageIds, (ids) => {
  if (ids.length === 0) return;
  if (!ids.includes(selectedStageId.value)) {
    selectedStageId.value = ids[0];
  }
});

watch(
  [currentScreen, gameState, () => battleSessionMode.value, selectedStageId, opponentHp],
  ([screen, state, mode, stageId, enemyHp]) => {
    if (screen !== 'battle') return;
    if (state !== 'playing') return;
    if (String(mode ?? '').trim() !== 'pve') return;
    if (String(stageId ?? '').trim() !== STAGE_IDS.STAGE_02_TUTORIAL) return;
    if (stage02SkillLessonState.triggered || stage02SkillLessonState.completed) return;

    const normalizedEnemyHp = Math.max(0, Math.round(Number(enemyHp ?? 0)));
    if (normalizedEnemyHp <= 0 || normalizedEnemyHp > 40) return;
    void activateStage02SkillLesson();
  }
);

watch(
  [currentScreen, gameState, isTutorialStage, playerTotalHits],
  ([screen, state, tutorial]) => {
    if (!tutorial || screen !== 'battle') return;
    if (tutorialState.active) return;
    if (tutorialState.completed) return;
    if (state !== 'playing') return;
    if (typeof shouldAutoStartTutorialGuideInternal === 'function' && !shouldAutoStartTutorialGuideInternal()) return;
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
    storyFlow?.setPauseState(true);
    void updateTutorialFocusRectFromTarget();
  }
);

watch(tutorialHitProgress, (count) => {
  tryAdvancePracticeStep(count);
});

watch(targetTransform, () => {
  if (!isTutorialGuideActive.value) return;
  if (tutorialState.step === 'practice') return;
  void updateTutorialFocusRectFromTarget();
});

watch(gameState, (next, prev) => {
  if (prev === 'gameResult' || next !== 'gameResult') return;
  if (isCurrentBattlePvP.value) return;
  if (currentBattleOutcome.value !== 'win') return;
  const stage = currentStageConfig.value;
  if (!stage || !stageList.some(item => item.id === stage.id)) return;

  const alreadyCleared = stageProgress.clearedStageIds.includes(stage.id);
  applyPveStageVictoryRewards(stage, { isFirstClear: !alreadyCleared });
  if (alreadyCleared) return;

  stageProgress.clearedStageIds = [...stageProgress.clearedStageIds, stage.id];
});

watch(
  [currentScreen, () => currentStageConfig.value.hasBoss],
  ([screen]) => {
    const sceneId = resolveBgmSceneId(screen);
    sfx.setBgmScene(sceneId);
  },
  { immediate: true }
);

function startPvpBattle() {
  resetPreBattleDialogueState();
  if (isPvpTerminalState() || isPvpEndUiLocked()) {
    console.info('[PvP UI] battle view blocked: terminal result active');
    console.info('[PvP UI] ignored navigation to battle after result');
    return;
  }
  resetPvpTerminalState('start_pvp_battle');
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

function goSettingsFromMatchmaking() {
  console.info(`Settings reads GameCenter session status=${gameCenterStatus.value}`);
  currentScreen.value = 'settings';
}

const {
  openMatchmaking,
  startPvPMatchmaking,
  cancelPvPMatchmaking,
  goHomeFromMatchmaking
} = usePvpBattleFlow({
  resetPvpTerminalState,
  applyMatchStatus,
  matchmakingStatus,
  isGameCenterProvider,
  gameCenterSession,
  resetPvpRealtimeState,
  matchService,
  resolveLocalPvpDisplayName,
  playerConfig,
  buildFilledSkillIds,
  currentScreen
});

function openBattleMode() {
  currentScreen.value = 'battleMode';
}

function goHomeFromBattleMode() {
  currentScreen.value = 'home';
}

function enterIntroStartScreenFromOpening() {
  currentScreen.value = 'introStart';
}

function enterHomeFromIntroStart() {
  currentScreen.value = 'home';
}

function goStageSelectFromResult() {
  resetPreBattleDialogueState();
  resetPvpTerminalState('go_stage_select_from_result');
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
  resetPreBattleDialogueState();
  resetPvpTerminalState('go_matchmaking_from_result');
  resetPvpRealtimeState();
  applyMatchStatus({
    ...matchmakingStatus,
    phase: 'idle',
    message: '請重新配對。',
    errorMessage: '',
    opponentProfile: null,
    queueSeconds: 0,
    expectedPlayerCount: 0,
    connectedPlayerCount: 0
  });
  battleSessionMode.value = 'pve';
  resetTutorialState();
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  setPaused(false);
  statusEffectEngine?.reset?.('go_matchmaking_from_result');
  stopGame();
  currentScreen.value = 'matchmaking';
}

function normalizeStageUnlockSkillIds(stage = null) {
  if (!stage || typeof stage !== 'object') return [];
  if (!Array.isArray(stage.unlockSkillIds)) return [];
  const validSkillIds = new Set(skillPool.map(skill => skill.id));
  const ids = stage.unlockSkillIds
    .map(id => String(id ?? '').trim())
    .filter(id => validSkillIds.has(id));
  return [...new Set(ids)];
}

function applyPveStageVictoryRewards(stage = null, { isFirstClear = false } = {}) {
  if (!stage || typeof stage !== 'object') return;
  const rewardSp = Math.max(0, Math.floor(sanitizeNumber(stage.rewardSp, 0)));
  if (rewardSp > 0) {
    studyState.knowledgePoints += rewardSp;
  }

  if (!isFirstClear) return;
  const unlockSkillIds = normalizeStageUnlockSkillIds(stage);
  if (unlockSkillIds.length <= 0) return;

  stageProgress.unlockedSkillIds = [...new Set([
    ...stageProgress.unlockedSkillIds,
    ...unlockSkillIds
  ])];
}

function openBattleMenu() {
  if (isCurrentBattlePvP.value && (isPvpEndUiLocked() || isPvpTerminalState())) {
    console.info('[PvP UI] battle view blocked: terminal result active');
    return;
  }
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
    setPaused(isPreBattleDialogueActive.value);
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
  resetPreBattleDialogueState();
  resetTutorialState();
  closeBattleMenu();
  initGame();
}

function returnToHome() {
  if (forfeitActivePvpBattleAndExit('home')) return;
  resetPreBattleDialogueState();
  resetPvpTerminalState('return_home');
  battleSessionMode.value = 'pve';
  resetTutorialState();
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  setPaused(false);
  statusEffectEngine?.reset?.('return_home');
  stopGame();
  currentScreen.value = 'home';
}

async function openStudy() {
  currentScreen.value = 'study';
  const snapshot = await refreshStudyKnowledgeFromFirebase('open_study');
  const today = getStudyDateKey();
  const knowledgePoints = snapshot?.knowledgePoints ?? studyState.knowledgePoints;
  const dailyEarned = snapshot?.dailyKnowledgePointsEarned ?? studyState.dailyKnowledge.points;
  const dailyDate = snapshot?.dailyKnowledgePointsDate ?? studyState.dailyKnowledge.dateKey;
  console.info('[KnowledgeDojo] enter page');
  console.info(`knowledgePoints=${knowledgePoints}`);
  console.info(`dailyKnowledgePointsEarned=${dailyEarned}`);
  console.info(`dailyKnowledgePointsDate=${dailyDate}`);
  console.info(`today=${today}`);
}

function openSettings() {
  console.info(`Settings reads GameCenter session status=${gameCenterStatus.value}`);
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

async function refreshStudyKnowledgeFromFirebase(reason = 'unknown') {
  syncStudyDailyKnowledgeDate();
  if (!isFirebaseBridgeAvailable()) return;
  if (!firebaseSession.uid) return;

  const today = getStudyDateKey();
  try {
    const result = await getFirebasePlayerKnowledge(firebaseSession.uid, today);
    const normalized = normalizePlayerKnowledgeForToday(result?.data ?? {}, today);

    studyState.knowledgePoints = normalized.knowledgePoints;
    studyState.dailyKnowledge = normalized.dailyKnowledge;

    console.info(`[Dojo] knowledge synced from Firebase reason=${reason}.`);
    return {
      knowledgePoints: normalized.knowledgePoints,
      dailyKnowledgePointsEarned: normalized.dailyKnowledge.points,
      dailyKnowledgePointsDate: normalized.firestoreDateKey
    };
  } catch (error) {
    console.warn(`[Dojo] failed to sync knowledge reason=${reason}:`, error);
    return null;
  }
}

async function claimKnowledgePointReward(payload = {}) {
  const calculatedReward = Math.max(0, Math.floor(sanitizeNumber(payload.calculatedReward, 0)));
  const correctCount = Math.max(0, Math.floor(sanitizeNumber(payload.correctCount, 0)));
  const totalQuestions = Math.max(0, Math.floor(sanitizeNumber(payload.questionCount, 0)));
  const mode = String(payload.modeKey ?? '').trim();
  const today = getStudyDateKey();

  syncStudyDailyKnowledgeDate();
  console.info('[KnowledgeDojo] before claim');
  console.info(`calculatedReward=${calculatedReward}`);
  console.info(`correctCount=${correctCount}`);
  console.info(`mode=${mode || 'unknown'}`);

  if (!isFirebaseBridgeAvailable() || !firebaseSession.uid) {
    throw new Error('獎勵結算服務尚未就緒，請稍後再試。');
  }

  console.info('[KnowledgeDojo] calling claimKnowledgePointReward');
  console.info(`uid=${firebaseSession.uid}`);
  console.info(`calculatedReward=${calculatedReward}`);

  const settlement = await claimFirebaseKnowledgePointReward(firebaseSession.uid, {
    calculatedReward,
    dailyKnowledgePointLimit: DOJO_DAILY_CAP_POINTS,
    dateKey: today,
    mode,
    correctCount,
    totalQuestions
  });

  const normalized = normalizePlayerKnowledgeForToday(settlement?.data ?? {}, today);
  const actualReward = Math.max(0, Math.floor(sanitizeNumber(settlement.actualReward, 0)));

  studyState.knowledgePoints = normalized.knowledgePoints;
  studyState.dailyKnowledge = normalized.dailyKnowledge;

  queueRemotePlayerProgressSave('dojo_settle_reward');

  return {
    correctCount,
    totalQuestions,
    calculatedReward,
    actualReward,
    dailyKnowledgePointsEarned: normalized.dailyKnowledge.points,
    dailyKnowledgePointsDate: normalized.firestoreDateKey,
    dailyKnowledgePointLimit: DOJO_DAILY_CAP_POINTS,
    knowledgePoints: normalized.knowledgePoints
  };
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
