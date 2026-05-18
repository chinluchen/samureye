<template>
  <section class="study-screen">
    <header class="study-header">
      <button type="button" class="study-back-btn pixel-border" @click="onBackPress">
        {{ isTrainingActive ? '模式選單' : '返回' }}
      </button>
      <h2 class="study-title">知識道場</h2>
      <div aria-hidden="true"></div>
    </header>

    <article class="study-card pixel-border dojo-info-card">
      <div class="dojo-info-row">
        <p class="dojo-info-label">目前知識點數</p>
        <p class="dojo-info-value">KP {{ state.knowledgePoints }}</p>
      </div>
      <div class="dojo-info-row">
        <p class="dojo-info-label">今日知識點數</p>
        <p class="dojo-info-value">{{ todayEarnedPoints }} / {{ DOJO_DAILY_CAP_POINTS }}</p>
      </div>
      <p class="dojo-info-status" :class="{ 'is-capped': isDailyCapped }">
        {{ dailyStatusText }}
      </p>
    </article>

    <div v-if="!isTrainingActive" class="dojo-mode-panel">
      <div class="dojo-menu-buttons">
        <button type="button" class="study-next-btn dojo-start-btn" @click="startTraining">
          開始訓練
        </button>

        <button
          v-for="mode in dojoModes"
          :key="mode.key"
          type="button"
          class="home-menu-button home-menu-button-active dojo-mode-button"
          :class="{
            'dojo-mode-button-selected': mode.key === selectedModeKey,
            'dojo-mode-button-locked': mode.locked
          }"
          @click="selectMode(mode.key)"
        >
          <span v-if="mode.locked" class="dojo-mode-lock">🔒</span>
          {{ mode.label }}
        </button>
      </div>

      <p class="dojo-mode-hint">{{ modeHintText }}</p>
    </div>

    <div v-else class="study-layout">
      <article class="study-card pixel-border dojo-quiz-card">
        <div class="study-card-top">
          <p class="study-tag">{{ activeMode.label }}</p>
          <p class="study-progress">{{ questionProgressText }}</p>
        </div>

        <template v-if="roundFinished">
          <h3 class="study-question">本輪結算</h3>

          <div class="dojo-summary-grid">
            <p class="dojo-summary-label">本次答對題數</p>
            <p class="dojo-summary-value">{{ roundCorrectCount }} / {{ DOJO_ROUND_QUESTION_COUNT }}</p>

            <p class="dojo-summary-label">是否達成條件</p>
            <p class="dojo-summary-value">{{ roundPassed ? '達成' : '未達成' }}</p>
          </div>

          <p v-if="settlementErrorMessage" class="study-feedback wrong">{{ settlementErrorMessage }}</p>

          <section class="dojo-review-list">
            <article
              v-for="(entry, idx) in roundAnswers"
              :key="`${entry.questionId}-${idx}`"
              class="dojo-review-item"
            >
              <p class="dojo-review-title">第 {{ idx + 1 }} 題</p>
              <p class="dojo-review-question">{{ entry.question }}</p>
              <p class="dojo-review-line">你的答案：{{ optionLabel(entry.selectedIndex) }} {{ entry.selectedText }}</p>
              <p v-if="entry.isCorrect" class="dojo-review-line correct">答對了</p>
              <template v-else>
                <p class="dojo-review-line wrong">你的答案：{{ optionLabel(entry.selectedIndex) }}</p>
                <p class="dojo-review-line correct">正確答案：{{ optionLabel(entry.correctIndex) }} {{ entry.correctText }}</p>
              </template>
              <p class="dojo-review-explanation">解析：{{ entry.explanation }}</p>
            </article>
          </section>

          <button
            type="button"
            class="study-next-btn"
            :disabled="settlementInFlight"
            @click="startTrainingWithMode(activeMode.key)"
          >
            再來一輪
          </button>
        </template>

        <template v-else>
          <p v-if="currentQuestion.subtopic" class="dojo-question-subtopic">{{ currentQuestion.subtopic }}</p>
          <h3 class="study-question">{{ currentQuestion.question }}</h3>

          <div class="study-options">
            <button
              v-for="(option, idx) in currentQuestion.options"
              :key="`${currentQuestion.id}-option-${idx}`"
              type="button"
              class="study-option-btn"
              :class="optionClass(idx)"
              @click="answerQuestion(idx)"
            >
              {{ option }}
            </button>
          </div>

          <p class="study-feedback" :class="{ wrong: isSelectionWarningVisible }">
            {{ questionHintText }}
          </p>

          <button type="button" class="study-next-btn" @click="nextQuestion">
            {{ isLastQuestion ? '完成訓練' : '下一題' }}
          </button>
        </template>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import {
  DOJO_DAILY_CAP_POINTS,
  DOJO_ROUND_QUESTION_COUNT,
  dojoModes,
  dojoQuestionBanks
} from '../data/dojoQuestionBanks.js';

