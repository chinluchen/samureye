<template>
  <section class="settings-screen">
    <header class="settings-header">
      <button type="button" class="study-back-btn pixel-border" @click="$emit('back-home')">返回</button>
      <h2 class="settings-title">設定</h2>
      <div class="settings-account">{{ accountLabel }}</div>
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
          @input="$emit('volume-change', Number($event.target.value))"
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
          @input="$emit('sfx-volume-change', Number($event.target.value))"
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
      <h3 class="settings-section-title">帳號</h3>
      <button type="button" class="battle-menu-button" @click="$emit('login-account')">登入帳號</button>
      <button type="button" class="battle-menu-button battle-menu-button-subtle" @click="$emit('logout-account')">登出</button>
      <button type="button" class="battle-menu-button settings-danger-button" @click="$emit('delete-account')">刪除帳號</button>
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
  accountName: { type: String, default: '' }
});

defineEmits([
  'back-home',
  'volume-change',
  'sfx-volume-change',
  'sfx-toggle',
  'bgm-toggle',
  'vibration-toggle',
  'login-account',
  'logout-account',
  'delete-account'
]);

const accountLabel = computed(() => (props.accountName ? `已登入：${props.accountName}` : '未登入'));
</script>
