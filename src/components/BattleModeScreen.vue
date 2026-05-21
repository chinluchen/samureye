<template>
  <section class="settings-screen">
    <header class="settings-header">
      <button type="button" class="study-back-btn pixel-border" @click="$emit('back-home')">返回</button>
      <h2 class="settings-title">開始戰鬥</h2>
      <div aria-hidden="true"></div>
    </header>

    <div class="battle-mode-screen-actions">
      <button
        type="button"
        class="home-menu-button home-menu-button-active battle-mode-screen-button"
        @click="$emit('open-stage-select')"
      >
        關卡選擇
      </button>
      <button
        type="button"
        class="home-menu-button home-menu-button-active battle-mode-screen-button"
        @click="$emit('open-matchmaking')"
      >
        玩家對戰
      </button>
    </div>
  </section>
</template>

<script setup>
defineEmits(['back-home', 'open-stage-select', 'open-matchmaking']);
</script>
