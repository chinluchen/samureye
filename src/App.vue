<template>
  <main id="app-shell" :class="{ 'is-finishing': gameState === 'finishing' }">
    <div id="game-world-wrapper">
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
  </main>
</template>

<script setup>
import { GAME_CONFIG } from './data/gameConfig.js';
import { skills } from './data/skills.js';
import { useBattleGame } from './composables/useBattleGame.js';
import { useSwipeControls } from './composables/useSwipeControls.js';
import CutsceneLayer from './components/CutsceneLayer.vue';
import GameTarget from './components/GameTarget.vue';
import HudLayer from './components/HudLayer.vue';
import ResultLayer from './components/ResultLayer.vue';

const game = useBattleGame();

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
  isSplitting,
  isEnemyTurn,
  cutsceneSkillName,
  targetTransform,
  processSlash,
  useSkill,
  initGame
} = game;

useSwipeControls({
  gameState,
  playerDebuff,
  processSlash
});
</script>
