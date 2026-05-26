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
      <div class="home-primary-stack">
        <button
          type="button"
          class="home-start-button"
          @click="$emit('open-battle-mode')"
        >
          開始戰鬥
        </button>
      </div>

      <div class="home-menu-grid">
        <button type="button" class="home-menu-button home-menu-button-active" @click="$emit('open-study')">知識道館</button>
        <button type="button" class="home-menu-button home-menu-button-active" @click="$emit('open-character-select')">造型衣櫃</button>
        <div class="home-locked-button-wrap">
          <button
            type="button"
            class="home-menu-button home-menu-button-active"
            :class="{ 'home-menu-button-locked': !isSkillLoadoutUnlocked }"
            :aria-disabled="!isSkillLoadoutUnlocked"
            @click="onSkillLoadoutClick"
          >
            晶片工坊
          </button>
          <div v-if="!isSkillLoadoutUnlocked" class="home-locked-overlay" aria-hidden="true">
            <span class="home-locked-icon">🔒</span>
          </div>
        </div>
        <div class="home-locked-button-wrap">
          <button
            type="button"
            class="home-menu-button home-menu-button-active home-menu-button-locked"
            aria-disabled="true"
          >
            強化中心
          </button>
          <div class="home-locked-overlay" aria-hidden="true">
            <span class="home-locked-icon">🔒</span>
          </div>
        </div>
        <button type="button" class="home-menu-button home-menu-button-active" @click="$emit('open-leaderboard')">天梯排行</button>
        <button type="button" class="home-menu-button home-menu-button-active" @click="$emit('open-settings')">設定</button>
      </div>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  isSkillLoadoutUnlocked: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'open-battle-mode',
  'open-stage-select',
  'open-study',
  'open-settings',
  'open-character-select',
  'open-skill-loadout',
  'open-matchmaking',
  'open-leaderboard'
]);

function onSkillLoadoutClick(event) {
  if (!props.isSkillLoadoutUnlocked) return;
  emit('open-skill-loadout');
}
</script>
