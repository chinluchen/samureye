<template>
  <section class="settings-screen">
    <header class="settings-header">
      <button type="button" class="study-back-btn pixel-border" @click="$emit('back-home')">返回</button>
      <h2 class="settings-title">技能配置</h2>
      <div class="settings-account">{{ selectedIds.length }} / {{ maxSlots }}</div>
    </header>

    <article class="settings-card pixel-border">
      <p class="skill-config-note">玩家可從共用技能池（{{ skills.length }} 技能）裝備 {{ maxSlots }} 個技能。敵方會自行使用同一池技能。</p>
      <div class="skill-config-grid">
        <button
          v-for="skill in skills"
          :key="skill.id"
          type="button"
          class="skill-config-card"
          :class="{ active: selectedIds.includes(skill.id) }"
          @click="$emit('toggle-skill', skill.id)"
        >
          <span class="skill-config-icon">{{ skill.icon }}</span>
          <span class="skill-config-main">
            <span class="skill-config-name">{{ skill.name }}</span>
            <span class="skill-config-meta">{{ skill.extraEffect }}</span>
          </span>
          <span class="skill-config-cost">
            {{ skill.cost }} MP / CD {{ skill.cooldownSec ?? '-' }}s / {{ skill.damage }} DMG
          </span>
        </button>
      </div>
    </article>
  </section>
</template>

<script setup>
defineProps({
  skills: { type: Array, required: true },
  selectedIds: { type: Array, required: true },
  maxSlots: { type: Number, default: 3 }
});

defineEmits(['back-home', 'toggle-skill']);
</script>
