<template>
  <div id="cutscene-layer" :class="{ 'enemy-ult': isEnemyTurn }">
    <div class="cutscene-portrait">
      <img v-if="isEnemyTurn && resolvedEnemyPortraitUrl" class="cutscene-portrait-img" :src="resolvedEnemyPortraitUrl" alt="">
      <span v-else-if="isEnemyTurn">👹</span>
      <img v-else class="cutscene-portrait-img" :src="resolvedPortraitUrl" alt="">
    </div>
    <div class="cutscene-skill-name">{{ skillName }}</div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import samuFrontPortraitUrl from '../image/characters/samu-q-front.runtime.webp';

const props = defineProps({
  isEnemyTurn: {
    type: Boolean,
    required: true
  },
  skillName: {
    type: String,
    default: ''
  },
  playerPortraitUrl: {
    type: String,
    default: ''
  },
  enemyPortraitUrl: {
    type: String,
    default: ''
  },
  animationMeta: {
    type: Object,
    default: null
  }
});

const resolvedPortraitUrl = computed(() => {
  const text = String(props.playerPortraitUrl || '').trim();
  return text || samuFrontPortraitUrl;
});

const resolvedEnemyPortraitUrl = computed(() => {
  return String(props.enemyPortraitUrl || '').trim();
});

watch(
  () => props.animationMeta,
  (value) => {
    if (!value) return;
    console.info(`[PvP Sync] SkillAnimationLayer render castId=${value.castId} skillId=${value.skillId} animationKey=${value.animationKey} role=${value.role}`);
  },
  { immediate: true, deep: true }
);
</script>
