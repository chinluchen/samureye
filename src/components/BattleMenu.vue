<template>
  <div class="battle-menu-overlay">
    <div class="battle-menu-card pixel-border">
      <h2 class="battle-menu-title">戰鬥選單</h2>

      <template v-if="view === 'main'">
        <button type="button" class="battle-menu-button" @click="$emit('go-home')">回主選單</button>
        <button type="button" class="battle-menu-button" @click="$emit('restart')">重新開始</button>
        <button type="button" class="battle-menu-button" @click="$emit('open-settings')">設定</button>
        <button type="button" class="battle-menu-button battle-menu-button-subtle" @click="$emit('close')">返回</button>
      </template>

      <template v-else>
        <div class="battle-setting-row">
          <label class="battle-setting-label" for="volume-range">音量</label>
          <input
            id="volume-range"
            class="battle-setting-range"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="volume"
            @input="$emit('volume-change', Number($event.target.value))"
          >
        </div>

        <label class="battle-setting-toggle">
          <input
            type="checkbox"
            :checked="sfxEnabled"
            @change="$emit('sfx-toggle', $event.target.checked)"
          >
          <span>音效開關</span>
        </label>

        <label class="battle-setting-toggle">
          <input
            type="checkbox"
            :checked="bgmEnabled"
            @change="$emit('bgm-toggle', $event.target.checked)"
          >
          <span>背景音樂</span>
        </label>

        <label class="battle-setting-toggle">
          <input
            type="checkbox"
            :checked="vibrationEnabled"
            @change="$emit('vibration-toggle', $event.target.checked)"
          >
          <span>震動</span>
        </label>

        <button type="button" class="battle-menu-button battle-menu-button-subtle" @click="$emit('back-main')">返回</button>
      </template>
    </div>
  </div>
</template>

<script setup>
defineProps({
  view: {
    type: String,
    required: true
  },
  volume: {
    type: Number,
    required: true
  },
  sfxEnabled: {
    type: Boolean,
    required: true
  },
  bgmEnabled: {
    type: Boolean,
    required: true
  },
  vibrationEnabled: {
    type: Boolean,
    required: true
  }
});

defineEmits([
  'go-home',
  'restart',
  'open-settings',
  'close',
  'back-main',
  'volume-change',
  'sfx-toggle',
  'bgm-toggle',
  'vibration-toggle'
]);
</script>
