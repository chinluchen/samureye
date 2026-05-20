const DEFAULT_PLAYER_NAME = 'SAMUREYE';
const PLAYER_NAME_TITLE_TOKEN = '{{playerName}}';

export const TUTORIAL_STORY_FLOW = Object.freeze({
  startStep: 'intro1',
  finalStep: 'mp',
  practiceStep: 'practice',
  practiceCompleteStep: 'hpEnemy',
  requiredHits: 3,
  practiceDirections: Object.freeze(['right', 'down', 'up-left']),
  nextStepByStep: Object.freeze({
    intro1: 'intro2',
    intro2: 'focus',
    focus: 'gesture',
    gesture: 'practice',
    hpEnemy: 'hpPlayer',
    hpPlayer: 'skills',
    skills: 'mp'
  })
});

const STEP_META_MAP = Object.freeze({
  intro1: Object.freeze({
    title: PLAYER_NAME_TITLE_TOKEN,
    description: '先用兩句話帶你快速認識戰鬥，再開始實際操作。',
    buttonText: '下一句',
    showNextButton: true,
    cardPosition: 'bottom',
    showFocusRect: false,
    showGestureDemo: false,
    showProgress: false
  }),
  intro2: Object.freeze({
    title: '這場是教學關卡',
    description: '跟著提示走完流程後，就會進入正式關卡挑戰。',
    buttonText: '開始教學',
    showNextButton: true,
    cardPosition: 'bottom',
    showFocusRect: false,
    showGestureDemo: false,
    showProgress: false
  }),
  focus: Object.freeze({
    title: '鎖定中央視標',
    description: '這是你本回合的主要攻擊目標，先專注在中央 C 字視標。',
    buttonText: '下一步',
    showNextButton: true,
    cardPosition: 'bottom',
    showFocusRect: true,
    showGestureDemo: false,
    showProgress: false
  }),
  gesture: Object.freeze({
    title: '手勢操作示範',
    description: '教學固定為向右開口，請像示範一樣往右快速滑動。',
    buttonText: '我懂了',
    showNextButton: true,
    cardPosition: 'bottom',
    showFocusRect: true,
    showGestureDemo: true,
    showProgress: false
  }),
  practice: Object.freeze({
    title: '開始實作',
    description: '依序完成 3 次操作：向右、向下、向左上滑動。',
    buttonText: '',
    showNextButton: false,
    cardPosition: 'bottom',
    showFocusRect: true,
    showGestureDemo: false,
    showProgress: true
  }),
  hpEnemy: Object.freeze({
    title: '敵方血條資訊',
    description: '上方紅色血條是敵人的生命值，先把敵方血量壓低。',
    buttonText: '下一步',
    showNextButton: true,
    cardPosition: 'bottom',
    showFocusRect: true,
    showGestureDemo: false,
    showProgress: false
  }),
  hpPlayer: Object.freeze({
    title: '我方血條資訊',
    description: '下方藍色血條是你的生命值，戰鬥時要避免被打空。',
    buttonText: '下一步',
    showNextButton: true,
    cardPosition: 'top',
    showFocusRect: true,
    showGestureDemo: false,
    showProgress: false
  }),
  skills: Object.freeze({
    title: '絕招欄位',
    description: '右下角是你的絕招欄位，MP 足夠時技能按鈕會亮起可施放。',
    buttonText: '下一步',
    showNextButton: true,
    cardPosition: 'top',
    showFocusRect: true,
    showGestureDemo: false,
    showProgress: false
  }),
  mp: Object.freeze({
    title: 'MP 用途',
    description: 'MP 是施放絕招的資源。教學先一次補滿 100%，可以立即試招。',
    buttonText: '開始對戰',
    showNextButton: true,
    cardPosition: 'top',
    showFocusRect: true,
    showGestureDemo: false,
    showProgress: false
  })
});

const ANCHOR_ID_BY_STEP = Object.freeze({
  intro1: null,
  intro2: null,
  focus: 'target-anchor',
  gesture: 'target-anchor',
  practice: 'target-anchor',
  hpEnemy: 'enemy-hp-anchor',
  hpPlayer: 'player-hp-anchor',
  skills: 'skill-bar-anchor',
  mp: 'player-mp-anchor'
});

const FOCUS_RECT_RULE_BY_STEP = Object.freeze({
  focus: Object.freeze({ type: 'target', minSidePx: 160, extraSidePx: 88 }),
  gesture: Object.freeze({ type: 'target', minSidePx: 160, extraSidePx: 88 }),
  practice: Object.freeze({ type: 'target', minSidePx: 160, extraSidePx: 88 }),
  hpEnemy: Object.freeze({ type: 'padding', padX: 10, padY: 8 }),
  hpPlayer: Object.freeze({ type: 'padding', padX: 10, padY: 8 }),
  skills: Object.freeze({ type: 'padding', padX: 8, padY: 8 }),
  mp: Object.freeze({ type: 'padding', padX: 8, padY: 6 })
});

function sanitizePlayerName(name = '') {
  const text = String(name ?? '').trim();
  return text || DEFAULT_PLAYER_NAME;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resolveTitle(baseTitle = '', playerName = DEFAULT_PLAYER_NAME) {
  if (baseTitle !== PLAYER_NAME_TITLE_TOKEN) return baseTitle;
  return sanitizePlayerName(playerName);
}

export function getTutorialStoryStepMeta(step = '', { playerName = DEFAULT_PLAYER_NAME } = {}) {
  const normalizedStep = String(step ?? '').trim();
  const base = STEP_META_MAP[normalizedStep] ?? STEP_META_MAP[TUTORIAL_STORY_FLOW.finalStep];
  return {
    step: normalizedStep || TUTORIAL_STORY_FLOW.startStep,
    title: resolveTitle(base.title, playerName),
    description: base.description,
    buttonText: base.buttonText,
    showNextButton: base.showNextButton,
    cardPosition: base.cardPosition,
    showFocusRect: base.showFocusRect,
    showGestureDemo: base.showGestureDemo,
    showProgress: base.showProgress
  };
}

export function getTutorialNextStep(step = '') {
  const normalizedStep = String(step ?? '').trim();
  return TUTORIAL_STORY_FLOW.nextStepByStep[normalizedStep] ?? null;
}

export function getTutorialAnchorId(step = '') {
  const normalizedStep = String(step ?? '').trim();
  return ANCHOR_ID_BY_STEP[normalizedStep] ?? null;
}

export function getTutorialForcedTargetId(step = '', practiceProgress = 0) {
  const normalizedStep = String(step ?? '').trim();
  if (['hpEnemy', 'hpPlayer', 'skills', 'mp'].includes(normalizedStep)) return null;
  const maxIndex = TUTORIAL_STORY_FLOW.practiceDirections.length - 1;
  const safeIndex = clamp(Math.floor(Number(practiceProgress) || 0), 0, maxIndex);
  return TUTORIAL_STORY_FLOW.practiceDirections[safeIndex] ?? null;
}

export function buildTutorialFocusRect(step = '', anchorRect = null, viewport = {}) {
  if (!anchorRect || typeof anchorRect !== 'object') return null;

  const rule = FOCUS_RECT_RULE_BY_STEP[String(step ?? '').trim()];
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
