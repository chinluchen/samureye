<template>
  <div id="result-layer">
    <h2 class="result-title" :class="playerHp > opponentHp ? 'win-title' : 'lose-title'">
      {{ playerHp > opponentHp ? '勝利' : '敗北' }}
    </h2>

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
  </div>
</template>

<script setup>
defineProps({
  playerHp: {
    type: Number,
    required: true
  },
  opponentHp: {
    type: Number,
    required: true
  }
});

defineEmits(['play-again', 'open-stage-select', 'go-home']);
</script>
