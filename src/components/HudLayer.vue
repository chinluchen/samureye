<template>
  <div id="ui-layer">
    <div class="hud-top enemy-hud-row breathing">
      <div id="enemy-hp-anchor" class="pixel-border enemy-panel">
        <div class="mini-row">
          <span>Opponent: Master HOU</span>
          <span class="enemy-stat">HITS: {{ opponentRoundHits }}</span>
        </div>

        <div class="bar-row">
          <div class="hp-track hp-track-small">
            <div class="hp-fill enemy-fill" :style="{ width: opponentHpPercent }"></div>
          </div>
          <span class="hp-number">{{ Math.max(0, Math.ceil(opponentHp)) }} / {{ opponentMaxHp }}</span>
        </div>
      </div>
    </div>

    <div class="timer-row" :class="{ 'is-hidden': hideTimer }">
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
          :class="{ 'is-ready': skillPoints >= skill.cost && gameState === 'playing' && playerDebuff !== 'cataract' }"
          :disabled="skillPoints < skill.cost || gameState !== 'playing' || playerDebuff === 'cataract'"
          @touchstart.stop="$emit('use-skill', skill)"
          @click.stop="$emit('use-skill', skill)"
        >
          <span class="skill-icon">{{ skill.icon }}</span>
          <span class="skill-name">{{ skill.name }}</span>
        </button>
      </div>

      <div class="player-panel-stack">
        <div class="player-avatar-figure" aria-hidden="true">
          <img class="player-avatar-img" :src="playerAvatarUrl" alt="">
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
          <span class="hp-number">{{ Math.max(0, Math.ceil(playerHp)) }} / {{ playerMaxHp }}</span>
        </div>

        <div class="mp-label">MP: {{ skillPoints }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  playerAvatarUrl: {
    type: String,
    required: true
  },
  playerMaxHp: {
    type: Number,
    required: true
  },
  opponentMaxHp: {
    type: Number,
    required: true
  },
  playerHp: {
    type: Number,
    required: true
  },
  opponentHp: {
    type: Number,
    required: true
  },
  opponentRoundHits: {
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
  playerDebuff: {
    type: String,
    default: null
  },
  timeLeft: {
    type: Number,
    default: 0
  },
  hideTimer: {
    type: Boolean,
    default: false
  }
});

defineEmits(['use-skill']);

const opponentHpPercent = computed(() => `${props.opponentHp / props.opponentMaxHp * 100}%`);
const playerHpPercent = computed(() => `${props.playerHp / props.playerMaxHp * 100}%`);
</script>
