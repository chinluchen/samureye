import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { gsap } from 'gsap';
import { GAME_CONFIG } from '../data/gameConfig.js';
import { directions } from '../data/directions.js';
import { enemySkills } from '../data/enemySkills.js';
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

export function useBattleGame({ autoStart = true } = {}) {
  const playerHp = ref(GAME_CONFIG.maxHp);
  const enemyHp = ref(GAME_CONFIG.maxHp);
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
  const isSplitting = ref(false);
  const isEnemyTurn = ref(false);
  const cutsceneSkillName = ref('');
  const audioVolume = ref(1);
  const sfxEnabled = ref(true);
  const bgmEnabled = ref(false);
  const vibrationEnabled = ref(true);
  const currentTarget = reactive({ rotation: 0, id: 'right' });
  const targetTransform = computed(() => ({ transform: `rotate(${currentTarget.rotation}deg)` }));

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
    skillPoints.value = Math.min(100, skillPoints.value + GAME_CONFIG.skillPointGainPerHit);

    const targetEl = document.getElementById('target-anchor');
    const rect = targetEl ? targetEl.getBoundingClientRect() : null;

    damageEnemy(GAME_CONFIG.targetHitDamage);
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

      if (Math.random() < GAME_CONFIG.enemyAttackChancePerTick && !enemyDebuff.value) {
        enemyRoundHits.value++;
        damagePlayer(GAME_CONFIG.enemyAttackDamage);
        triggerImpactShake(Math.random() * 360, 10);
        vibrate(16);
        sfx.playHit();

        if (playerHp.value <= 0) {
          triggerSlowMotionFinish();
          return;
        }
      }

      if (Math.random() < GAME_CONFIG.enemyUltChancePerTick && !enemyDebuff.value && timeLeft.value > 1.5) {
        useEnemyUlt();
      }

      if (timeLeft.value <= 0) {
        clearInterval(timerInterval);
        asyncIntervals.delete(timerInterval);
        timerInterval = null;

        if (currentRound.value < GAME_CONFIG.totalRounds) {
          currentRound.value++;
          startNewRound(token);
        } else {
          triggerSlowMotionFinish();
        }
      }
    }, GAME_CONFIG.tickMs);
  }

  async function useSkill(skill) {
    if (isPaused.value || skillPoints.value < skill.cost || gameState.value !== 'playing') return;
    const token = runToken.value;

    skillPoints.value -= skill.cost;
    await playCutscene(skill.name, false, token);
    if (!isRunActive(token)) return;
    sfx.playUlt();

    if (skill.id === 'cataract') {
      enemyDebuff.value = 'cataract';
      const alive = await waitForRun(500, token);
      if (!alive) return;
      scheduleTimeout(() => {
        if (!isRunActive(token)) return;
        if (enemyDebuff.value) {
          enemyDebuff.value = null;
        }
      }, 3000);
    }

    if (skill.id === 'dilation') {
      damageEnemy(140, '#facc15');
      triggerImpactShake(0, 45, 0.1);
      vibrate([18, 18, 18]);
      sfx.playHit();
      const alive = await waitForRun(1200, token);
      if (!alive) return;
    }

    if (skill.id === 'astig') {
      await runAstigmatismSlash(token);
      if (!isRunActive(token)) return;
    }

    if (gameState.value !== 'finishing') gameState.value = 'playing';
    if (enemyHp.value <= 0) triggerSlowMotionFinish();
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
        drawSlashLine(
          Math.random() * window.innerWidth,
          Math.random() * window.innerHeight,
          Math.random() * window.innerWidth,
          Math.random() * window.innerHeight,
          { finishing: isFinishing(), muteShake: true }
        );
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

    const skill = enemySkills[Math.floor(Math.random() * enemySkills.length)];

    await playCutscene(skill.name, true, token);
    if (!isRunActive(token)) return;
    sfx.playUlt();

    if (skill.id === 'cataract') {
      playerDebuff.value = 'cataract';
      showCataractMist();
      scheduleTimeout(() => {
        if (!isRunActive(token)) return;
        if (playerDebuff.value) {
          fadeOutCataractMist(() => {
            if (!isRunActive(token)) return;
            playerDebuff.value = null;
          });
        }
      }, 3000);
    } else {
      triggerImpactShake(0, 50, 0.12);
      vibrate([14, 20, 14]);
    }

    damagePlayer(skill.damage, '#facc15');
    sfx.playHit();
    const alive = await waitForRun(1200, token);
    if (!alive) return;

    if (gameState.value !== 'finishing') gameState.value = 'playing';
    if (playerHp.value <= 0) triggerSlowMotionFinish();
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

  function initGame() {
    const token = bumpRunToken();

    currentRound.value = 1;
    playerHp.value = GAME_CONFIG.maxHp;
    enemyHp.value = GAME_CONFIG.maxHp;
    combo.value = 0;
    playerTotalHits.value = 0;
    enemyRoundHits.value = 0;
    skillPoints.value = 0;
    gameState.value = 'intro';
    playerDebuff.value = null;
    enemyDebuff.value = null;
    isSplitting.value = false;
    currentTarget.rotation = 0;
    currentTarget.id = 'right';
    hideCataractMist();
    if (bgmEnabled.value) sfx.startBgm();
    startNewRound(token);
  }

  function stopGame() {
    bumpRunToken();
    isPaused.value = false;
    gameState.value = 'intro';
    playerDebuff.value = null;
    enemyDebuff.value = null;
    isSplitting.value = false;
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
    playerHp,
    enemyHp,
    currentRound,
    timeLeft,
    gameState,
    announcementText,
    combo,
    playerTotalHits,
    enemyRoundHits,
    skillPoints,
    playerDebuff,
    enemyDebuff,
    isPaused,
    isSplitting,
    isEnemyTurn,
    audioVolume,
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
    setSfxEnabled,
    setBgmEnabled,
    setVibrationEnabled
  };
}
