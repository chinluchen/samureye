import basicLifeQuestions from './dojo_basic_life_questions.json';
import professionalQuestions from './dojo_professional_questions.json';

export const DOJO_DAILY_CAP_POINTS = 10;
export const DOJO_ROUND_QUESTION_COUNT = 5;

export const dojoModes = [
  {
    key: 'basic_life',
    label: '護眼新手村',
    questionBankKey: 'basic_life',
    passThreshold: 4,
    rewardPoints: 2,
    locked: false
  },
  {
    key: 'professional',
    label: '視光修羅場',
    questionBankKey: 'professional',
    passThreshold: 3,
    rewardPoints: 2,
    locked: false
  },
  {
    key: 'national_exam',
    label: '爆肝國考塔',
    questionBankKey: 'national_exam',
    passThreshold: 5,
    rewardPoints: 0,
    locked: true,
    lockedMessage: '爆肝國考塔尚未開放，此區域目前封印中。'
  }
];

export const dojoQuestionBanks = {
  basic_life: basicLifeQuestions,
  professional: professionalQuestions,
  national_exam: []
};
