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
import { computed, ref, watch } from 'vue';

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

const PVP_RESULT_TITLES = Object.freeze({
  win: Object.freeze(['勝利屬於有唸書的人!', '獲勝', '大贏']),
  draw: Object.freeze(['平手', '勢均力敵', '難分高下']),
  lose: Object.freeze(['再多練練吧', '視光學多讀一點', '輸家就去多唸點書'])
});

function pickRandomTitle(options = []) {
  if (!Array.isArray(options) || options.length <= 0) return '';
  const index = Math.floor(Math.random() * options.length);
  return String(options[index] ?? '').trim();
}

const titleText = ref('');

watch(
  () => [props.isPvp, props.outcome],
  () => {
    if (props.isPvp) {
      const pool = PVP_RESULT_TITLES[props.outcome] ?? [];
      titleText.value = pickRandomTitle(pool) || '對戰結果';
      return;
    }

    if (props.outcome === 'win') {
      titleText.value = '勝利';
      return;
    }
    if (props.outcome === 'draw') {
      titleText.value = '平手';
      return;
    }
    titleText.value = '敗北';
  },
  { immediate: true }
);

const titleClassName = computed(() => {
  if (props.outcome === 'win') return 'win-title';
  if (props.outcome === 'draw') return 'draw-title';
  return 'lose-title';
});

const isPvpResult = computed(() => props.isPvp);
</script>