const props = defineProps({
  state: {
    type: Object,
    required: true
  },
  unlockedTrackKeys: {
    type: Array,
    default: () => []
  },
  onSettleReward: {
    type: Function,
    default: null
  }
});

const emit = defineEmits(['back-home', 'record-answer']);

const selectedModeKey = ref('');
const trainingModeKey = ref('');
const questionIndex = ref(0);
const roundQuestions = ref([]);
const selectedAnswerIndex = ref(null);
const roundAnswers = ref([]);
const roundFinished = ref(false);
const roundPassed = ref(false);
const roundThreshold = ref(0);
const roundCalculatedReward = ref(0);
const roundActualReward = ref(0);
const roundDailyEarnedPoints = ref(0);
const roundDailyLimit = ref(DOJO_DAILY_CAP_POINTS);
const roundTotalKnowledgePoints = ref(0);
const settlementInFlight = ref(false);
const settlementErrorMessage = ref('');
const modeHintText = ref('先選擇模式，再點擊「開始訓練」。');
const questionHint = ref('請先選擇一個答案，再按下一題送出。');
const isSelectionWarningVisible = ref(false);

const modeMap = computed(() => new Map(dojoModes.map((mode) => [mode.key, mode])));
const isTrainingActive = computed(() => Boolean(trainingModeKey.value));
const activeMode = computed(() => {
  return modeMap.value.get(trainingModeKey.value) ?? dojoModes[0];
});
const currentQuestion = computed(() => {
  return roundQuestions.value[questionIndex.value] ?? {
    id: 'empty',
    subtopic: '',
    question: '此模式題庫建置中。',
    options: ['返回模式選單'],
    answerIndex: 0,
    explanation: '請先選擇其他模式。'
  };
});
const questionProgressText = computed(() => {
  if (roundFinished.value) return '本輪完成';
  const total = roundQuestions.value.length || DOJO_ROUND_QUESTION_COUNT;
  return `第 ${Math.min(questionIndex.value + 1, total)} / ${total} 題`;
});
const isLastQuestion = computed(() => {
  return questionIndex.value >= roundQuestions.value.length - 1;
});
const roundCorrectCount = computed(() => {
  return roundAnswers.value.filter((entry) => entry.isCorrect).length;
});

const todayKey = computed(() => getTodayKey());
const todayEarnedPoints = computed(() => {
  const daily = props.state.dailyKnowledge ?? {};
  if (String(daily.dateKey || '') !== todayKey.value) return 0;
  const points = Number(daily.points ?? 0);
  if (!Number.isFinite(points)) return 0;
  return Math.max(0, Math.floor(points));
});
const remainingDailyPoints = computed(() => {
  return Math.max(0, DOJO_DAILY_CAP_POINTS - todayEarnedPoints.value);
});
const isDailyCapped = computed(() => remainingDailyPoints.value <= 0);
const dailyStatusText = computed(() => {
  if (isDailyCapped.value) {
    return '今天腦袋已經燒到上限。繼續刷題可以練習，但不再產生知識點數。';
  }
  return `今日仍可取得 ${remainingDailyPoints.value} 點知識點數。每輪固定 5 題，達標即可拿點。`;
});

const questionHintText = computed(() => {
  if (isSelectionWarningVisible.value) return questionHint.value;
  if (selectedAnswerIndex.value === null) return '請先選擇一個答案，再按下一題送出。';
  return '已選擇答案，可按下一題送出（仍可改選）。';
});

