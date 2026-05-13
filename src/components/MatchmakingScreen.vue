<template>
  <section class="settings-screen">
    <header class="settings-header">
      <button type="button" class="study-back-btn pixel-border" @click="$emit('back-home')">返回</button>
      <h2 class="settings-title">玩家對戰</h2>
      <div class="settings-account">{{ providerLabel }}</div>
    </header>

    <article class="settings-card pixel-border matchmaking-card">
      <div class="matchmaking-profile-row">
        <div class="matchmaking-avatar">{{ localAvatar }}</div>
        <div class="matchmaking-profile-main">
          <p class="matchmaking-name">{{ localName }}</p>
          <p class="matchmaking-sub">你的對戰名</p>
        </div>
        <button
          type="button"
          class="home-menu-button home-menu-button-active matchmaking-cta-secondary"
          @click="$emit('sign-in')"
        >
          同步帳號
        </button>
      </div>

      <div v-if="!fogVisible" class="matchmaking-status-box">
        <p class="matchmaking-status-label">配對狀態</p>
        <p class="matchmaking-status-text">{{ status.message }}</p>
        <p v-if="status.phase === 'searching'" class="matchmaking-status-sub">已搜尋 {{ status.queueSeconds }} 秒</p>
        <p v-if="status.errorMessage" class="matchmaking-status-error">{{ status.errorMessage }}</p>
      </div>

      <div v-if="countdownVisible" class="matchmaking-countdown-overlay pixel-border" aria-live="polite">
        <span class="matchmaking-countdown-fog matchmaking-countdown-fog-a" aria-hidden="true"></span>
        <span class="matchmaking-countdown-fog matchmaking-countdown-fog-b" aria-hidden="true"></span>
        <div class="matchmaking-countdown-content">
          <p class="matchmaking-countdown-title">即將開戰</p>
          <p class="matchmaking-countdown-number">{{ countdownNumber }}</p>
        </div>
      </div>

      <div v-if="status.opponentProfile" class="matchmaking-opponent-box">
        <div class="matchmaking-avatar">{{ status.opponentProfile.avatarEmoji || '🥷' }}</div>
        <div>
          <p class="matchmaking-name">{{ status.opponentProfile.displayName }}</p>
          <p class="matchmaking-sub">已找到對手</p>
        </div>
      </div>

      <div v-if="!fogVisible" class="matchmaking-actions">
        <button
          v-if="status.phase !== 'searching' && status.phase !== 'matched'"
          type="button"
          class="home-start-button matchmaking-cta-primary"
          @click="$emit('start-match')"
        >
          開始配對
        </button>
        <button
          v-else
          type="button"
          class="home-start-button matchmaking-cta-cancel"
          @click="$emit('cancel-match')"
        >
          取消配對
        </button>

        <button
          v-if="status.phase === 'matched'"
          type="button"
          class="home-menu-button home-menu-button-active matchmaking-cta-go"
          :disabled="Boolean(status.startPending)"
          @click="$emit('ready-battle')"
        >
          {{ readyButtonLabel }}
        </button>
      </div>
    </article>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  status: {
    type: Object,
    required: true
  },
  capabilities: {
    type: Object,
    required: true
  }
});

const providerLabel = computed(() => {
  if (props.capabilities.provider === 'gamecenter') return 'Game Center';
  return 'Mock';
});

const localName = computed(() => props.status.localProfile?.displayName || 'SAMUREYE');
const localAvatar = computed(() => props.status.localProfile?.avatarEmoji || '🗡️');
const nowMs = ref(Date.now());
let countdownTimer = null;

function clearCountdownTimer() {
  if (!countdownTimer) return;
  clearInterval(countdownTimer);
  countdownTimer = null;
}

function ensureCountdownTimer() {
  if (countdownTimer) return;
  countdownTimer = setInterval(() => {
    nowMs.value = Date.now();
  }, 120);
}

const countdownVisible = computed(() => {
  return props.status.phase === 'matched'
    && Boolean(props.status.startPending)
    && !Boolean(props.status.fogPending)
    && Number.isFinite(Number(props.status.startAtMs))
    && Number(props.status.startAtMs) > 0;
});

const fogVisible = computed(() => {
  return props.status.phase === 'matched'
    && Boolean(props.status.startPending)
    && Boolean(props.status.fogPending)
    && Number.isFinite(Number(props.status.fogEndAtMs))
    && Number(props.status.fogEndAtMs) > 0;
});

const countdownNumber = computed(() => {
  if (!countdownVisible.value) return 3;
  const remainMs = Number(props.status.startAtMs) - nowMs.value;
  if (remainMs <= 0) return 1;
  return Math.max(1, Math.ceil(remainMs / 1000));
});

const readyButtonLabel = computed(() => {
  if (!props.status.startPending) return props.status.localReady ? '取消準備' : '準備對戰';
  return '準備中...';
});

const overlayActive = computed(() => countdownVisible.value);

watch(
  overlayActive,
  (visible) => {
    nowMs.value = Date.now();
    if (visible) {
      ensureCountdownTimer();
      return;
    }
    clearCountdownTimer();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  clearCountdownTimer();
});

defineEmits(['back-home', 'sign-in', 'start-match', 'cancel-match', 'ready-battle']);
</script>
