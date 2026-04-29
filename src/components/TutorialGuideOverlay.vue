<template>
  <div class="tutorial-guide-layer">
    <div class="tutorial-mask-hole" :style="focusRectStyle"></div>
    <div class="tutorial-focus-ring" :style="focusRectStyle"></div>

    <div v-if="step === 'gesture'" class="tutorial-gesture-demo" :style="gestureStyle" aria-hidden="true">
      <div class="tutorial-gesture-line"></div>
      <div class="tutorial-gesture-hand">👆</div>
    </div>

    <article class="tutorial-guide-card pixel-border" :class="`tutorial-guide-card-${cardPosition}`">
      <p class="tutorial-guide-step">教學模式</p>
      <h3 class="tutorial-guide-title">{{ title }}</h3>
      <p class="tutorial-guide-text">{{ description }}</p>

      <p v-if="step === 'practice'" class="tutorial-guide-progress">
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
  step: { type: String, required: true },
  progressCount: { type: Number, default: 0 },
  requiredHits: { type: Number, default: 3 },
  focusRect: {
    type: Object,
    default: null
  }
});

defineEmits(['next']);

const stepMeta = computed(() => {
  if (props.step === 'focus') {
    return {
      title: '鎖定中央視標',
      description: '這是你本回合的主要攻擊目標，先專注在中央 C 字視標。',
      buttonText: '下一步',
      showNextButton: true,
      cardPosition: 'bottom',
      rect: { left: 26, top: 27, width: 48, height: 22 }
    };
  }

  if (props.step === 'gesture') {
    return {
      title: '手勢操作示範',
      description: '教學固定為向右開口，請像示範一樣往右快速滑動。',
      buttonText: '我懂了',
      showNextButton: true,
      cardPosition: 'bottom',
      rect: { left: 26, top: 27, width: 48, height: 22 }
    };
  }

  if (props.step === 'practice') {
    return {
      title: '開始實作',
      description: '依序完成 3 次操作：向右、向下、向左上滑動。',
      buttonText: '',
      showNextButton: false,
      cardPosition: 'bottom',
      rect: { left: 26, top: 27, width: 48, height: 22 }
    };
  }

  if (props.step === 'hpEnemy') {
    return {
      title: '敵方血條資訊',
      description: '上方紅色血條是敵人的生命值，先把敵方血量壓低。',
      buttonText: '下一步',
      showNextButton: true,
      cardPosition: 'bottom',
      rect: { left: 2, top: 1, width: 96, height: 20 }
    };
  }

  if (props.step === 'hpPlayer') {
    return {
      title: '我方血條資訊',
      description: '下方藍色血條是你的生命值，戰鬥時要避免被打空。',
      buttonText: '下一步',
      showNextButton: true,
      cardPosition: 'top',
      rect: { left: 2, top: 82, width: 96, height: 17 }
    };
  }

  if (props.step === 'skills') {
    return {
      title: '絕招欄位',
      description: '右下角是你的絕招欄位，MP 足夠時技能按鈕會亮起可施放。',
      buttonText: '下一步',
      showNextButton: true,
      cardPosition: 'top',
      rect: { left: 60, top: 72, width: 38, height: 16 }
    };
  }

  return {
    title: 'MP 用途',
    description: 'MP 是施放絕招的資源。教學先一次補滿 100%，可以立即試招。',
    buttonText: '開始對戰',
    showNextButton: true,
    cardPosition: 'top',
    rect: { left: 4, top: 84, width: 46, height: 13 }
  };
});

const title = computed(() => stepMeta.value.title);
const description = computed(() => stepMeta.value.description);
const buttonText = computed(() => stepMeta.value.buttonText);
const showNextButton = computed(() => stepMeta.value.showNextButton);
const cardPosition = computed(() => stepMeta.value.cardPosition ?? 'bottom');
const focusRect = computed(() => props.focusRect ?? stepMeta.value.rect);
const cornerRadiusPx = 12;
const focusRectStyle = computed(() => ({
  left: `${focusRect.value.left}%`,
  top: `${focusRect.value.top}%`,
  width: `${focusRect.value.width}%`,
  height: `${focusRect.value.height}%`,
  borderRadius: `${cornerRadiusPx}px`
}));
const gestureStyle = computed(() => ({
  left: `${Math.max(8, focusRect.value.left + (focusRect.value.width * 0.06))}%`,
  top: `${focusRect.value.top + (focusRect.value.height * 0.5)}%`,
  width: `${Math.min(84, focusRect.value.width * 0.88)}%`,
  transform: 'translateY(-50%)'
}));
</script>
