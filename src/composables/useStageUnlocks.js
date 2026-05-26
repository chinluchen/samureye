import { computed } from 'vue';

function readMaybeRef(value) {
  if (typeof value === 'function') return value();
  if (value && typeof value === 'object' && 'value' in value) return value.value;
  return value;
}

function normalizeStageId(value = '') {
  return String(value ?? '').trim();
}

export function useStageUnlocks({
  stageList = [],
  clearedStageIds = []
} = {}) {
  const stageItems = computed(() => {
    const raw = readMaybeRef(stageList);
    return Array.isArray(raw) ? raw : [];
  });

  const clearedStageSet = computed(() => {
    const raw = readMaybeRef(clearedStageIds);
    if (!Array.isArray(raw)) return new Set();
    return new Set(
      raw
        .map(normalizeStageId)
        .filter(Boolean)
    );
  });

  const unlockedStageIds = computed(() => {
    const stages = stageItems.value;
    const unlocked = new Set(
      stages
        .filter(stage => !normalizeStageId(stage?.requiredClearStageId))
        .map(stage => normalizeStageId(stage?.id))
        .filter(Boolean)
    );

    const cleared = clearedStageSet.value;
    let changed = true;
    while (changed) {
      changed = false;
      for (const stage of stages) {
        const stageId = normalizeStageId(stage?.id);
        if (!stageId || unlocked.has(stageId)) continue;
        const requiredStageId = normalizeStageId(stage?.requiredClearStageId);
        if (!requiredStageId) continue;
        if (cleared.has(requiredStageId)) {
          unlocked.add(stageId);
          changed = true;
        }
      }
    }

    return stages
      .map(stage => normalizeStageId(stage?.id))
      .filter(stageId => stageId && unlocked.has(stageId));
  });

  const unlockedStageSet = computed(() => new Set(unlockedStageIds.value));

  return {
    clearedStageSet,
    unlockedStageIds,
    unlockedStageSet
  };
}
