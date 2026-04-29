<template>
  <section class="settings-screen">
    <header class="settings-header">
      <button type="button" class="study-back-btn pixel-border" @click="$emit('back-home')">返回</button>
      <h2 class="settings-title">關卡選擇</h2>
      <div aria-hidden="true"></div>
    </header>

    <article class="settings-card pixel-border">
      <div class="stage-select-grid">
        <button
          v-for="stage in stages"
          :key="stage.id"
          type="button"
          class="stage-select-card"
          :class="{
            active: selectedStageId === stage.id,
            locked: !isStageUnlocked(stage.id)
          }"
          :disabled="!isStageUnlocked(stage.id)"
          @click="$emit('select-stage', stage.id)"
        >
          <p class="stage-select-title">{{ stage.label }}</p>
          <p class="stage-select-mode">{{ stage.mode }}</p>
        </button>
      </div>
    </article>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  stages: { type: Array, required: true },
  selectedStageId: { type: String, required: true },
  unlockedStageIds: { type: Array, default: () => [] }
});

const unlockedStageSet = computed(() => new Set(props.unlockedStageIds));

function isStageUnlocked(stageId) {
  return unlockedStageSet.value.has(stageId);
}

defineEmits(['back-home', 'select-stage']);
</script>
