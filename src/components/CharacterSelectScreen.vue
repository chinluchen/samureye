<template>
  <section class="settings-screen">
    <header class="settings-header">
      <button type="button" class="study-back-btn pixel-border" @click="$emit('back-home')">返回</button>
      <h2 class="settings-title">角色選擇</h2>
      <div class="settings-account">目前角色</div>
    </header>

    <article class="settings-card pixel-border">
      <div class="character-grid">
        <button
          v-for="character in characters"
          :key="character.id"
          type="button"
          class="character-card"
          :class="{ active: character.id === selectedId }"
          @click="$emit('select-character', character.id)"
        >
          <img class="character-thumb" :src="character.avatarUrl" :alt="character.name">
          <p class="character-name">{{ character.name }}</p>
          <p class="character-desc">{{ character.description }}</p>
        </button>
      </div>
    </article>
  </section>
</template>

<script setup>
defineProps({
  characters: { type: Array, required: true },
  selectedId: { type: String, required: true }
});

defineEmits(['back-home', 'select-character']);
</script>
