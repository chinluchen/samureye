<template>
  <section class="study-screen">
    <header class="study-header">
      <button type="button" class="study-back-btn pixel-border" @click="onBackPress">
        {{ selectedTrackKey ? '科目選單' : '返回' }}
      </button>
      <h2 class="study-title">讀書強化</h2>
      <div class="study-points pixel-border">SP {{ state.points }}</div>
    </header>

    <div v-if="!selectedTrackKey" class="study-subhome">
      <article
        v-for="track in studyTracks"
        :key="track.key"
        class="study-track-card pixel-border"
        :class="{ 'study-track-locked': !isTrackUnlocked(track.key) }"
      >
        <p class="study-track-subject">{{ track.subjectName }}</p>
        <h3 class="study-track-ability">{{ track.abilityName }}</h3>
        <p class="study-track-desc">{{ track.abilityDesc }}</p>
        <p class="study-track-level">Lv. {{ trackLevel(track.key) }}</p>
        <button
          type="button"
          class="study-open-track-btn"
          :disabled="!isTrackUnlocked(track.key)"
          @click="openTrack(track.key)"
        >
          {{ isTrackUnlocked(track.key) ? '進入學習' : '未解鎖' }}
        </button>
      </article>
    </div>

    <div v-else class="study-layout">
      <article class="study-card pixel-border">
        <div class="study-card-top">
          <p class="study-tag">{{ currentTrack.subjectName }} / {{ currentQuestion.category }}</p>
          <p class="study-progress">
            正答 {{ trackCorrect }} / {{ Math.max(trackAnswered, 1) }}
          </p>
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
        <h3 class="study-section-title">{{ currentTrack.abilityName }}</h3>
        <p class="study-note">{{ currentTrack.rewardText }}</p>

        <div class="upgrade-item">
          <div>
            <p class="upgrade-name">{{ currentTrack.subjectName }}</p>
            <p class="upgrade-level">Lv. {{ trackLevel(selectedTrackKey) }}</p>
          </div>
          <button
            type="button"
            class="upgrade-btn"
            :disabled="state.points < upgradeCost"
            @click="upgradeTrack"
          >
            升級 ({{ upgradeCost }}SP)
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { studyQuestionsByTrack, studyTracks } from '../data/studyQuestions.js';

const props = defineProps({
  state: {
    type: Object,
    required: true
  },
  unlockedTrackKeys: {
    type: Array,
    default: () => ['optometry', 'optics', 'contactLens', 'other']
  }
});

const emit = defineEmits(['back-home', 'add-points', 'record-answer', 'upgrade-track']);

const selectedTrackKey = ref('');
const unlockedTrackSet = computed(() => new Set(props.unlockedTrackKeys));
const questionIndexByTrack = ref({
  optometry: 0,
  optics: 0,
  contactLens: 0,
  other: 0
});
const selectedIndex = ref(null);
const isAnswered = ref(false);
const isCorrect = ref(false);

const currentTrack = computed(() => {
  return studyTracks.find((track) => track.key === selectedTrackKey.value) ?? studyTracks[0];
});
const currentQuestions = computed(() => {
  return studyQuestionsByTrack[selectedTrackKey.value] ?? [];
});
const currentQuestion = computed(() => {
  const questions = currentQuestions.value;
  if (questions.length === 0) {
    return {
      category: '題庫建置中',
      question: '此科目題庫建置中。',
      options: ['返回科目選單'],
      answerIndex: 0,
      explanation: '可先前往其他科目進行學習。'
    };
  }

  const index = questionIndexByTrack.value[selectedTrackKey.value] ?? 0;
  return questions[index % questions.length];
});
const locked = computed(() => isAnswered.value || currentQuestions.value.length === 0);
const upgradeCost = computed(() => 20 + trackLevel(selectedTrackKey.value) * 10);
const trackAnswered = computed(() => trackStats(selectedTrackKey.value).answered);
const trackCorrect = computed(() => trackStats(selectedTrackKey.value).correct);
const feedbackText = computed(() => {
  if (!isAnswered.value) return '先答題拿 SP，再用 SP 升級科目能力。';
  if (isCorrect.value) return `答對！+10 SP。${currentQuestion.value.explanation}`;
  return `答錯。${currentQuestion.value.explanation}`;
});

function trackStats(trackKey) {
  return props.state.tracks[trackKey] ?? { level: 0, answered: 0, correct: 0 };
}

function trackLevel(trackKey) {
  return trackStats(trackKey).level;
}

function openTrack(trackKey) {
  if (!isTrackUnlocked(trackKey)) return;
  selectedTrackKey.value = trackKey;
  selectedIndex.value = null;
  isAnswered.value = false;
  isCorrect.value = false;
}

function onBackPress() {
  if (selectedTrackKey.value) {
    selectedTrackKey.value = '';
    selectedIndex.value = null;
    isAnswered.value = false;
    isCorrect.value = false;
    return;
  }
  emit('back-home');
}

function answerQuestion(idx) {
  if (locked.value || !selectedTrackKey.value) return;

  selectedIndex.value = idx;
  isAnswered.value = true;
  isCorrect.value = idx === currentQuestion.value.answerIndex;

  if (isCorrect.value) {
    emit('add-points', 10);
  }

  emit('record-answer', {
    trackKey: selectedTrackKey.value,
    correct: isCorrect.value
  });
}

function nextQuestion() {
  if (!isAnswered.value || !selectedTrackKey.value) return;

  questionIndexByTrack.value[selectedTrackKey.value] += 1;
  selectedIndex.value = null;
  isAnswered.value = false;
  isCorrect.value = false;
}

function upgradeTrack() {
  if (!selectedTrackKey.value) return;
  if (!isTrackUnlocked(selectedTrackKey.value)) return;
  emit('upgrade-track', {
    trackKey: selectedTrackKey.value,
    cost: upgradeCost.value
  });
}

function isTrackUnlocked(trackKey) {
  return unlockedTrackSet.value.has(trackKey);
}

function optionClass(idx) {
  if (!isAnswered.value) return '';
  if (idx === currentQuestion.value.answerIndex) return 'correct';
  if (idx === selectedIndex.value) return 'wrong';
  return 'dimmed';
}

watch(
  () => props.unlockedTrackKeys,
  () => {
    if (selectedTrackKey.value && !isTrackUnlocked(selectedTrackKey.value)) {
      selectedTrackKey.value = '';
      selectedIndex.value = null;
      isAnswered.value = false;
      isCorrect.value = false;
    }
  },
  { deep: true }
);
</script>
