export const studyTracks = [
  {
    key: 'optometry',
    subjectName: '視光學',
    abilityName: '斬擊準度',
    abilityDesc: '提升攻擊判定穩定度，降低失誤。',
    rewardText: '每次升級讓視標判讀更穩定。'
  },
  {
    key: 'optics',
    subjectName: '配鏡學',
    abilityName: '體力上限',
    abilityDesc: '提升戰鬥耐久，讓血量成長。',
    rewardText: '每次升級增加可承受的傷害。'
  },
  {
    key: 'contactLens',
    subjectName: '隱形眼鏡學',
    abilityName: '專注回復',
    abilityDesc: '提升戰鬥節奏，讓 MP 回復更快。',
    rewardText: '每次升級強化續航與技能連段。'
  },
  {
    key: 'other',
    subjectName: '其他',
    abilityName: '抗干擾',
    abilityDesc: '提升面對異常狀態時的韌性。',
    rewardText: '每次升級降低被控場的壓力。'
  }
];

export const studyQuestionsByTrack = {
  optometry: [
    {
      id: 'optometry-q1',
      category: '視力檢查',
      question: 'Landolt C 視標最主要是用來評估哪個能力？',
      options: ['方向辨識與視力', '色彩飽和度', '聽覺反射', '眼壓值'],
      answerIndex: 0,
      explanation: 'Landolt C 主要檢查視力與缺口方向辨識能力。'
    },
    {
      id: 'optometry-q2',
      category: '屈光概念',
      question: '散光常見的主訴是？',
      options: ['線條邊緣重影', '只剩黑白視覺', '近看完全模糊', '視野突然變窄'],
      answerIndex: 0,
      explanation: '散光會造成不同方向光線聚焦不一致，容易看到重影。'
    }
  ],
  optics: [
    {
      id: 'optics-q1',
      category: '鏡片知識',
      question: '鏡片折射率提高時，通常能帶來什麼效果？',
      options: ['鏡片可更薄', '鏡片一定更重', '視野一定更窄', '顏色一定偏黃'],
      answerIndex: 0,
      explanation: '高折射率鏡片可在同度數下做得更薄。'
    },
    {
      id: 'optics-q2',
      category: '配鏡流程',
      question: '單眼瞳距與雙眼瞳距都量測的主要原因是？',
      options: ['讓鏡片光學中心更準', '讓鏡架更亮', '方便提高度數', '降低鏡框重量'],
      answerIndex: 0,
      explanation: '正確瞳距可讓光學中心對準，提升配戴舒適與清晰度。'
    }
  ],
  contactLens: [
    {
      id: 'contact-q1',
      category: '配戴衛教',
      question: '配戴隱形眼鏡前最重要的第一步是？',
      options: ['完整清潔雙手', '先點眼藥水', '先閉眼 30 秒', '先沖洗鏡片盒'],
      answerIndex: 0,
      explanation: '接觸鏡片前務必清潔雙手，能大幅降低感染風險。'
    },
    {
      id: 'contact-q2',
      category: '安全使用',
      question: '日拋隱形眼鏡正確的使用方式是？',
      options: ['當天使用後丟棄', '可連續用三天', '每週用藥水泡一次', '只要舒服就可反覆用'],
      answerIndex: 0,
      explanation: '日拋為一次性產品，當天使用後應直接丟棄。'
    }
  ],
  other: [
    {
      id: 'other-q1',
      category: '用眼保健',
      question: '20-20-20 原則是指每 20 分鐘，至少看多遠多久？',
      options: ['20 呎，20 秒', '20 公尺，20 分鐘', '2 公尺，20 秒', '20 呎，2 秒'],
      answerIndex: 0,
      explanation: '20-20-20 是常見的視覺休息策略。'
    },
    {
      id: 'other-q2',
      category: '臨床常識',
      question: '散瞳檢查主要目的是？',
      options: ['放大瞳孔以檢查眼底', '讓瞳孔變小看近物', '改善色覺異常', '提升眼球轉動速度'],
      answerIndex: 0,
      explanation: '散瞳讓醫師更完整觀察眼底結構。'
    }
  ]
};
