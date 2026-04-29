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
          :class="{ 'is-ready': isSkillReady(skill), 'is-cooling': isSkillCooling(skill.id) }"
          :disabled="isSkillDisabled(skill)"
          @touchstart.stop="$emit('use-skill', skill)"
          @click.stop="$emit('use-skill', skill)"
        >
          <span
            v-if="isSkillCooling(skill.id)"
            class="skill-cooldown-overlay"
            :style="getSkillCooldownStyle(skill)"
          ></span>
          <span class="skill-icon">{{ skill.icon }}</span>
          <span class="skill-name">{{ skill.name }}</span>
          <span v-if="getSkillCooldownLeft(skill.id) > 0" class="skill-cooldown-badge">
            {{ formatSkillCooldown(skill.id) }}s
          </span>
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
  skillCooldowns: {
    type: Object,
    default: () => ({})
  },
  skillCooldownPending: {
    type: Object,
    default: () => ({})
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

function getSkillCooldownLeft(skillId) {
  return Math.max(0, Number(props.skillCooldowns?.[skillId] ?? 0));
}

function isSkillCooldownPending(skillId) {
  return Boolean(props.skillCooldownPending?.[skillId]);
}

function isSkillCooling(skillId) {
  return isSkillCooldownPending(skillId) || getSkillCooldownLeft(skillId) > 0;
}

function isSkillReady(skill) {
  return props.skillPoints >= skill.cost
    && props.gameState === 'playing'
    && props.playerDebuff !== 'cataract'
    && getSkillCooldownLeft(skill.id) <= 0;
}

function isSkillDisabled(skill) {
  return props.skillPoints < skill.cost
    || props.gameState !== 'playing'
    || props.playerDebuff === 'cataract'
    || isSkillCooling(skill.id);
}

function formatSkillCooldown(skillId) {
  const seconds = getSkillCooldownLeft(skillId);
  if (seconds <= 0) return '0.0';
  return seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1);
}

function getSkillCooldownRatio(skill) {
  const total = Math.max(0, Number(skill?.cooldownSec ?? 0));
  if (total <= 0) return 0;
  const left = getSkillCooldownLeft(skill.id);
  return Math.max(0, Math.min(1, left / total));
}

function getSkillCooldownStyle(skill) {
  if (isSkillCooldownPending(skill.id)) {
    return {
      '--cd-stop': '360deg'
    };
  }

  const ratio = getSkillCooldownRatio(skill);
  const deg = `${(ratio * 360).toFixed(2)}deg`;
  return {
    '--cd-stop': deg
  };
}
</script>
