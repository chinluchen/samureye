export const SCREEN_BGM_SCENE = {
  home: 'home',
  stageSelect: 'stageSelect',
  matchmaking: 'stageSelect',
  battle: 'battle',
  battleBoss: 'battleBoss',
  study: 'study',
  settings: 'home',
  leaderboard: 'home',
  characterSelect: 'characterSelect',
  skillLoadout: 'study'
};

export const BGM_SCENE_TRACK_SAMPLE = {
  home: 'bgm_home_mainmenu',
  stageSelect: 'bgm_stage_select',
  battle: 'bgm_battle_normal',
  battleBoss: 'bgm_battle_boss',
  study: 'bgm_study_research',
  characterSelect: 'bgm_character_select'
};

export const BGM_SAMPLE_PLAYBACK = {
  bgm_study_research: {
    startOffset: 3,
    loopStart: 3
  }
};

export const BGM_SCENE_PRESETS = {
  home: {
    oscAType: 'triangle',
    oscBType: 'sine',
    oscAFreq: 196.0,
    oscBFreq: 261.63,
    gainA: 0.05,
    gainB: 0.035,
    masterGain: 0.32
  },
  stageSelect: {
    oscAType: 'triangle',
    oscBType: 'square',
    oscAFreq: 185.0,
    oscBFreq: 233.08,
    gainA: 0.055,
    gainB: 0.03,
    masterGain: 0.34
  },
  battle: {
    oscAType: 'triangle',
    oscBType: 'sine',
    oscAFreq: 164.81,
    oscBFreq: 246.94,
    gainA: 0.06,
    gainB: 0.04,
    masterGain: 0.35
  },
  battleBoss: {
    oscAType: 'square',
    oscBType: 'sawtooth',
    oscAFreq: 146.83,
    oscBFreq: 220.0,
    gainA: 0.06,
    gainB: 0.05,
    masterGain: 0.35
  },
  study: {
    oscAType: 'sine',
    oscBType: 'triangle',
    oscAFreq: 220.0,
    oscBFreq: 293.66,
    gainA: 0.04,
    gainB: 0.03,
    masterGain: 0.28
  },
  settings: {
    oscAType: 'sine',
    oscBType: 'sine',
    oscAFreq: 174.61,
    oscBFreq: 261.63,
    gainA: 0.035,
    gainB: 0.03,
    masterGain: 0.24
  },
  characterSelect: {
    oscAType: 'triangle',
    oscBType: 'sine',
    oscAFreq: 207.65,
    oscBFreq: 311.13,
    gainA: 0.05,
    gainB: 0.03,
    masterGain: 0.32
  },
  skillLoadout: {
    oscAType: 'square',
    oscBType: 'triangle',
    oscAFreq: 196.0,
    oscBFreq: 293.66,
    gainA: 0.04,
    gainB: 0.04,
    masterGain: 0.3
  }
};

export const SKILL_SFX_PROFILE = {
  astig: 'slash',
  macular: 'burst',
  'prism-break': 'burst',
  'flash-glare': 'flash',
  'accom-burst': 'focus',
  'corneal-shield': 'shield',
  'full-field-scan': 'heavy',
  'amblyopia-trap': 'dark',
  'duochrome-strike': 'split',
  'presbyopia-press': 'heavy',
  'cover-strike': 'heavy',
  'retinal-detachment': 'heavy',
  'myopia-spiral': 'focus',
  'dry-eye-burn': 'flash',
  'field-loss': 'dark',
  'binocular-chaos': 'split',
  'cycloplegic-shock': 'heavy',
  'mydriasis-boom': 'burst',
  'pinhole-focus': 'focus'
};
