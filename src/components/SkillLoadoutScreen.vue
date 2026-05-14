<template>
  <section class="settings-screen">
    <header class="settings-header">
      <button type="button" class="study-back-btn pixel-border" @click="$emit('back-home')">返回</button>
      <h2 class="settings-title">技能配置</h2>
      <div aria-hidden="true"></div>
    </header>

    <article class="settings-card pixel-border">
      <template v-if="!isUnlocked">
        <p class="skill-config-note">技能配置尚未解鎖，請先通關教學關卡（第1關）後開放。</p>
      </template>
      <template v-else>
        <p class="skill-config-note">技能系統建置中，近期會開放解鎖與裝備功能。</p>
      </template>
    </article>

    <div class="screen-bottom-status pixel-border">
      {{ isUnlocked ? `${selectedIds.length} / ${maxSlots}` : '未解鎖' }}
    </div>
  </section>
</template>

<script setup>
defineProps({
  isUnlocked: { type: Boolean, default: false },
  skills: { type: Array, required: true },
  selectedIds: { type: Array, required: true },
  maxSlots: { type: Number, default: 3 }
});

defineEmits(['back-home', 'toggle-skill']);
</script>
