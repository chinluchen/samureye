<template>
  <div id="game-canvas-layer">
    <div class="target-stage">
      <div
        v-show="gameState !== 'intro' && !isSplitting"
        id="target-anchor"
        class="target-anchor"
        :style="[targetTransform, targetOpacity]"
      >
        <div class="c-ring-base"></div>
      </div>

      <div v-if="announcementText" id="round-announcement" class="announcement-box">
        {{ announcementText }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  gameState: {
    type: String,
    required: true
  },
  isSplitting: {
    type: Boolean,
    required: true
  },
  targetTransform: {
    type: Object,
    required: true
  },
  announcementText: {
    type: String,
    default: ''
  }
});

const targetOpacity = computed(() => ({
  opacity: props.gameState === 'skillCutscene' || props.gameState === 'finishing' ? 0.3 : 1
}));
</script>
