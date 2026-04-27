<template>
  <div id="cutscene-layer" :class="{ 'enemy-ult': isEnemyTurn }">
    <div class="cutscene-portrait">{{ isEnemyTurn ? '👹' : '🥷' }}</div>
    <div class="cutscene-skill-name">{{ skillName }}</div>
  </div>
</template>

<script setup>
defineProps({
  isEnemyTurn: {
    type: Boolean,
    required: true
  },
  skillName: {
    type: String,
    default: ''
  }
});
</script>
