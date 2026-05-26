const DEFAULT_PLAYER_NAME = 'SAMUREYE';
const PLAYER_NAME_TITLE_TOKEN = '{{playerName}}';
const DEFAULT_TUTORIAL_STAGE_ID = 'stage_01';

function freezeStepMetaMap(raw = {}) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, Object.freeze(value)])
    )
  );
}

const STAGE_01_FLOW = Object.freeze({
  stageId: 'stage_01',
  startTrigger: Object.freeze({ type: 'immediate' }),
  skipRoundIntro: true,
  startStep: 'intro1',
  finalStep: 'ready',
  practiceStep: 'practice',
  practiceCompleteStep: 'hpEnemy',
  requiredHits: 3,
  practiceDirections: Object.freeze(['right', 'down', 'up-left']),
  grantMpAfterStep: null,
  nextStepByStep: Object.freeze({
    intro1: 'intro2',
    intro2: 'focus',
    focus: 'gesture',
    gesture: 'practice',
    hpEnemy: 'hpPlayer',
    hpPlayer: 'ready'
  }),
  stepMetaByStep: freezeStepMetaMap({
    intro1: {
      title: PLAYER_NAME_TITLE_TOKEN,
      description: '清醒了嗎？視變體大舉入侵，拿起武器準備戰鬥吧！',
      buttonText: '下一句',
      showNextButton: true,
      cardPosition: 'bottom',
      showFocusRect: false,
      showGestureDemo: false,
      showProgress: false
    },
    intro2: {
      title: '別緊張',
      description: '我先利用視覺晶片模擬了一隻視變體，就在前面！',
      buttonText: '下一句',
      showNextButton: true,
      cardPosition: 'bottom',
      showFocusRect: false,
      showGestureDemo: false,
      showProgress: false
    },
    focus: {
      title: '鎖定視標',
      description: '有看到前方的C視標嗎？視變體會利用視標攻擊我們！',
      buttonText: '下一步',
      showNextButton: true,
      cardPosition: 'bottom',
      showFocusRect: true,
      showGestureDemo: false,
      showProgress: false
    },
    gesture: {
      title: '斬斷視標',
      description: '順著視標開口滑動，只要成功破壞視標，視變體就會受到傷害！',
      buttonText: '我懂了',
      showNextButton: true,
      cardPosition: 'bottom',
      showFocusRect: true,
      showGestureDemo: true,
      showProgress: false
    },
    practice: {
      title: '試著攻擊看看吧！',
      description: '依序完成 3 次操作：向右、向下、向左上滑動。',
      buttonText: '',
      showNextButton: false,
      cardPosition: 'bottom',
      showFocusRect: true,
      showGestureDemo: false,
      showProgress: true
    },
    hpEnemy: {
      title: '敵方血條資訊',
      description: '上方紅色血條是敵人的生命值，血量歸零就代表被我們打敗了！',
      buttonText: '下一步',
      showNextButton: true,
      cardPosition: 'bottom',
      showFocusRect: true,
      showGestureDemo: false,
      showProgress: false
    },
    hpPlayer: {
      title: '我方血條資訊',
      description: '下方藍色血條是你的生命值，血量歸零就是我們被打敗了！',
      buttonText: '下一步',
      showNextButton: true,
      cardPosition: 'top',
      showFocusRect: true,
      showGestureDemo: false,
      showProgress: false
    },
    ready: {
      title: '準備完成',
      description: '很好，你已經掌握基礎戰鬥操作。試著多揮幾次，摧毀機器視變體吧！',
      buttonText: '開始對戰',
      showNextButton: true,
      cardPosition: 'top',
      showFocusRect: false,
      showGestureDemo: false,
      showProgress: false
    }
  }),
  anchorIdByStep: Object.freeze({
    intro1: null,
    intro2: null,
    focus: 'target-anchor',
    gesture: 'target-anchor',
    practice: 'target-anchor',
    hpEnemy: 'enemy-hp-anchor',
    hpPlayer: 'player-hp-anchor',
    ready: null
  }),
  focusRectRuleByStep: Object.freeze({
    focus: Object.freeze({ type: 'target', minSidePx: 160, extraSidePx: 88 }),
    gesture: Object.freeze({ type: 'target', minSidePx: 160, extraSidePx: 88 }),
    practice: Object.freeze({ type: 'target', minSidePx: 160, extraSidePx: 88 }),
    hpEnemy: Object.freeze({ type: 'padding', padX: 10, padY: 8 }),
    hpPlayer: Object.freeze({ type: 'padding', padX: 10, padY: 8 })
  }),
  forcedTargetDisabledSteps: Object.freeze(['hpEnemy', 'hpPlayer', 'ready'])
});

