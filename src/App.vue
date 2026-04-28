<template>
  <main
    id="app-shell"
    :class="{ 'is-finishing': currentScreen === 'battle' && gameState === 'finishing' }"
  >
    <HomeScreen
      v-if="currentScreen === 'home'"
      @start-battle="startBattle"
      @open-study="openStudy"
      @open-settings="openSettings"
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
          :player-max-hp="playerMaxHp"
          :opponent-max-hp="opponentMaxHp"
          :player-hp="playerHp"
          :opponent-hp="opponentHp"
          :opponent-round-hits="opponentRoundHits"
          :combo="combo"
          :time-left="timeLeft"
          :skill-points="skillPoints"
          :skills="skills"
          :game-state="gameState"
          @use-skill="useSkill"
        />
      </div>

      <ResultLayer
        v-if="gameState === 'gameResult'"
        :player-hp="playerHp"
        :opponent-hp="opponentHp"
        :player-total-hits="playerTotalHits"
        @restart="initGame"
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
  </main>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { GAME_CONFIG } from './data/gameConfig.js';
import { skills } from './data/skills.js';
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
const STUDY_PROFILE_SCHEMA_VERSION = 3;
const accountState = reactive({
  name: ''
});
const game = useBattleGame({
  autoStart: false,
  getBattleProgression
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

function getBattleProgression() {
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
    }
  };
}

function normalizeStudyData(rawData = {}) {
  const data = rawData ?? {};
  const tracks = data.tracks ?? {};

  return {
    points: Math.max(0, Math.floor(sanitizeNumber(data.points, 0))),
    answered: Math.max(0, Math.floor(sanitizeNumber(data.answered, 0))),
    correct: Math.max(0, Math.floor(sanitizeNumber(data.correct, 0))),
    tracks: {
      optometry: normalizeTrack(tracks.optometry),
      optics: normalizeTrack(tracks.optics),
      contactLens: normalizeTrack(tracks.contactLens),
      other: normalizeTrack(tracks.other)
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
  accountState,
  () => {
    saveAccountState();
    loadStudyStateForActiveAccount();
  },
  { deep: true }
);

function startBattle() {
  currentScreen.value = 'battle';
  isBattleMenuOpen.value = false;
  battleMenuView.value = 'main';
  setPaused(false);
  initGame();
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
  closeBattleMenu();
  initGame();
}

function returnToHome() {
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

function goHomeFromStudy() {
  currentScreen.value = 'home';
}

function goHomeFromSettings() {
  currentScreen.value = 'home';
}

function loginAccount() {
  if (typeof window === 'undefined') return;
  const name = window.prompt('請輸入帳號名稱（暫時本機登入）', accountState.name || 'SAMUREYE');
  if (!name) return;
  accountState.name = name.trim();
}

function logoutAccount() {
  accountState.name = '';
}

function deleteAccount() {
  if (typeof window === 'undefined') return;
  const confirmed = window.confirm('確定要刪除帳號嗎？這會清除本機登入資料與讀書強化進度。');
  if (!confirmed) return;
  const allProfiles = loadAllStudyProfiles();
  const profileKey = getActiveProfileKey();
  delete allProfiles.profiles[profileKey];
  saveAllStudyProfiles(allProfiles);
  accountState.name = '';
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