function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function selectMode(modeKey) {
  const mode = modeMap.value.get(modeKey);
  if (!mode) return;

  if (mode.locked) {
    modeHintText.value = mode.lockedMessage || '此模式尚未開放。';
    return;
  }

  selectedModeKey.value = mode.key;
  modeHintText.value = `已選擇「${mode.label}」，點擊「開始訓練」即可進入。`;
}

function onBackPress() {
  if (isTrainingActive.value) {
    resetRoundState();
    trainingModeKey.value = '';
    modeHintText.value = '已返回模式選單。';
    return;
  }

  emit('back-home');
}

function startTraining() {
  if (!selectedModeKey.value) {
    modeHintText.value = '請先選擇訓練模式，再開始訓練。';
    return;
  }

  startTrainingWithMode(selectedModeKey.value);
}

function startTrainingWithMode(modeKey) {
  const mode = modeMap.value.get(modeKey);
  if (!mode || mode.locked) {
    modeHintText.value = mode?.lockedMessage || '此模式尚未開放。';
    return;
  }

  const sourceBank = dojoQuestionBanks[mode.questionBankKey] ?? [];
  const questions = buildRoundQuestions(sourceBank, DOJO_ROUND_QUESTION_COUNT);

  trainingModeKey.value = mode.key;
  questionIndex.value = 0;
  roundQuestions.value = questions;
  selectedAnswerIndex.value = null;
  roundAnswers.value = [];
  roundFinished.value = false;
  roundPassed.value = false;
  roundThreshold.value = Number(mode.passThreshold ?? DOJO_ROUND_QUESTION_COUNT);
  roundCalculatedReward.value = 0;
  roundActualReward.value = 0;
  roundDailyEarnedPoints.value = todayEarnedPoints.value;
  roundDailyLimit.value = DOJO_DAILY_CAP_POINTS;
  roundTotalKnowledgePoints.value = Math.max(0, Math.floor(Number(props.state.knowledgePoints ?? 0)));
  settlementInFlight.value = false;
  settlementErrorMessage.value = '';
  questionHint.value = '請先選擇一個答案，再按下一題送出。';
  isSelectionWarningVisible.value = false;

  if (questions.length === 0) {
    roundFinished.value = true;
  }
}

