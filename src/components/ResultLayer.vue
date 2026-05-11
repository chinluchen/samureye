<template>
  <div id="result-layer">
    <h2 class="result-title" :class="titleClassName">
      {{ titleText }}
    </h2>

    <template v-if="isPvpResult">
      <div class="result-action-grid">
        <button type="button" class="restart-button" @click="$emit('open-matchmaking')">
          再次配對
        </button>
        <button type="button" class="restart-button result-sub-button" @click="$emit('go-home')">
          回主選單
        </button>
      </div>
    </template>
    <template v-else>
      <div class="result-action-grid">
        <button type="button" class="restart-button" @click="$emit('play-again')">
          再次遊玩
        </button>
        <button type="button" class="restart-button result-sub-button" @click="$emit('open-stage-select')">
          關卡選單
        </button>
        <button type="button" class="restart-button result-sub-button" @click="$emit('go-home')">
          回主選單
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';

defineEmits(['play-again', 'open-stage-select', 'open-matchmaking', 'go-home']);

const props = defineProps({
  playerHp: {
    type: Number,
    required: true
  },
  opponentHp: {
    type: Number,
    required: true
  },
  outcome: {
    type: String,
    required: true,
    validator: (value) => ['win', 'lose', 'draw'].includes(value)
  },
  isPvp: {
    type: Boolean,
    default: false
  }
});

const titleText = computed(() => {
  if (props.outcome === 'win') return '勝利';
  if (props.outcome === 'draw') return '平手';
  return '敗北';
});

const titleClassName = computed(() => {
  if (props.outcome === 'win') return 'win-title';
  if (props.outcome === 'draw') return 'draw-title';
  return 'lose-title';
});

const isPvpResult = computed(() => props.isPvp);
</script>
