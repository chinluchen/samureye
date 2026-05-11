<template>
  <div
    v-if="animation"
    id="skill-animation-layer"
    class="skill-animation-layer"
    :class="`role-${animation.role || 'target'}`"
  >
    <div class="skill-animation-core">
      <div class="skill-animation-ring"></div>
      <div class="skill-animation-icon">
        {{ animation.role === 'caster' ? '⚔️' : '🛡️' }}
      </div>
      <div class="skill-animation-label">
        <div class="skill-animation-title">{{ animation.title || animation.skillId }}</div>
        <div class="skill-animation-meta">{{ animation.animationKey }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue';

const props = defineProps({
  animation: {
    type: Object,
    default: null
  }
});

watch(
  () => props.animation,
  (value) => {
    if (!value) return;
    console.info(`[PvP Sync] SkillAnimationLayer render castId=${value.castId} skillId=${value.skillId} animationKey=${value.animationKey} role=${value.role}`);
  },
  { immediate: true, deep: true }
);
</script>