function buildRoundQuestions(questionBank, count) {
  if (!Array.isArray(questionBank) || questionBank.length === 0) return [];

  const shuffled = [...questionBank];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function answerQuestion(index) {
  if (roundFinished.value || !isTrainingActive.value) return;

  selectedAnswerIndex.value = index;
  questionHint.value = '已選擇答案，可按下一題送出（仍可改選）。';
  isSelectionWarningVisible.value = false;
}

function nextQuestion() {
  if (roundFinished.value) return;

  if (selectedAnswerIndex.value === null) {
    questionHint.value = '請先選擇一個答案。';
    isSelectionWarningVisible.value = true;
    return;
  }

  submitCurrentAnswer();

  if (!isLastQuestion.value) {
    questionIndex.value += 1;
    selectedAnswerIndex.value = null;
    questionHint.value = '請先選擇一個答案，再按下一題送出。';
    isSelectionWarningVisible.value = false;
    return;
  }

  void finalizeRound();
}

function submitCurrentAnswer() {
  const question = currentQuestion.value;
  const selectedIndex = Number(selectedAnswerIndex.value);
  const correctIndex = Number(question.answerIndex ?? 0);
  const selectedText = question.options?.[selectedIndex] ?? '';
  const correctText = question.options?.[correctIndex] ?? '';
  const isCorrect = selectedIndex === correctIndex;

  roundAnswers.value.push({
    questionId: question.id,
    question: question.question,
    selectedIndex,
    selectedText,
    correctIndex,
    correctText,
    isCorrect,
    explanation: question.explanation || ''
  });

  emit('record-answer', { correct: isCorrect });
}

async function finalizeRound() {
  const mode = activeMode.value;
  const rewardPoints = Number(mode.rewardPoints ?? 0);

  roundPassed.value = roundCorrectCount.value >= roundThreshold.value;
  roundFinished.value = true;
  roundCalculatedReward.value = roundPassed.value ? Math.max(0, Math.floor(rewardPoints)) : 0;
  roundActualReward.value = 0;
  roundDailyEarnedPoints.value = todayEarnedPoints.value;
  roundDailyLimit.value = DOJO_DAILY_CAP_POINTS;
  roundTotalKnowledgePoints.value = Math.max(0, Math.floor(Number(props.state.knowledgePoints ?? 0)));
  settlementErrorMessage.value = '';
  settlementInFlight.value = false;

  if (!roundPassed.value) {
    return;
  }

  console.info('[KnowledgeDojo] finish session');
  console.info(`mode=${mode.key}`);
  console.info(`correctCount=${roundCorrectCount.value}`);
  console.info(`totalQuestions=${roundQuestions.value.length}`);
  console.info(`calculatedReward=${roundCalculatedReward.value}`);

  settlementInFlight.value = true;
  try {
    const settleResult = await settleRoundReward({
      modeKey: mode.key,
      calculatedReward: roundCalculatedReward.value,
      correctCount: roundCorrectCount.value,
      questionCount: roundQuestions.value.length
    });
    roundActualReward.value = settleResult.actualReward;
    roundDailyEarnedPoints.value = settleResult.dailyKnowledgePointsEarned;
    roundDailyLimit.value = settleResult.dailyKnowledgePointLimit;
    roundTotalKnowledgePoints.value = settleResult.knowledgePoints;
  } catch (error) {
    const message = error instanceof Error ? error.message : '獎勵結算失敗，請稍後再試。';
    settlementErrorMessage.value = String(message || '獎勵結算失敗，請稍後再試。');
  } finally {
    settlementInFlight.value = false;
  }
}

async function settleRoundReward(payload = {}) {
  const calculatedReward = Math.max(0, Math.floor(Number(payload.calculatedReward ?? 0)));
  if (typeof props.onSettleReward !== 'function') {
    throw new Error('獎勵結算服務尚未就緒，請稍後再試。');
  }

  const result = await props.onSettleReward({
    modeKey: String(payload.modeKey ?? ''),
    calculatedReward,
    correctCount: Math.max(0, Math.floor(Number(payload.correctCount ?? 0))),
    questionCount: Math.max(0, Math.floor(Number(payload.questionCount ?? 0)))
  });

  const actualReward = Math.max(0, Math.floor(Number(result?.actualReward ?? 0)));
  const dailyKnowledgePointsEarned = Math.max(
    0,
    Math.floor(Number(result?.dailyKnowledgePointsEarned ?? todayEarnedPoints.value))
  );
  const dailyKnowledgePointLimit = Math.max(
    1,
    Math.floor(Number(result?.dailyKnowledgePointLimit ?? DOJO_DAILY_CAP_POINTS))
  );
  const knowledgePoints = Math.max(
    0,
    Math.floor(Number(result?.knowledgePoints ?? props.state.knowledgePoints ?? 0))
  );

  return {
    actualReward,
    dailyKnowledgePointsEarned,
    dailyKnowledgePointLimit,
    knowledgePoints
  };
}

function resetRoundState() {
  questionIndex.value = 0;
  roundQuestions.value = [];
  selectedAnswerIndex.value = null;
  roundAnswers.value = [];
  roundFinished.value = false;
  roundPassed.value = false;
  roundThreshold.value = 0;
  roundCalculatedReward.value = 0;
  roundActualReward.value = 0;
  roundDailyEarnedPoints.value = todayEarnedPoints.value;
  roundDailyLimit.value = DOJO_DAILY_CAP_POINTS;
  roundTotalKnowledgePoints.value = Math.max(0, Math.floor(Number(props.state.knowledgePoints ?? 0)));
  settlementInFlight.value = false;
  settlementErrorMessage.value = '';
  questionHint.value = '請先選擇一個答案，再按下一題送出。';
  isSelectionWarningVisible.value = false;
}

function optionClass(index) {
  if (selectedAnswerIndex.value === index) return 'selected';
  return '';
}

function optionLabel(index) {
  const labels = ['A', 'B', 'C', 'D'];
  const safeIndex = Number(index);
  if (!Number.isInteger(safeIndex) || safeIndex < 0) return '-';
  return labels[safeIndex] ?? String(safeIndex + 1);
}
</script>
