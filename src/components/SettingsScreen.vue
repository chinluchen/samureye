<template>
  <section class="settings-screen">
    <header class="settings-header">
      <button type="button" class="study-back-btn pixel-border" @click="$emit('back-home')">返回</button>
      <h2 class="settings-title">設定</h2>
      <div aria-hidden="true"></div>
    </header>

    <article class="settings-card pixel-border">
      <div class="battle-setting-row">
        <label class="battle-setting-label" for="settings-volume-range">音樂音量</label>
        <input
          id="settings-volume-range"
          class="battle-setting-range"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="volume"
          @input="emitVolumeChange"
          @change="emitVolumeChange"
          @touchend="emitVolumeChange"
          @pointerup="emitVolumeChange"
          @mouseup="emitVolumeChange"
        >
      </div>

      <div class="battle-setting-row">
        <label class="battle-setting-label" for="settings-sfx-volume-range">音效音量</label>
        <input
          id="settings-sfx-volume-range"
          class="battle-setting-range"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="sfxVolume"
          @input="emitSfxVolumeChange"
          @change="emitSfxVolumeChange"
          @touchend="emitSfxVolumeChange"
          @pointerup="emitSfxVolumeChange"
          @mouseup="emitSfxVolumeChange"
        >
      </div>

      <label class="battle-setting-toggle">
        <input type="checkbox" :checked="sfxEnabled" @change="$emit('sfx-toggle', $event.target.checked)">
        <span>音效開關</span>
      </label>

      <label class="battle-setting-toggle">
        <input type="checkbox" :checked="bgmEnabled" @change="$emit('bgm-toggle', $event.target.checked)">
        <span>音樂開關</span>
      </label>

      <label class="battle-setting-toggle">
        <input type="checkbox" :checked="vibrationEnabled" @change="$emit('vibration-toggle', $event.target.checked)">
        <span>震動</span>
      </label>
    </article>

    <article class="settings-card pixel-border">
      <h3 class="settings-section-title">Game Center</h3>
      <div class="settings-gamecenter-row">
        <span class="settings-gamecenter-label">連接狀態</span>
        <span class="settings-gamecenter-status" :class="`state-${normalizedGameCenterStatus}`">{{ gameCenterStatusLabel }}</span>
      </div>
      <div class="settings-gamecenter-row">
        <span class="settings-gamecenter-label">玩家名稱</span>
        <span class="settings-gamecenter-value">{{ gameCenterDisplayName }}</span>
      </div>
      <div class="settings-gamecenter-row settings-gamecenter-row-input">
        <label class="settings-gamecenter-label" for="settings-pvp-nickname">遊戲暱稱</label>
        <input
          id="settings-pvp-nickname"
          class="settings-gamecenter-input"
          type="text"
          maxlength="16"
          :value="pvpNickname"
          placeholder="輸入對戰暱稱"
          @input="$emit('pvp-nickname-change', $event.target.value)"
        >
      </div>
      <p class="settings-gamecenter-note">對戰顯示使用此暱稱，真實身分仍為 Game Center playerId。</p>
      <button type="button" class="battle-menu-button" @click="$emit('gamecenter-connect')">連接 Game Center</button>
      <button type="button" class="battle-menu-button battle-menu-button-subtle" @click="$emit('gamecenter-refresh')">重新檢查 Game Center</button>
      <button type="button" class="battle-menu-button battle-menu-button-subtle" @click="$emit('gamecenter-clear-local')">清除本機綁定資訊</button>
    </article>

  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  volume: { type: Number, required: true },
  sfxVolume: { type: Number, required: true },
  sfxEnabled: { type: Boolean, required: true },
  bgmEnabled: { type: Boolean, required: true },
  vibrationEnabled: { type: Boolean, required: true },
  gameCenterStatus: { type: String, default: 'checking' },
  pvpNickname: { type: String, default: '' },
  gameCenterSession: {
    type: Object,
    default: () => ({
      isAuthenticated: false,
      displayName: '',
      alias: '',
      gameCenterId: ''
    })
  }
});

const emit = defineEmits([
  'back-home',
  'volume-change',
  'sfx-volume-change',
  'sfx-toggle',
  'bgm-toggle',
  'vibration-toggle',
  'gamecenter-connect',
  'gamecenter-refresh',
  'gamecenter-clear-local',
  'pvp-nickname-change'
]);

function normalizeRangeEventValue(event) {
  const rawValue = Number(event?.currentTarget?.value ?? event?.target?.value);
  if (!Number.isFinite(rawValue)) return 0;
  return Math.max(0, Math.min(1, rawValue));
}

function emitVolumeChange(event) {
  emit('volume-change', normalizeRangeEventValue(event));
}

function emitSfxVolumeChange(event) {
  emit('sfx-volume-change', normalizeRangeEventValue(event));
}

const normalizedGameCenterStatus = computed(() => {
  const text = String(props.gameCenterStatus || '').trim().toLowerCase();
  if (['checking', 'authenticated', 'unauthenticated', 'error'].includes(text)) return text;
  return 'checking';
});

const gameCenterStatusLabel = computed(() => {
  if (normalizedGameCenterStatus.value === 'authenticated') return '已連接';
  if (normalizedGameCenterStatus.value === 'checking') return '檢查中';
  if (normalizedGameCenterStatus.value === 'error') return '連線異常';
  if (normalizedGameCenterStatus.value === 'unauthenticated') return '未連接';
  return '未檢查';
});

const gameCenterDisplayName = computed(() => {
  const name = String(props.gameCenterSession?.displayName || '').trim()
    || String(props.gameCenterSession?.alias || '').trim();
  return name || '尚未取得';
});
</script>
