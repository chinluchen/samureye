import { computed, nextTick, reactive, ref } from 'vue';
import {
  TUTORIAL_STORY_FLOW,
  buildTutorialFocusRect,
  getTutorialAnchorId,
  getTutorialForcedTargetId,
  getTutorialNextStep,
  getTutorialStoryStepMeta
} from '../data/story/tutorialStoryConfig.js';

export function useStoryFlow({
  currentScreen,
  isTutorialStage,
  isTutorialUntimed,
  playerTotalHits,
  playerName,
  setPaused,
  grantSkillPoints
}) {
  const storyState = reactive({
    active: false,
    step: TUTORIAL_STORY_FLOW.startStep,
    requiredHits: TUTORIAL_STORY_FLOW.requiredHits,
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
      playerName: playerName?.value
    });
  });

  function setPauseState(paused = false) {
    if (typeof setPaused !== 'function') return;
    setPaused(Boolean(paused));
  }

  function resetStoryState() {
    storyState.active = false;
    storyState.step = TUTORIAL_STORY_FLOW.startStep;
    storyState.requiredHits = TUTORIAL_STORY_FLOW.requiredHits;
    storyState.hitBaseline = 0;
    storyState.hasGrantedMp = false;
    storyState.completed = false;
    storyFocusRect.value = null;
  }

  function beginStoryGuide() {
    storyState.active = true;
    storyState.step = TUTORIAL_STORY_FLOW.startStep;
    storyState.requiredHits = TUTORIAL_STORY_FLOW.requiredHits;
    storyState.hitBaseline = Number(playerTotalHits?.value) || 0;
    storyState.hasGrantedMp = false;
    storyState.completed = false;
    setPauseState(true);
    void updateStoryFocusRectFromTarget();
  }

  function endStoryGuide() {
    storyState.active = false;
    storyState.completed = true;
    storyFocusRect.value = null;
    setPauseState(false);
  }

  function advanceStoryStep() {
    if (!isStoryGuideActive.value) return;

    const currentStep = storyState.step;
    if (currentStep === TUTORIAL_STORY_FLOW.finalStep) {
      endStoryGuide();
      return;
    }

    const nextStep = getTutorialNextStep(currentStep);
    if (!nextStep) return;

    storyState.step = nextStep;

    if (currentStep === 'gesture') {
      storyState.hitBaseline = Number(playerTotalHits?.value) || 0;
      setPauseState(false);
      void updateStoryFocusRectFromTarget();
      return;
    }

    if (currentStep === 'skills' && !storyState.hasGrantedMp) {
      if (typeof grantSkillPoints === 'function') {
        grantSkillPoints(100);
      }
      storyState.hasGrantedMp = true;
    }
  }

  function tryAdvancePracticeStep(count = 0) {
    if (!isStoryGuideActive.value) return false;
    if (storyState.step !== TUTORIAL_STORY_FLOW.practiceStep) return false;
    if (Number(count) < storyState.requiredHits) return false;
    storyState.step = TUTORIAL_STORY_FLOW.practiceCompleteStep;
    return true;
  }

  function shouldSkipRoundIntro() {
    return Boolean(isTutorialStage?.value);
  }

  function shouldDisableRoundTimer() {
    return Boolean(isTutorialUntimed?.value);
  }

  function getForcedTargetId() {
    if (!isTutorialStage?.value) return null;
    if (storyState.completed) return null;
    return getTutorialForcedTargetId(storyState.step, storyHitProgress.value);
  }

  async function updateStoryFocusRectFromTarget() {
    if (!isStoryGuideActive.value) {
      storyFocusRect.value = null;
      return;
    }

    await nextTick();
    const anchorId = getTutorialAnchorId(storyState.step);
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
    advanceStoryStep,
    tryAdvancePracticeStep,
    shouldSkipRoundIntro,
    shouldDisableRoundTimer,
    getForcedTargetId,
    updateStoryFocusRectFromTarget,
    setPauseState
  };
}
