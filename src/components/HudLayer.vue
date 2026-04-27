<template>
  <div id="ui-layer">
    <div class="hud-top enemy-hud-row breathing">
      <div id="enemy-hp-anchor" class="pixel-border enemy-panel">
        <div class="mini-row">
          <span>Enemy: Master HOU</span>
          <span class="enemy-stat">HITS: {{ enemyRoundHits }}</span>
        </div>

        <div class="bar-row">
          <div class="hp-track hp-track-small">
            <div class="hp-fill enemy-fill" :style="{ width: enemyHpPercent }"></div>
          </div>
          <span class="hp-number">{{ Math.max(0, Math.ceil(enemyHp)) }} / {{ maxHp }}</span>
        </div>
      </div>
    </div>

    <div class="timer-row">
      <div id="timer-display">
        {{ timeLeft.toFixed(1) }}
      </div>
    </div>

    <div class="hud-bottom player-area">
      <div class="skill-bar">
        <button
          v-for="skill in skills"
          :key="skill.id"
          type="button"
          class="skill-button"
          :class="{ 'is-ready': skillPoints >= skill.cost && gameState === 'playing' }"
          :disabled="skillPoints < skill.cost || gameState !== 'playing'"
          @touchstart.stop="$emit('use-skill', skill)"
          @click.stop="$emit('use-skill', skill)"
        >
          <span class="skill-icon">{{ skill.icon }}</span>
          <span class="skill-name">{{ skill.name }}</span>
        </button>
      </div>

      <div id="player-hp-anchor" class="pixel-border player-panel">
        <div class="mini-row">
          <span>SAMUREYE (You)</span>
          <span class="combo-stat">COMBO: {{ combo }}</span>
        </div>

        <div class="bar-row">
          <div class="hp-track hp-track-large">
            <div class="hp-fill player-fill" :style="{ width: playerHpPercent }"></div>
          </div>
          <span class="hp-number">{{ Math.max(0, Math.ceil(playerHp)) }} / {{ maxHp }}</span>
        </div>

        <div class="mp-label">MP: {{ skillPoints }}%</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  maxHp: {
    type: Number,
    required: true
  },
  playerHp: {
    type: Number,
    required: true
  },
  enemyHp: {
    type: Number,
    required: true
  },
  enemyRoundHits: {
    type: Number,
    required: true
  },
  combo: {
    type: Number,
    required: true
  },
  skillPoints: {
    type: Number,
    required: true
  },
  skills: {
    type: Array,
    required: true
  },
  gameState: {
    type: String,
    required: true
  },
  timeLeft: {
    type: Number,
    default: 0
  }
});

defineEmits(['use-skill']);

const enemyHpPercent = computed(() => `${props.enemyHp / props.maxHp * 100}%`);
const playerHpPercent = computed(() => `${props.playerHp / props.maxHp * 100}%`);
</script>
