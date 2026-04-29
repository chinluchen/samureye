<template>
  <div id="result-layer">
    <h2 class="result-title" :class="playerHp > opponentHp ? 'win-title' : 'lose-title'">
      {{ playerHp > opponentHp ? '勝利' : '敗北' }}
    </h2>

    <button type="button" class="restart-button" @click="$emit('restart')">
      再挑戰
    </button>
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

defineEmits(['restart']);
</script>
