<template>
  <section class="settings-screen">
    <header class="settings-header">
      <button type="button" class="study-back-btn pixel-border" @click="$emit('back-home')">返回</button>
      <h2 class="settings-title">玩家對戰</h2>
      <div aria-hidden="true"></div>
    </header>

    <article class="settings-card pixel-border matchmaking-card">
      <div class="matchmaking-profile-row">
        <div class="matchmaking-avatar">{{ localAvatar }}</div>
        <div class="matchmaking-profile-main">
          <p class="matchmaking-name">{{ localName }}</p>
          <p class="matchmaking-sub">你的對戰名</p>
        </div>
        <div class="matchmaking-gc-state" :class="`state-${normalizedGameCenterStatus}`">
          {{ gameCenterStateLabel }}
        </div>
      </div>

      <div v-if="!fogVisible" class="matchmaking-status-box">
        <p class="matchmaking-status-label">配對狀態</p>
        <p class="matchmaking-status-text">{{ status.message }}</p>
        <p v-if="status.phase === 'searching'" class="matchmaking-status-sub">已搜尋 {{ status.queueSeconds }} 秒</p>
        <p v-if="status.errorMessage" class="matchmaking-status-error">{{ status.errorMessage }}</p>
      </div>

      <div v-if="status.opponentProfile" class="matchmaking-opponent-box">
        <div class="matchmaking-avatar">{{ status.opponentProfile.avatarEmoji || '🥷' }}</div>
        <div>
          <p class="matchmaking-name">{{ status.opponentProfile.displayName }}</p>
          <p class="matchmaking-sub">已找到對手</p>
        </div>
      </div>

      <div v-if="showGameCenterGate && !fogVisible" class="matchmaking-gc-gate">
        <p class="matchmaking-gc-gate-title">尚未連接 Game Center</p>
        <p class="matchmaking-gc-gate-text">請先到主畫面設定頁面完成連接，再回來開始配對。</p>
        <button
          type="button"
          class="home-menu-button home-menu-button-active matchmaking-cta-secondary"
          @click="$emit('open-settings')"
        >
          前往設定頁
        </button>
      </div>

      <div v-if="!fogVisible" class="matchmaking-actions">
        <button
          v-if="!showGameCenterGate && status.phase !== 'searching' && status.phase !== 'matched'"
          type="button"
          class="home-start-button matchmaking-cta-primary"
          @click="$emit('start-match')"
        >
          開始配對
        </button>
        <button
          v-else-if="!showGameCenterGate"
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
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: Object,
    required: true
  },
  capabilities: {
    type: Object,
    required: true
  },
  gameCenterStatus: {
    type: String,
    default: 'checking'
  },
  gameCenterSession: {
    type: Object,
    default: () => ({
      isAuthenticated: false
    })
  }
});

const normalizedGameCenterStatus = computed(() => {
  const text = String(props.gameCenterStatus || '').trim().toLowerCase();
  if (['checking', 'authenticated', 'unauthenticated', 'error'].includes(text)) return text;
  return 'checking';
});
const gameCenterStateLabel = computed(() => {
  if (normalizedGameCenterStatus.value === 'authenticated') return '已連接';
  if (normalizedGameCenterStatus.value === 'checking') return '檢查中';
  if (normalizedGameCenterStatus.value === 'error') return '連線異常';
  if (normalizedGameCenterStatus.value === 'unauthenticated') return '未連接';
  return '未檢查';
});
const showGameCenterGate = computed(() => {
  if (props.capabilities.provider !== 'gamecenter') return false;
  return !Boolean(props.gameCenterSession?.isAuthenticated);
});

const localName = computed(() => props.status.localProfile?.displayName || 'SAMUREYE');
const localAvatar = computed(() => props.status.localProfile?.avatarEmoji || '🗡️');
const fogVisible = computed(() => {
  return props.status.phase === 'matched'
    && Boolean(props.status.startPending)
    && Boolean(props.status.fogPending)
    && Number.isFinite(Number(props.status.fogEndAtMs))
    && Number(props.status.fogEndAtMs) > 0;
});

const readyButtonLabel = computed(() => {
  if (!props.status.startPending) return props.status.localReady ? '取消準備' : '準備對戰';
  return '準備中...';
});

defineEmits(['back-home', 'open-settings', 'start-match', 'cancel-match', 'ready-battle']);
</script>
