<template>
  <div class="tutorial-guide-layer">
    <div v-if="shouldShowFocusRect" class="tutorial-mask-hole" :style="focusRectStyle"></div>
    <div v-if="shouldShowFocusRect" class="tutorial-focus-ring" :style="focusRectStyle"></div>

    <div v-if="showGestureDemo" class="tutorial-gesture-demo" :style="gestureStyle" aria-hidden="true">
      <div class="tutorial-gesture-line"></div>
      <div class="tutorial-gesture-hand">👆</div>
    </div>

    <article class="tutorial-guide-card pixel-border" :class="`tutorial-guide-card-${cardPosition}`">
      <h3 class="tutorial-guide-title">{{ title }}</h3>
      <p class="tutorial-guide-text">{{ description }}</p>

      <p v-if="showProgress" class="tutorial-guide-progress">
        成功操作：{{ progressCount }} / {{ requiredHits }}
      </p>

      <button
        v-if="showNextButton"
        type="button"
        class="tutorial-guide-next"
        @click="$emit('next')"
      >
        {{ buttonText }}
      </button>
    </article>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  meta: {
    type: Object,
    required: true
  },
  progressCount: { type: Number, default: 0 },
  requiredHits: { type: Number, default: 3 },
  focusRect: {
    type: Object,
    default: null
  }
});

defineEmits(['next']);

const title = computed(() => String(props.meta?.title ?? '').trim() || '教學');
const description = computed(() => String(props.meta?.description ?? '').trim());
const buttonText = computed(() => String(props.meta?.buttonText ?? '').trim());
const showNextButton = computed(() => Boolean(props.meta?.showNextButton));
const cardPosition = computed(() => props.meta?.cardPosition ?? 'bottom');
const showProgress = computed(() => Boolean(props.meta?.showProgress));
const showGestureDemo = computed(() => Boolean(props.meta?.showGestureDemo));
const shouldShowFocusRect = computed(() => Boolean(props.meta?.showFocusRect) && Boolean(props.focusRect));

const cornerRadiusPx = 12;
const focusRectStyle = computed(() => {
  if (!props.focusRect) return {};
  return {
    left: `${props.focusRect.left}%`,
    top: `${props.focusRect.top}%`,
    width: `${props.focusRect.width}%`,
    height: `${props.focusRect.height}%`,
    borderRadius: `${cornerRadiusPx}px`
  };
});

const gestureStyle = computed(() => {
  if (!props.focusRect) {
    return {
      left: '50%',
      top: '50%',
      width: '40%',
      transform: 'translate(-50%, -50%)'
    };
  }

  return {
    left: `${Math.max(8, props.focusRect.left + (props.focusRect.width * 0.06))}%`,
    top: `${props.focusRect.top + (props.focusRect.height * 0.5)}%`,
    width: `${Math.min(84, props.focusRect.width * 0.88)}%`,
    transform: 'translateY(-50%)'
  };
});
</script>
