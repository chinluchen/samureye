<template>
  <div id="game-world-wrapper">
    <button
      v-if="shouldShowBattleMenuTrigger"
      type="button"
      class="battle-menu-trigger pixel-border"
      @click="$emit('open-battle-menu')"
    >
      選單
    </button>

    <div id="fx-layer"></div>

    <CutsceneLayer
      :is-enemy-turn="isEnemyTurn"
      :skill-name="cutsceneSkillName"
      :player-portrait-url="selectedCharacter.cutsceneFrontUrl || selectedCharacter.avatarUrl"
      :enemy-portrait-url="enemyCutscenePortraitUrl"
      :animation-meta="activeSkillAnimation"
    />

    <div id="cataract-mist-layer">
      <div class="mist-text">無法攻擊</div>
    </div>

    <GameTarget
      :game-state="gameState"
      :is-splitting="isSplitting"
      :target-transform="targetTransform"
      :reticle-offset-transform="reticleOffsetTransform"
      :announcement-text="announcementText"
    />

    <HudLayer
      :player-avatar-url="selectedCharacter.avatarUrl"
      :opponent-avatar-url="opponentAvatarUrl"
      :player-name="battleHudPlayerName"
      :opponent-name="battleHudOpponentName"
      :player-max-hp="playerMaxHp"
      :opponent-max-hp="opponentMaxHp"
      :player-hp="playerHp"
      :opponent-hp="opponentHp"
      :opponent-round-hits="opponentRoundHits"
      :combo="combo"
      :time-left="timeLeft"
      :skill-points="skillPoints"
      :skill-cooldowns="playerSkillCooldowns"
      :skill-cooldown-pending="playerSkillCooldownPending"
      :skills="selectedSkills"
      :hide-skill-hud="hideSkillHud"
      :disable-skill-buttons="disableSkillButtons"
      :game-state="gameState"
      :player-debuff="playerDebuff"
      :hide-timer="isTutorialUntimed"
      @use-skill="$emit('use-skill', $event)"
    />

    <StoryOverlay
      v-if="isPreBattleDialogueActive && !isBattleMenuOpen"
      :meta="preBattleDialogueMeta"
      :progress-count="0"
      :required-hits="0"
      :focus-rect="null"
      @next="$emit('advance-pre-battle-dialogue')"
    />

    <StoryOverlay
      v-else-if="isTutorialGuideActive && !isBattleMenuOpen"
      :meta="currentStoryStepMeta"
      :progress-count="tutorialHitProgress"
      :required-hits="tutorialStateRequiredHits"
      :focus-rect="tutorialFocusRect"
      @next="$emit('advance-tutorial-step')"
    />
  </div>

  <ResultLayer
    v-if="shouldRenderBattleResultLayer"
    :player-hp="playerHp"
    :opponent-hp="opponentHp"
    :outcome="currentPvpResultOutcome"
    :is-pvp="isCurrentBattlePvP"
    @play-again="$emit('init-game')"
    @open-stage-select="$emit('go-stage-select-from-result')"
    @open-matchmaking="$emit('go-matchmaking-from-result')"
    @go-home="$emit('return-to-home')"
  />

  <BattleMenu
    v-if="isBattleMenuOpen"
    :view="battleMenuView"
    :is-pvp="isCurrentBattlePvP"
    :volume="audioVolume"
    :sfx-volume="sfxVolume"
    :sfx-enabled="sfxEnabled"
    :bgm-enabled="bgmEnabled"
    :vibration-enabled="vibrationEnabled"
    @go-home="$emit('return-to-home')"
    @restart="$emit('restart-battle-from-menu')"
    @open-settings="$emit('open-menu-settings')"
    @close="$emit('close-battle-menu')"
    @back-main="$emit('back-to-main-menu-view')"
    @volume-change="$emit('set-audio-volume', $event)"
    @sfx-volume-change="$emit('set-sfx-volume', $event)"
    @sfx-toggle="$emit('set-sfx-enabled', $event)"
    @bgm-toggle="$emit('set-bgm-enabled', $event)"
    @vibration-toggle="$emit('set-vibration-enabled', $event)"
  />
</template>

<script setup>
import BattleMenu from './BattleMenu.vue';
import CutsceneLayer from './CutsceneLayer.vue';
import GameTarget from './GameTarget.vue';
import HudLayer from './HudLayer.vue';
import ResultLayer from './ResultLayer.vue';
import StoryOverlay from './StoryOverlay.vue';

defineProps({
  shouldShowBattleMenuTrigger: { type: Boolean, required: true },
  selectedCharacter: { type: Object, required: true },
  opponentAvatarUrl: { type: String, default: '' },
  enemyCutscenePortraitUrl: { type: String, default: '' },
  isEnemyTurn: { type: Boolean, required: true },
  cutsceneSkillName: { type: String, required: true },
  activeSkillAnimation: { type: Object, default: null },
  gameState: { type: String, required: true },
  isSplitting: { type: Boolean, required: true },
  targetTransform: { type: Object, required: true },
  reticleOffsetTransform: { type: Object, required: true },
  announcementText: { type: String, required: true },
  battleHudPlayerName: { type: String, required: true },
  battleHudOpponentName: { type: String, required: true },
  playerMaxHp: { type: Number, required: true },
  opponentMaxHp: { type: Number, required: true },
  playerHp: { type: Number, required: true },
  opponentHp: { type: Number, required: true },
  opponentRoundHits: { type: Number, required: true },
  combo: { type: Number, required: true },
  timeLeft: { type: Number, required: true },
  skillPoints: { type: Number, required: true },
  playerSkillCooldowns: { type: Object, required: true },
  playerSkillCooldownPending: { type: Object, required: true },
  selectedSkills: { type: Array, required: true },
  hideSkillHud: { type: Boolean, default: false },
  disableSkillButtons: { type: Boolean, default: false },
  playerDebuff: { type: String, default: null },
  isTutorialUntimed: { type: Boolean, required: true },
  isTutorialGuideActive: { type: Boolean, required: true },
  isPreBattleDialogueActive: { type: Boolean, default: false },
  preBattleDialogueMeta: { type: Object, default: null },
  isBattleMenuOpen: { type: Boolean, required: true },
  currentStoryStepMeta: { type: Object, default: null },
  tutorialHitProgress: { type: Number, required: true },
  tutorialStateRequiredHits: { type: Number, required: true },
  tutorialFocusRect: { type: Object, default: null },
  shouldRenderBattleResultLayer: { type: Boolean, required: true },
  currentPvpResultOutcome: { type: String, required: true },
  isCurrentBattlePvP: { type: Boolean, required: true },
  battleMenuView: { type: String, required: true },
  audioVolume: { type: Number, required: true },
  sfxVolume: { type: Number, required: true },
  sfxEnabled: { type: Boolean, required: true },
  bgmEnabled: { type: Boolean, required: true },
  vibrationEnabled: { type: Boolean, required: true }
});

defineEmits([
  'open-battle-menu',
  'use-skill',
  'advance-pre-battle-dialogue',
  'advance-tutorial-step',
  'init-game',
  'go-stage-select-from-result',
  'go-matchmaking-from-result',
  'return-to-home',
  'restart-battle-from-menu',
  'open-menu-settings',
  'close-battle-menu',
  'back-to-main-menu-view',
  'set-audio-volume',
  'set-sfx-volume',
  'set-sfx-enabled',
  'set-bgm-enabled',
  'set-vibration-enabled'
]);
</script>
