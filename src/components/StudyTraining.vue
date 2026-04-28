<template>
  <section class="study-screen">
    <header class="study-header">
      <button type="button" class="study-back-btn pixel-border" @click="$emit('back-home')">返回</button>
      <h2 class="study-title">讀書強化</h2>
      <div class="study-points pixel-border">SP {{ state.points }}</div>
    </header>

    <div class="study-layout">
      <article class="study-card pixel-border">
        <div class="study-card-top">
          <p class="study-tag">{{ currentQuestion.category }}</p>
          <p class="study-progress">題庫 {{ state.answered }} / {{ state.answered + 1 }}</p>
        </div>
        <h3 class="study-question">{{ currentQuestion.question }}</h3>

        <div class="study-options">
          <button
            v-for="(option, idx) in currentQuestion.options"
            :key="option"
            type="button"
            class="study-option-btn"
            :class="optionClass(idx)"
            :disabled="locked"
            @click="answerQuestion(idx)"
          >
            {{ option }}
          </button>
        </div>

        <p class="study-feedback" :class="{ correct: isCorrect, wrong: isAnswered && !isCorrect }">
          {{ feedbackText }}
        </p>

        <button type="button" class="study-next-btn" :disabled="!isAnswered" @click="nextQuestion">
          下一題
        </button>
      </article>

      <article class="study-card pixel-border">
        <h3 class="study-section-title">能力強化</h3>
        <p class="study-note">目前為第一版：升級資料已保存，下一階段接入戰鬥參數。</p>

        <div class="upgrade-item">
          <div>
            <p class="upgrade-name">體能訓練</p>
            <p class="upgrade-level">Lv. {{ state.hpLevel }}</p>
          </div>
          <button
            type="button"
            class="upgrade-btn"
            :disabled="state.points < hpUpgradeCost"
            @click="$emit('upgrade-hp', hpUpgradeCost)"
          >
            升級 ({{ hpUpgradeCost }}SP)
          </button>
        </div>

        <div class="upgrade-item">
          <div>
            <p class="upgrade-name">專注訓練</p>
            <p class="upgrade-level">Lv. {{ state.focusLevel }}</p>
          </div>
          <button
            type="button"
            class="upgrade-btn"
            :disabled="state.points < focusUpgradeCost"
            @click="$emit('upgrade-focus', focusUpgradeCost)"
          >
            升級 ({{ focusUpgradeCost }}SP)
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { studyQuestions } from '../data/studyQuestions.js';

const props = defineProps({
  state: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['back-home', 'add-points', 'record-answer', 'upgrade-hp', 'upgrade-focus']);

const questionIndex = ref(0);
const selectedIndex = ref(null);
const isAnswered = ref(false);
const isCorrect = ref(false);

const currentQuestion = computed(() => studyQuestions[questionIndex.value % studyQuestions.length]);
const locked = computed(() => isAnswered.value);
const hpUpgradeCost = computed(() => 25 + props.state.hpLevel * 10);
const focusUpgradeCost = computed(() => 20 + props.state.focusLevel * 10);
const feedbackText = computed(() => {
  if (!isAnswered.value) return '答對可獲得 Study Points，累積後可強化角色。';
  if (isCorrect.value) return `答對！+10 SP。${currentQuestion.value.explanation}`;
  return `答錯。${currentQuestion.value.explanation}`;
});

function answerQuestion(idx) {
  if (isAnswered.value) return;

  selectedIndex.value = idx;
  isAnswered.value = true;
  isCorrect.value = idx === currentQuestion.value.answerIndex;

  if (isCorrect.value) {
    emit('add-points', 10);
  }

  emit('record-answer', isCorrect.value);
}

function nextQuestion() {
  if (!isAnswered.value) return;
  questionIndex.value += 1;
  selectedIndex.value = null;
  isAnswered.value = false;
  isCorrect.value = false;
}

function optionClass(idx) {
  if (!isAnswered.value) return '';
  if (idx === currentQuestion.value.answerIndex) return 'correct';
  if (idx === selectedIndex.value) return 'wrong';
  return 'dimmed';
}
</script>
