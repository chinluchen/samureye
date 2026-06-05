<template>
  <div id="ui-layer">
    <div class="battle-hud-top">
      <button
          v-if="shouldShowBattleMenuTrigger"
            type="button"
            class="battle-menu-trigger pixel-border"
            @click="$emit('open-battle-menu')"
            >
              選單
      </button>
        <div class="timer-row" :class="{ 'is-hidden': hideTimer }">
          <div id="timer-display">
            戰鬥時間： {{ timeLeft.toFixed(1) }} 秒
          </div>
        </div>
    </div>
    <div class="enemy-hud">
      <div class="enemy-hud-row">
        <div id="enemy-hp-anchor" class="pixel-border enemy-panel">
          <div class="mini-row">
            <span>{{ opponentLabelText }}</span>
          </div>
          <div class="bar-row">
            <span class="hp-prefix">HP</span>
            <div class="hp-track hp-track-small">
              <div class="hp-fill enemy-fill" :style="{ width: opponentHpPercent }"></div>
            </div>
            <span class="hp-number-enemy">{{ Math.max(0, Math.ceil(opponentHp)) }} / {{ opponentMaxHp }}</span>
          </div>
        </div>
      </div>
      <!-- <div v-if="resolvedOpponentAvatarUrl" class="enemy-avatar-figure" aria-hidden="true">
        <img class="enemy-avatar-img" :src="resolvedOpponentAvatarUrl" alt="">
      </div> -->
    </div>
    <div class="battle-hud-center">       
    </div>

    <div class="hud-bottom battle-hud-bottom">
      <div class="player-area">
        <div v-if="!hideSkillHud" id="skill-bar-anchor" class="skill-bar skill-row">
          <button
            v-for="skill in skills"
            :key="skill.id"
            :id="`skill-button-${skill.id}`"
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
            <span class="skill-name">
              <span
                v-for="(line, idx) in formatSkillNameLines(skill.name)"
                :key="`${skill.id}-line-${idx}`"
                class="skill-name-line"
              >
                {{ line }}
              </span>
            </span>
            <span v-if="getSkillCooldownLeft(skill.id) > 0" class="skill-cooldown-badge">
              {{ formatSkillCooldown(skill.id) }}s
            </span>
          </button>
        </div>

        <div class="player-hud">
          <div class="player-portrait-column">
            <div class="player-avatar-figure" aria-hidden="true">
              <img class="player-avatar-img" :src="playerAvatarUrl" alt="">
            </div>
            <div class="player-id-badge pixel-border">
              {{ playerLabelText }}
            </div>


          </div>
          <div class="player-info-column">
            <div id="player-hp-anchor" class="pixel-border player-panel">
              <div class="bar-row">
                <span class="hp-prefix">HP</span>
                <div class="hp-track hp-track-large">
                  <div class="hp-fill player-fill" :style="{ width: playerHpPercent }"></div>
                </div>
                <span class="hp-number">{{ Math.max(0, Math.ceil(playerHp)) }} / {{ playerMaxHp }}</span>
              </div>

              <div v-if="!hideSkillHud" id="player-mp-anchor" class="bar-row mp-row">
                <span class="mp-prefix">MP</span>
                <div class="hp-track mp-track">
                  <div class="mp-fill" :style="{ width: skillPointsPercent }"></div>
                </div>
                <span class="hp-number mp-number">{{ skillPointsDisplay }} / 100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  shouldShowBattleMenuTrigger: {
    type: Boolean,
    default: false
  },
  playerAvatarUrl: {
    type: String,
    required: true
  },
  playerName: {
    type: String,
    default: 'SAMUREYE'
  },
  opponentName: {
    type: String,
    default: '對手'
  },
  opponentAvatarUrl: {
    type: String,
    default: ''
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
  },
  hideSkillHud: {
    type: Boolean,
    default: false
  },
  disableSkillButtons: {
    type: Boolean,
    default: false
  }
});

defineEmits(['use-skill', 'open-battle-menu']);

const opponentHpPercent = computed(() => `${props.opponentHp / props.opponentMaxHp * 100}%`);
const playerHpPercent = computed(() => `${props.playerHp / props.playerMaxHp * 100}%`);
const skillPointsDisplay = computed(() => {
  return Math.max(0, Math.min(100, Math.round(Number(props.skillPoints) || 0)));
});
const skillPointsPercent = computed(() => `${skillPointsDisplay.value}%`);
const playerLabelText = computed(() => {
  const text = String(props.playerName ?? '').trim();
  return text || 'SAMUREYE';
});
const opponentLabelText = computed(() => {
  const text = String(props.opponentName ?? '').trim();
  return text || '對手';
});
const resolvedOpponentAvatarUrl = computed(() => {
  return String(props.opponentAvatarUrl || '').trim();
});

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
    && !props.disableSkillButtons
    && props.playerDebuff !== 'cataract'
    && getSkillCooldownLeft(skill.id) <= 0;
}

function isSkillDisabled(skill) {
  return props.skillPoints < skill.cost
    || props.gameState !== 'playing'
    || props.disableSkillButtons
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

function formatSkillNameLines(name) {
  const source = typeof name === 'string' ? name : '';
  const lines = source
    .split('．')
    .map(part => part.trim())
    .filter(Boolean);
  return lines.length ? lines.slice(0, 2) : [''];
}

</script>
