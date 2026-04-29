<template>
  <div id="cutscene-layer" :class="{ 'enemy-ult': isEnemyTurn }">
    <div class="cutscene-portrait">
      <span v-if="isEnemyTurn">👹</span>
      <img v-else class="cutscene-portrait-img" :src="samuFrontPortraitUrl" alt="">
    </div>
    <div class="cutscene-skill-name">{{ skillName }}</div>
  </div>
</template>

<script setup>
import samuFrontPortraitUrl from '../image/characters/samu-q-front.runtime.webp';

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
