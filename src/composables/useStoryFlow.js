import { computed, nextTick, reactive, ref } from 'vue';
import {
  buildTutorialFocusRect,
  getTutorialAnchorId,
  getTutorialForcedTargetId,
  getTutorialNextStep,
  getTutorialStoryFlow,
  getTutorialStoryStepMeta
} from '../data/story/tutorialStoryConfig.js';

export function useStoryFlow({
  currentScreen,
  isTutorialStage,
  isTutorialUntimed,
  currentStageId,
  playerTotalHits,
  playerName,
  setPaused,
  grantSkillPoints
}) {
  function resolveStoryFlow() {
    return getTutorialStoryFlow(currentStageId?.value);
  }

  function resolveStartTrigger() {
    const flow = resolveStoryFlow();
    const rawTrigger = flow?.startTrigger ?? {};
    const triggerType = String(rawTrigger?.type ?? 'immediate').trim().toLowerCase();
    if (triggerType === 'manual') {
      return {
        type: 'manual',
        requiredHits: 0
      };
    }
    if (triggerType === 'after_hits') {
      return {
        type: 'after_hits',
        requiredHits: Math.max(0, Math.round(Number(rawTrigger?.requiredHits ?? 0)))
      };
    }
    return {
      type: 'immediate',
      requiredHits: 0
    };
  }

  const initialFlow = resolveStoryFlow();
  const storyState = reactive({
    active: false,
    step: initialFlow.startStep,
    requiredHits: initialFlow.requiredHits,
    hitBaseline: 0,
    hasGrantedMp: false,
    completed: false
  });
  const storyFocusRect = ref(null);

  const storyHitProgress = computed(() => {
    return Math.max(0, (Number(playerTotalHits?.value) || 0) - storyState.hitBaseline);
  });

  const isStoryGuideActive = computed(() => {
    return currentScreen?.value === 'battle' && Boolean(isTutorialStage?.value) && storyState.active;
  });

  const currentStoryStepMeta = computed(() => {
    return getTutorialStoryStepMeta(storyState.step, {
      playerName: playerName?.value,
      stageId: currentStageId?.value
    });
  });

  function setPauseState(paused = false) {
    if (typeof setPaused !== 'function') return;
    setPaused(Boolean(paused));
  }

  function resetStoryState() {
    const flow = resolveStoryFlow();
    storyState.active = false;
    storyState.step = flow.startStep;
    storyState.requiredHits = flow.requiredHits;
    storyState.hitBaseline = 0;
    storyState.hasGrantedMp = false;
    storyState.completed = false;
    storyFocusRect.value = null;
  }

  function beginStoryGuide() {
    const flow = resolveStoryFlow();
    storyState.active = true;
    storyState.step = flow.startStep;
    storyState.requiredHits = flow.requiredHits;
    storyState.hitBaseline = Number(playerTotalHits?.value) || 0;
    storyState.hasGrantedMp = false;
    storyState.completed = false;
    setPauseState(true);
    void updateStoryFocusRectFromTarget();
  }

  function shouldAutoStartStoryGuide() {
    if (!isTutorialStage?.value) return false;
    if (storyState.active || storyState.completed) return false;
    const trigger = resolveStartTrigger();
    if (trigger.type === 'manual') return false;
    if (trigger.type === 'after_hits') {
      return (Number(playerTotalHits?.value) || 0) >= trigger.requiredHits;
    }
    return true;
  }

  function endStoryGuide() {
    storyState.active = false;
    storyState.completed = true;
    storyFocusRect.value = null;
    setPauseState(false);
  }

  function advanceStoryStep() {
    if (!isStoryGuideActive.value) return;

    const flow = resolveStoryFlow();
    const currentStep = storyState.step;
    if (currentStep === flow.finalStep) {
      endStoryGuide();
      return;
    }

    const nextStep = getTutorialNextStep(currentStep, {
      stageId: currentStageId?.value
    });
    if (!nextStep) return;

    storyState.step = nextStep;

    if (currentStep === 'gesture') {
      storyState.hitBaseline = Number(playerTotalHits?.value) || 0;
      setPauseState(false);
      void updateStoryFocusRectFromTarget();
      return;
    }

    if (currentStep === flow.grantMpAfterStep && !storyState.hasGrantedMp) {
      if (typeof grantSkillPoints === 'function') {
        grantSkillPoints(100);
      }
      storyState.hasGrantedMp = true;
    }
  }

  function tryAdvancePracticeStep(count = 0) {
    if (!isStoryGuideActive.value) return false;
    const flow = resolveStoryFlow();
    if (storyState.step !== flow.practiceStep) return false;
    if (Number(count) < storyState.requiredHits) return false;
    storyState.step = flow.practiceCompleteStep;
    return true;
  }

  function shouldSkipRoundIntro() {
    if (!isTutorialStage?.value) return false;
    const flow = resolveStoryFlow();
    if (typeof flow?.skipRoundIntro === 'boolean') {
      return flow.skipRoundIntro;
    }
    return true;
  }

  function shouldDisableRoundTimer() {
    return Boolean(isTutorialUntimed?.value);
  }

  function getForcedTargetId() {
    if (!isTutorialStage?.value) return null;
    if (storyState.completed) return null;
    return getTutorialForcedTargetId(storyState.step, storyHitProgress.value, {
      stageId: currentStageId?.value
    });
  }

  async function updateStoryFocusRectFromTarget() {
    if (!isStoryGuideActive.value) {
      storyFocusRect.value = null;
      return;
    }

    await nextTick();
    const anchorId = getTutorialAnchorId(storyState.step, {
      stageId: currentStageId?.value
    });
    if (!anchorId) {
      storyFocusRect.value = null;
      return;
    }

    const anchorEl = document.getElementById(anchorId);
    if (!anchorEl) {
      storyFocusRect.value = null;
      return;
    }

    storyFocusRect.value = buildTutorialFocusRect(
      storyState.step,
      anchorEl.getBoundingClientRect(),
      {
        width: window.innerWidth,
        height: window.innerHeight
      },
      {
        stageId: currentStageId?.value
      }
    );
  }

  return {
    storyState,
    storyFocusRect,
    storyHitProgress,
    isStoryGuideActive,
    currentStoryStepMeta,
    resetStoryState,
    beginStoryGuide,
    shouldAutoStartStoryGuide,
    advanceStoryStep,
    tryAdvancePracticeStep,
    shouldSkipRoundIntro,
    shouldDisableRoundTimer,
    getForcedTargetId,
    updateStoryFocusRectFromTarget,
    setPauseState
  };
}
