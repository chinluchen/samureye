<template>
  <div id="result-layer">
    <h2 class="result-title" :class="playerHp > opponentHp ? 'win-title' : 'lose-title'">
      {{ playerHp > opponentHp ? '勝利' : '敗北' }}
    </h2>

    <div class="result-card">
      <div class="result-row">
        <span>總擊中次數</span>
        <strong>{{ playerTotalHits }}</strong>
      </div>
      <div class="result-row">
        <span>剩餘血量</span>
        <strong class="remaining-hp">{{ Math.max(0, Math.ceil(playerHp)) }}</strong>
      </div>
    </div>

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
  },
  playerTotalHits: {
    type: Number,
    required: true
  }
});

defineEmits(['restart']);
</script>
