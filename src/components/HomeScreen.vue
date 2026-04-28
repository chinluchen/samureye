<template>
  <section class="home-screen">
    <div class="home-bg-shape home-bg-shape-a"></div>
    <div class="home-bg-shape home-bg-shape-b"></div>

    <header class="home-header">
      <p class="home-tag">Vision Blade Arena</p>
      <h1 class="home-title">SAMUREYE</h1>
      <p class="home-subtitle">視覺判讀・連斬對決</p>
    </header>

    <div class="home-card">
      <button type="button" class="home-start-button" disabled>
        玩家對戰
      </button>

      <div class="home-menu-grid">
        <button type="button" class="home-menu-button home-menu-button-active" @click="$emit('start-battle')">關卡模式</button>
        <button type="button" class="home-menu-button home-menu-button-active" @click="$emit('open-study')">讀書強化</button>
        <button type="button" class="home-menu-button" disabled>天梯排行</button>
        <button type="button" class="home-menu-button home-menu-button-active" @click="$emit('open-settings')">設定</button>
      </div>
    </div>
  </section>
</template>

<script setup>
defineEmits(['start-battle', 'open-study', 'open-settings']);
</script>
