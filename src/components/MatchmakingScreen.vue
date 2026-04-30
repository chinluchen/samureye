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

      <div class="matchmaking-status-box">
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

      <div class="matchmaking-actions">
        <button
          v-if="status.phase !== 'searching'"
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
          @click="$emit('start-battle')"
        >
          進入對戰（示範）
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
  }
});

const providerLabel = computed(() => {
  if (props.capabilities.provider === 'gamecenter') return 'Game Center';
  return 'Mock';
});

const localName = computed(() => props.status.localProfile?.displayName || 'SAMUREYE');
const localAvatar = computed(() => props.status.localProfile?.avatarEmoji || '🗡️');

defineEmits(['back-home', 'sign-in', 'start-match', 'cancel-match', 'start-battle']);
</script>
