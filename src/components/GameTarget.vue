<template>
  <div id="game-canvas-layer">
    <div class="target-stage">
      <div
        v-show="gameState !== 'intro' && !isSplitting"
        id="target-anchor"
        class="target-anchor"
        :style="[targetTransform, targetOpacity]"
      >
        <svg class="c-ring-base" viewBox="0 0 160 160" aria-hidden="true">
          <defs>
            <mask id="landolt-c-notch" maskUnits="userSpaceOnUse">
              <rect x="0" y="0" width="160" height="160" fill="#fff" />
              <rect x="80" y="66.8" width="80" height="26.4" fill="#000" />
            </mask>
          </defs>
          <path
            class="c-ring-shape"
            fill-rule="evenodd"
            mask="url(#landolt-c-notch)"
            d="M80 14
               A66 66 0 1 1 80 146
               A66 66 0 1 1 80 14
               M80 40.4
               A39.6 39.6 0 1 0 80 119.6
               A39.6 39.6 0 1 0 80 40.4
               Z"
          />
        </svg>
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