const STAGE_02_TUTORIAL_FLOW = Object.freeze({
  stageId: 'stage_02_tutorial',
  startTrigger: Object.freeze({ type: 'manual' }),
  skipRoundIntro: false,
  startStep: 'counter',
  finalStep: 'cast',
  practiceStep: 'none',
  practiceCompleteStep: 'none',
  requiredHits: 0,
  practiceDirections: Object.freeze([]),
  grantMpAfterStep: 'skills',
  nextStepByStep: Object.freeze({
    counter: 'skills',
    skills: 'cast'
  }),
  stepMetaByStep: freezeStepMetaMap({
    counter: {
      title: PLAYER_NAME_TITLE_TOKEN,
      description: '注意，敵人進入反擊模式，你現在要用絕招收尾。',
      buttonText: '了解',
      showNextButton: true,
      cardPosition: 'bottom',
      showFocusRect: false,
      showGestureDemo: false,
      showProgress: false
    },
    skills: {
      title: '準備施放技能',
      description: '下一步會補滿 MP，請直接點擊技能按鈕施放。',
      buttonText: '準備完成',
      showNextButton: true,
      cardPosition: 'top',
      showFocusRect: true,
      showGestureDemo: false,
      showProgress: false
    },
    cast: {
      title: '現在施放技能',
      description: '請點擊技能按鈕，直接終結敵人。',
      buttonText: '',
      showNextButton: false,
      cardPosition: 'top',
      showFocusRect: true,
      showGestureDemo: false,
      showProgress: false
    }
  }),
  anchorIdByStep: Object.freeze({
    counter: null,
    skills: 'skill-bar-anchor',
    cast: 'skill-bar-anchor'
  }),
  focusRectRuleByStep: Object.freeze({
    skills: Object.freeze({ type: 'padding', padX: 8, padY: 8 }),
    cast: Object.freeze({ type: 'padding', padX: 8, padY: 8 })
  }),
  forcedTargetDisabledSteps: Object.freeze(['counter', 'skills', 'cast'])
});

const TUTORIAL_FLOW_BY_STAGE_ID = Object.freeze({
  [STAGE_01_FLOW.stageId]: STAGE_01_FLOW,
  [STAGE_02_TUTORIAL_FLOW.stageId]: STAGE_02_TUTORIAL_FLOW
});

function sanitizePlayerName(name = '') {
  const text = String(name ?? '').trim();
  return text || DEFAULT_PLAYER_NAME;
}

function normalizeStageId(stageId = '') {
  const normalized = String(stageId ?? '').trim();
  if (normalized && TUTORIAL_FLOW_BY_STAGE_ID[normalized]) return normalized;
  return DEFAULT_TUTORIAL_STAGE_ID;
}

