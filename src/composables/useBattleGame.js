import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { gsap } from 'gsap';
import { GAME_CONFIG } from '../data/gameConfig.js';
import { directions } from '../data/directions.js';
import { enemySkills } from '../data/enemySkills.js';
import { runEnemyUltimateEffect, runPlayerUltimateEffect } from '../game/ultimateLogic.js';
import { sfx } from '../services/SoundEngine.js';
import {
  drawSlashLine,
  fadeOutCataractMist,
  hideCataractMist,
  showCataractMist,
  showDamagePopup,
  showFeedbackPop,
  triggerImpactShake,
  triggerSplitEffect
} from '../utils/effects.js';

export function useBattleGame({ autoStart = true, getBattleProgression = null } = {}) {
  const playerMaxHp = ref(GAME_CONFIG.maxHp);
  const enemyMaxHp = ref(GAME_CONFIG.maxHp);
  const playerHp = ref(playerMaxHp.value);
  const enemyHp = ref(enemyMaxHp.value);
  const currentRound = ref(1);
  const timeLeft = ref(GAME_CONFIG.firstRoundSeconds);
  const gameState = ref('intro');
  const announcementText = ref('');
  const combo = ref(0);
  const playerTotalHits = ref(0);
  const enemyRoundHits = ref(0);
  const skillPoints = ref(0);
  const playerDebuff = ref(null);
  const enemyDebuff = ref(null);
  const isPaused = ref(false);
  const isSkillSequenceActive = ref(false);
  const pendingRoundAdvance = ref(false);
  const isSplitting = ref(false);
  const isEnemyTurn = ref(false);
  const cutsceneSkillName = ref('');
  const audioVolume = ref(1);
  const sfxVolume = ref(1);
  const sfxEnabled = ref(true);
  const bgmEnabled = ref(false);
  const vibrationEnabled = ref(true);
  const currentTarget = reactive({ rotation: 0, id: 'right' });
  const targetTransform = computed(() => ({ transform: `rotate(${currentTarget.rotation}deg)` }));
  const opponentMaxHp = enemyMaxHp;
  const opponentHp = enemyHp;
  const opponentRoundHits = enemyRoundHits;
  const opponentDebuff = enemyDebuff;
  const battleStats = reactive({
    maxHp: GAME_CONFIG.maxHp,
    targetHitDamage: GAME_CONFIG.targetHitDamage,
    skillPointGainPerHit: GAME_CONFIG.skillPointGainPerHit,
    enemyAttackChancePerTick: GAME_CONFIG.enemyAttackChancePerTick,
    enemyAttackDamage: GAME_CONFIG.enemyAttackDamage,
    enemyUltChancePerTick: GAME_CONFIG.enemyUltChancePerTick
  });

  let timerInterval = null;
  const runToken = ref(0);
  const asyncTimeouts = new Set();
  const asyncIntervals = new Set();

  function scheduleTimeout(callback, delay) {
    const id = setTimeout(() => {
      asyncTimeouts.delete(id);
      callback();
    }, delay);
    asyncTimeouts.add(id);
    return id;
  }

  function scheduleInterval(callback, delay) {
    const id = setInterval(callback, delay);
    asyncIntervals.add(id);
    return id;
  }

  function clearAsyncJobs() {
    asyncTimeouts.forEach(id => clearTimeout(id));
    asyncTimeouts.clear();
    asyncIntervals.forEach(id => clearInterval(id));
    asyncIntervals.clear();
    timerInterval = null;
  }

  function bumpRunToken() {
    runToken.value += 1;
    clearAsyncJobs();
    gsap.killTweensOf('#app-shell');
    return runToken.value;
  }

  function isRunActive(token) {
    return token === runToken.value;
  }

  function getPlayerAvatarEl() {
    return document.querySelector('.player-avatar-figure');
  }

  function resetPlayerAvatarPosition() {
    const avatar = getPlayerAvatarEl();
    if (!avatar) return;
    gsap.set(avatar, { x: 0 });
  }

  async function animatePlayerAvatarOut(token) {
    const avatar = getPlayerAvatarEl();
    if (!avatar || !isRunActive(token)) return;

    await new Promise(resolve => {
      gsap.to(avatar, {
        x: -340,
        duration: 0.16,
        ease: 'power2.in',
        onComplete: resolve
      });
    });
  }

  async function animatePlayerAvatarBack(token) {
    const avatar = getPlayerAvatarEl();
    if (!avatar || !isRunActive(token)) return;

    await new Promise(resolve => {
      gsap.to(avatar, {
        x: 0,
        duration: 0.22,
        ease: 'power2.out',
        onComplete: resolve
      });
    });
  }

  async function waitForRun(ms, token) {
    await new Promise(resolve => {
      scheduleTimeout(resolve, ms);
    });
    return isRunActive(token);
  }

  function isFinishing() {
    return gameState.value === 'finishing';
  }

  function vibrate(pattern) {
    if (!vibrationEnabled.value) return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(pattern);
  }

  function damageEnemy(amount, color = '#ef4444') {
    enemyHp.value = Math.max(0, enemyHp.value - amount);
    showDamagePopup(-amount, false, color, { finishing: isFinishing() });
  }

  function damagePlayer(amount, color = '#ef4444') {
    playerHp.value = Math.max(0, playerHp.value - amount);
    showDamagePopup(-amount, true, color, { finishing: isFinishing() });
  }

  function triggerSlowMotionFinish() {
    if (gameState.value === 'finishing' || gameState.value === 'gameResult') return;
    const token = runToken.value;

    if (timerInterval) {
      clearInterval(timerInterval);
      asyncIntervals.delete(timerInterval);
      timerInterval = null;
    }
    gameState.value = 'finishing';
    pendingRoundAdvance.value = false;
    isSkillSequenceActive.value = false;
    vibrate([45, 30, 65]);
    sfx.playUlt();

    scheduleTimeout(() => {
      if (!isRunActive(token)) return;
      gameState.value = 'gameResult';
    }, 3000);
  }

  function processSlash(dirId, x, y) {
    if (gameState.value !== 'playing' || isPaused.value) return;
    const token = runToken.value;

    if (dirId !== currentTarget.id) {
      combo.value = 0;
      showFeedbackPop('誤', '#ef4444', x, y);
      triggerImpactShake(0, 25);
      vibrate(18);
      sfx.playHit();
      return;
    }

    playerTotalHits.value++;
    combo.value++;
    skillPoints.value = Math.min(100, skillPoints.value + battleStats.skillPointGainPerHit);

    const targetEl = document.getElementById('target-anchor');
    const rect = targetEl ? targetEl.getBoundingClientRect() : null;

    damageEnemy(battleStats.targetHitDamage);
    vibrate(12);
    sfx.playHit();

    if (rect) {
      triggerSplitEffect(rect, currentTarget.rotation, { finishing: isFinishing() });
    }

    isSplitting.value = true;

    if (enemyHp.value <= 0) {
      triggerSlowMotionFinish();
      return;
    }

    scheduleTimeout(() => {
      if (!isRunActive(token)) return;
      isSplitting.value = false;
      spawnTarget(token);
    }, 80);
  }

  async function spawnTarget(token = runToken.value) {
    if (!isRunActive(token)) return;

    const rnd = directions[Math.floor(Math.random() * directions.length)];
    currentTarget.rotation = rnd.deg;
    currentTarget.id = rnd.id;

    await nextTick();
    if (!isRunActive(token)) return;

    gsap.fromTo(
      '#target-anchor',
      { scale: 0, opacity: 0, rotation: rnd.deg + 45 },
      { scale: 1, opacity: 1, rotation: rnd.deg, duration: 0.45, ease: 'elastic.out(1, 0.6)' }
    );
  }

  async function runAnnouncement(text, duration, token = runToken.value) {
    if (!isRunActive(token)) return false;

    announcementText.value = text;
    await nextTick();
    if (!isRunActive(token)) return false;

    const el = document.getElementById('round-announcement');
    if (el) {
      gsap.fromTo(
        el,
        { scale: 0.5, opacity: 0, rotation: -8 },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.2)' }
      );
    }

    const alive = await waitForRun(duration, token);
    if (!alive) return false;

    if (el) {
      await gsap.to(el, { scale: 1.4, opacity: 0, duration: 0.35, ease: 'expo.in' });
    }

    announcementText.value = '';
    return isRunActive(token);
  }

  async function startNewRound(token = runToken.value) {
    if (!isRunActive(token)) return;

    playerDebuff.value = null;
    enemyDebuff.value = null;
    pendingRoundAdvance.value = false;
    isSplitting.value = false;
    enemyRoundHits.value = 0;
    hideCataractMist();

    if (!isRunActive(token) || gameState.value === 'gameResult' || gameState.value === 'finishing') return;

    timeLeft.value = GAME_CONFIG.firstRoundSeconds - ((currentRound.value - 1) * GAME_CONFIG.secondsLostPerRound);
    gameState.value = 'intro';

    const phase1 = await runAnnouncement(`第 ${currentRound.value} 回`, 1200, token);
    if (!phase1) return;
    const phase2 = await runAnnouncement('準備', 1000, token);
    if (!phase2) return;
    const phase3 = await runAnnouncement('斬！', 800, token);
    if (!phase3) return;

    gameState.value = 'playing';
    await spawnTarget(token);
    startTimer(token);
  }

  function startTimer(token = runToken.value) {
    if (timerInterval) {
      clearInterval(timerInterval);
      asyncIntervals.delete(timerInterval);
    }

    timerInterval = scheduleInterval(() => {
      if (!isRunActive(token)) {
        clearInterval(timerInterval);
        asyncIntervals.delete(timerInterval);
        timerInterval = null;
        return;
      }
      if (gameState.value !== 'playing' || isPaused.value) return;

      timeLeft.value -= GAME_CONFIG.tickMs / 1000;

      if (Math.random() < battleStats.enemyAttackChancePerTick && !enemyDebuff.value) {
        enemyRoundHits.value++;
        damagePlayer(battleStats.enemyAttackDamage);
        triggerImpactShake(Math.random() * 360, 10);
        vibrate(16);
        sfx.playHit();

        if (playerHp.value <= 0) {
          triggerSlowMotionFinish();
          return;
        }
      }

      if (Math.random() < battleStats.enemyUltChancePerTick && !enemyDebuff.value && timeLeft.value > 1.5) {
        useEnemyUlt();
      }

      if (timeLeft.value <= 0) {
        pendingRoundAdvance.value = true;
        resolveRoundTransitionIfNeeded(token);
      }
    }, GAME_CONFIG.tickMs);
  }

  function resolveRoundTransitionIfNeeded(token = runToken.value) {
    if (!isRunActive(token)) return;
    if (!pendingRoundAdvance.value) return;
    if (isSkillSequenceActive.value) return;
    if (gameState.value === 'finishing' || gameState.value === 'gameResult') return;

    pendingRoundAdvance.value = false;

    if (timerInterval) {
      clearInterval(timerInterval);
      asyncIntervals.delete(timerInterval);
      timerInterval = null;
    }

    if (currentRound.value < GAME_CONFIG.totalRounds) {
      currentRound.value++;
      startNewRound(token);
    } else {
      triggerSlowMotionFinish();
    }
  }

  async function useSkill(skill) {
    if (isPaused.value || skillPoints.value < skill.cost || gameState.value !== 'playing') return;
    const token = runToken.value;
    isSkillSequenceActive.value = true;
    if (timeLeft.value <= 0) pendingRoundAdvance.value = true;

    try {
      skillPoints.value -= skill.cost;
      await animatePlayerAvatarOut(token);
      if (!isRunActive(token)) return;

      await playCutscene(skill.name, false, token);
      if (!isRunActive(token)) return;
      sfx.playUlt();

      const playerUltimateAlive = await runPlayerUltimateEffect(skill, token, {
        enemyDebuff,
        damageEnemy,
        triggerImpactShake,
        vibrate,
        sfx,
        waitForRun,
        scheduleTimeout,
        isRunActive,
        runAstigmatismSlash
      });
      if (!playerUltimateAlive) return;

      await animatePlayerAvatarBack(token);
      if (!isRunActive(token)) return;

      if (gameState.value !== 'finishing') gameState.value = 'playing';
      if (enemyHp.value <= 0) triggerSlowMotionFinish();
    } finally {
      if (isRunActive(token)) {
        isSkillSequenceActive.value = false;
        resolveRoundTransitionIfNeeded(token);
      }
    }
  }

  async function runAstigmatismSlash(token) {
    await new Promise(resolve => {
      let count = 0;
      const interval = scheduleInterval(() => {
        if (!isRunActive(token)) {
          clearInterval(interval);
          asyncIntervals.delete(interval);
          resolve();
          return;
        }

        sfx.playSlash();
        sfx.playHit();
        damageEnemy(5, '#facc15');
        const centerX = Math.random() * window.innerWidth;
        const centerY = Math.random() * window.innerHeight;
        const angle = Math.random() * Math.PI * 2;
        const length = 180 + (Math.random() * 260);
        const half = length / 2;
        const x1 = centerX - (Math.cos(angle) * half);
        const y1 = centerY - (Math.sin(angle) * half);
        const x2 = centerX + (Math.cos(angle) * half);
        const y2 = centerY + (Math.sin(angle) * half);

        drawSlashLine(x1, y1, x2, y2, { finishing: isFinishing(), muteShake: true });
        triggerImpactShake(Math.random() * 360, 35, 0.04);
        vibrate(8);

        count++;
        if (enemyHp.value <= 0 || count >= 15) {
          clearInterval(interval);
          asyncIntervals.delete(interval);
          gsap.set('#app-shell', { x: 0, y: 0, clearProps: 'transform' });
          scheduleTimeout(resolve, 800);
        }
      }, 60);
    });
  }

  async function useEnemyUlt() {
    if (isPaused.value) return;
    const token = runToken.value;
    isSkillSequenceActive.value = true;
    if (timeLeft.value <= 0) pendingRoundAdvance.value = true;

    try {
      const skill = enemySkills[Math.floor(Math.random() * enemySkills.length)];

      await playCutscene(skill.name, true, token);
      if (!isRunActive(token)) return;
      sfx.playUlt();

      const enemyUltimateAlive = await runEnemyUltimateEffect(skill, token, {
        playerDebuff,
        showCataractMist,
        fadeOutCataractMist,
        scheduleTimeout,
        isRunActive,
        triggerImpactShake,
        vibrate,
        damagePlayer,
        sfx,
        waitForRun
      });
      if (!enemyUltimateAlive) return;

      if (gameState.value !== 'finishing') gameState.value = 'playing';
      if (playerHp.value <= 0) triggerSlowMotionFinish();
    } finally {
      if (isRunActive(token)) {
        isSkillSequenceActive.value = false;
        resolveRoundTransitionIfNeeded(token);
      }
    }
  }

  async function playCutscene(skillName, isEnemy, token = runToken.value) {
    if (!isRunActive(token)) return;

    gameState.value = 'skillCutscene';
    isEnemyTurn.value = isEnemy;
    cutsceneSkillName.value = skillName;

    await nextTick();
    if (!isRunActive(token)) return;

    const cutscene = document.getElementById('cutscene-layer');
    const portrait = cutscene?.querySelector('.cutscene-portrait');
    const nameText = cutscene?.querySelector('.cutscene-skill-name');

    if (!cutscene || !portrait || !nameText) return;

    const timeline = gsap.timeline();
    timeline.to(cutscene, { opacity: 1, duration: 0.2, pointerEvents: 'auto' });
    timeline.fromTo(
      portrait,
      { left: isEnemy ? '130%' : '-30%', opacity: 0 },
      { left: isEnemy ? '50%' : '10%', opacity: 1, duration: 0.5, ease: 'back.out(1.2)' }
    );
    timeline.fromTo(
      nameText,
      { x: isEnemy ? -300 : 300, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4 },
      '-=0.3'
    );
    timeline.to(cutscene, { opacity: 0, duration: 0.3, delay: 1.2 });

    await timeline;
  }

  function applyBattleProgression(stats = {}) {
    const nextPlayerMaxHp = Math.max(120, Math.round(stats.maxHp ?? GAME_CONFIG.maxHp));
    playerMaxHp.value = nextPlayerMaxHp;
    enemyMaxHp.value = GAME_CONFIG.maxHp;
    battleStats.maxHp = nextPlayerMaxHp;
    battleStats.targetHitDamage = Math.max(1, Math.round(stats.targetHitDamage ?? GAME_CONFIG.targetHitDamage));
    battleStats.skillPointGainPerHit = Math.max(1, Math.round(stats.skillPointGainPerHit ?? GAME_CONFIG.skillPointGainPerHit));
    battleStats.enemyAttackChancePerTick = Math.max(0.01, Math.min(0.5, Number(stats.enemyAttackChancePerTick ?? GAME_CONFIG.enemyAttackChancePerTick)));
    battleStats.enemyAttackDamage = Math.max(1, Math.round(stats.enemyAttackDamage ?? GAME_CONFIG.enemyAttackDamage));
    battleStats.enemyUltChancePerTick = Math.max(0, Math.min(0.25, Number(stats.enemyUltChancePerTick ?? GAME_CONFIG.enemyUltChancePerTick)));
  }

  function initGame() {
    const token = bumpRunToken();

    if (typeof getBattleProgression === 'function') {
      applyBattleProgression(getBattleProgression());
    } else {
      applyBattleProgression();
    }

    currentRound.value = 1;
    playerHp.value = playerMaxHp.value;
    enemyHp.value = enemyMaxHp.value;
    combo.value = 0;
    playerTotalHits.value = 0;
    enemyRoundHits.value = 0;
    skillPoints.value = 0;
    gameState.value = 'intro';
    pendingRoundAdvance.value = false;
    isSkillSequenceActive.value = false;
    playerDebuff.value = null;
    enemyDebuff.value = null;
    isSplitting.value = false;
    currentTarget.rotation = 0;
    currentTarget.id = 'right';
    resetPlayerAvatarPosition();
    hideCataractMist();
    if (bgmEnabled.value) sfx.startBgm();
    startNewRound(token);
  }

  function stopGame() {
    bumpRunToken();
    isPaused.value = false;
    gameState.value = 'intro';
    pendingRoundAdvance.value = false;
    isSkillSequenceActive.value = false;
    playerDebuff.value = null;
    enemyDebuff.value = null;
    isSplitting.value = false;
    resetPlayerAvatarPosition();
    hideCataractMist();
    sfx.stopBgm();
  }

  function setPaused(paused) {
    isPaused.value = Boolean(paused);
  }

  function setAudioVolume(volume) {
    const normalized = Math.max(0, Math.min(1, Number(volume)));
    audioVolume.value = normalized;
    sfx.setMasterVolume(normalized);
  }

  function setSfxVolume(volume) {
    const normalized = Math.max(0, Math.min(1, Number(volume)));
    sfxVolume.value = normalized;
    sfx.setSfxVolume(normalized);
  }

  function setSfxEnabled(enabled) {
    const normalized = Boolean(enabled);
    sfxEnabled.value = normalized;
    sfx.setEnabled(normalized);
  }

  function setBgmEnabled(enabled) {
    const normalized = Boolean(enabled);
    bgmEnabled.value = normalized;
    sfx.setBgmEnabled(normalized);
  }

  function setVibrationEnabled(enabled) {
    vibrationEnabled.value = Boolean(enabled);
  }

  if (autoStart) {
    onMounted(initGame);
  }

  onBeforeUnmount(() => {
    bumpRunToken();
    sfx.stopBgm();
  });

  return {
    playerMaxHp,
    enemyMaxHp,
    opponentMaxHp,
    playerHp,
    enemyHp,
    opponentHp,
    currentRound,
    timeLeft,
    gameState,
    announcementText,
    combo,
    playerTotalHits,
    enemyRoundHits,
    opponentRoundHits,
    skillPoints,
    playerDebuff,
    enemyDebuff,
    opponentDebuff,
    isPaused,
    isSplitting,
    isEnemyTurn,
    audioVolume,
    sfxVolume,
    sfxEnabled,
    bgmEnabled,
    vibrationEnabled,
    cutsceneSkillName,
    currentTarget,
    targetTransform,
    processSlash,
    useSkill,
    initGame,
    stopGame,
    setPaused,
    setAudioVolume,
    setSfxVolume,
    setSfxEnabled,
    setBgmEnabled,
    setVibrationEnabled
  };
}
