<template>
  <main
    id="app-shell"
    :class="{ 'is-finishing': currentScreen === 'battle' && gameState === 'finishing' }"
  >
    <HomeScreen
      v-if="currentScreen === 'home'"
      @start-battle="startBattle"
    />

    <template v-else>
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
          :max-hp="GAME_CONFIG.maxHp"
          :player-hp="playerHp"
          :enemy-hp="enemyHp"
          :enemy-round-hits="enemyRoundHits"
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
        :enemy-hp="enemyHp"
        :player-total-hits="playerTotalHits"
        @restart="initGame"
      />

      <BattleMenu
        v-if="isBattleMenuOpen"
        :view="battleMenuView"
        :volume="audioVolume"
        :sfx-enabled="sfxEnabled"
        :bgm-enabled="bgmEnabled"
        :vibration-enabled="vibrationEnabled"
        @go-home="returnToHome"
        @restart="restartBattleFromMenu"
        @open-settings="openMenuSettings"
        @close="closeBattleMenu"
        @back-main="backToMainMenuView"
        @volume-change="setAudioVolume"
        @sfx-toggle="setSfxEnabled"
        @bgm-toggle="setBgmEnabled"
        @vibration-toggle="setVibrationEnabled"
      />
    </template>
  </main>
</template>

<script setup>
import { ref } from 'vue';
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

const currentScreen = ref('home');
const isBattleMenuOpen = ref(false);
const battleMenuView = ref('main');
const game = useBattleGame({ autoStart: false });

const {
  playerHp,
  enemyHp,
  timeLeft,
  gameState,
  announcementText,
  combo,
  playerTotalHits,
  enemyRoundHits,
  skillPoints,
  playerDebuff,
  isPaused,
  audioVolume,
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
  setSfxEnabled,
  setBgmEnabled,
  setVibrationEnabled
} = game;

useSwipeControls({
  gameState,
  playerDebuff,
  isPaused,
  processSlash
});

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
</script>