function resolveTutorialFlow(stageId = '') {
  const normalizedStageId = normalizeStageId(stageId);
  return TUTORIAL_FLOW_BY_STAGE_ID[normalizedStageId] ?? STAGE_01_FLOW;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resolveTitle(baseTitle = '', playerName = DEFAULT_PLAYER_NAME) {
  if (baseTitle !== PLAYER_NAME_TITLE_TOKEN) return baseTitle;
  return sanitizePlayerName(playerName);
}

export const TUTORIAL_STORY_FLOW = STAGE_01_FLOW;

export function getTutorialStoryFlow(stageId = '') {
  return resolveTutorialFlow(stageId);
}

export function getTutorialStoryStepMeta(step = '', { playerName = DEFAULT_PLAYER_NAME, stageId = '' } = {}) {
  const flow = resolveTutorialFlow(stageId);
  const normalizedStep = String(step ?? '').trim();
  const stepMetaMap = flow.stepMetaByStep ?? {};
  const fallbackStep = flow.finalStep;
  const base = stepMetaMap[normalizedStep] ?? stepMetaMap[fallbackStep];
  return {
    step: normalizedStep || flow.startStep,
    title: resolveTitle(base?.title, playerName),
    description: String(base?.description ?? '').trim(),
    buttonText: String(base?.buttonText ?? '').trim(),
    showNextButton: Boolean(base?.showNextButton),
    cardPosition: String(base?.cardPosition ?? 'bottom').trim() || 'bottom',
    showFocusRect: Boolean(base?.showFocusRect),
    showGestureDemo: Boolean(base?.showGestureDemo),
    showProgress: Boolean(base?.showProgress)
  };
}

export function getTutorialNextStep(step = '', { stageId = '' } = {}) {
  const flow = resolveTutorialFlow(stageId);
  const normalizedStep = String(step ?? '').trim();
  return flow.nextStepByStep[normalizedStep] ?? null;
}

export function getTutorialAnchorId(step = '', { stageId = '' } = {}) {
  const flow = resolveTutorialFlow(stageId);
  const normalizedStep = String(step ?? '').trim();
  return flow.anchorIdByStep[normalizedStep] ?? null;
}

export function getTutorialForcedTargetId(step = '', practiceProgress = 0, { stageId = '' } = {}) {
  const flow = resolveTutorialFlow(stageId);
  const normalizedStep = String(step ?? '').trim();
  if (flow.forcedTargetDisabledSteps.includes(normalizedStep)) return null;
  const directions = Array.isArray(flow.practiceDirections) ? flow.practiceDirections : [];
  if (directions.length <= 0) return null;
  const maxIndex = directions.length - 1;
  const safeIndex = clamp(Math.floor(Number(practiceProgress) || 0), 0, maxIndex);
  return directions[safeIndex] ?? null;
}

export function buildTutorialFocusRect(step = '', anchorRect = null, viewport = {}, { stageId = '' } = {}) {
  if (!anchorRect || typeof anchorRect !== 'object') return null;

  const flow = resolveTutorialFlow(stageId);
  const focusRectRuleByStep = flow.focusRectRuleByStep ?? {};
  const rule = focusRectRuleByStep[String(step ?? '').trim()];
  if (!rule) return null;

  const viewportWidth = Math.max(1, Number(viewport.width) || window.innerWidth || 1);
  const viewportHeight = Math.max(1, Number(viewport.height) || window.innerHeight || 1);

  let leftPx = Number(anchorRect.left) || 0;
  let topPx = Number(anchorRect.top) || 0;
  let widthPx = Math.max(1, Number(anchorRect.width) || 1);
  let heightPx = Math.max(1, Number(anchorRect.height) || 1);

  if (rule.type === 'target') {
    const centerX = leftPx + (widthPx / 2);
    const centerY = topPx + (heightPx / 2);
    const measuredSide = Math.max(widthPx, heightPx, rule.minSidePx);
    const sidePx = measuredSide + rule.extraSidePx;
    leftPx = centerX - (sidePx / 2);
    topPx = centerY - (sidePx / 2);
    widthPx = sidePx;
    heightPx = sidePx;
  } else if (rule.type === 'padding') {
    leftPx -= rule.padX;
    topPx -= rule.padY;
    widthPx += (rule.padX * 2);
    heightPx += (rule.padY * 2);
  }

  return {
    left: clamp((leftPx / viewportWidth) * 100, 1, 99),
    top: clamp((topPx / viewportHeight) * 100, 1, 99),
    width: clamp((widthPx / viewportWidth) * 100, 6, 98),
    height: clamp((heightPx / viewportHeight) * 100, 6, 98)
  };
}
