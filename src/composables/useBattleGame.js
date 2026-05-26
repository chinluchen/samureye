import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { gsap } from 'gsap';
import { GAME_CONFIG } from '../data/gameConfig.js';
import { directions } from '../data/directions.js';
import { enemySkills } from '../data/enemySkills.js';
import { runEnemyUltimateEffect, runPlayerUltimateEffect } from '../game/ultimateLogic.js';
import { triggerHaptic } from '../services/hapticsService.js';
import { sfx } from '../services/SoundEngine.js';
import {
  clearImpactShakeTransforms,
  drawSlashLine,
  fadeOutCataractMist,
  hideCataractMist,
  showCataractMist,
  showDamagePopup,
  showFeedbackPop,
  triggerImpactShake,
  triggerSplitEffect
} from '../utils/effects.js';

export function useBattleGame({
  autoStart = true,
  getBattleProgression = null,
  getEnemySkillPool = null,
  shouldSkipRoundIntro = null,
  getForcedTargetId = null,
  shouldDisableRoundTimer = null,
  isPvpBattle = null,
  onLocalAttack = null
} = {}) {
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
  const playerSkillCooldowns = ref({});
  const playerSkillCooldownPending = ref({});
  const enemySkillCooldowns = ref({});
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
  const bgmEnabled = ref(true);
  const vibrationEnabled = ref(true);
  const currentTarget = reactive({ rotation: 0, id: 'right', offsetX: 0, offsetY: 0 });
  const targetTransform = computed(() => ({ transform: `rotate(${currentTarget.rotation}deg)` }));
  const reticleOffsetTransform = computed(() => ({ transform: `translate(${currentTarget.offsetX}px, ${currentTarget.offsetY}px)` }));
  const opponentMaxHp = enemyMaxHp;
  const opponentHp = enemyHp;
  const opponentRoundHits = enemyRoundHits;
  const opponentDebuff = enemyDebuff;
  const battleStats = reactive({
    maxHp: GAME_CONFIG.maxHp,
    targetHitDamage: GAME_CONFIG.targetHitDamage,
    skillPointGainPerHit: GAME_CONFIG.skillPointGainPerHit,
    enemyHp: GAME_CONFIG.maxHp,
    enemyDamage: GAME_CONFIG.enemyAttackDamage,
    enemyAttackIntervalMs: 600,
    enemyAttackIntervalVarianceMs: 0,
    enemyMissRate: 0,
    enemyCriticalRate: 0,
    enemyCriticalMultiplier: 1,
    enemySkillCastIntervalMs: 3000,
    enemySkillCastVarianceMs: 0,
    enemySkillCastChance: 0,
    enemySkillStartDelayMs: 1200
  });

  let timerInterval = null;
  const runToken = ref(0);
  const asyncTimeouts = new Set();
  const asyncIntervals = new Set();
  const MIN_ENEMY_ATTACK_INTERVAL_MS = 300;
  const MIN_ENEMY_SKILL_CAST_INTERVAL_MS = 1000;
  const ENEMY_SKILL_NO_FALLBACK_FLAG = '__disableFallback';
  let enemyAttackElapsedMs = 0;
  let enemyAttackNextIntervalMs = MIN_ENEMY_ATTACK_INTERVAL_MS;
  let enemySkillElapsedMs = 0;
  let enemySkillNextIntervalMs = MIN_ENEMY_SKILL_CAST_INTERVAL_MS;
  let activeSyncedCutsceneMeta = null;

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
    clearImpactShakeTransforms();
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

  function isPvpMode() {
    return typeof isPvpBattle === 'function' ? Boolean(isPvpBattle()) : false;
  }

  function getSkillCooldownSec(skill) {
    const seconds = Number(skill?.cooldownSec ?? 0);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  }

  function getCooldownLeft(cooldownRef, skillId) {
    return Math.max(0, Number(cooldownRef.value[skillId] ?? 0));
  }

  function startCooldown(cooldownRef, skill) {
    const seconds = getSkillCooldownSec(skill);
    if (seconds <= 0 || !skill?.id) return;
    cooldownRef.value = {
      ...cooldownRef.value,
      [skill.id]: seconds
    };
  }

  function setPendingCooldown(pendingRef, skillId, active) {
    if (!skillId) return;
    if (active) {
      pendingRef.value = {
        ...pendingRef.value,
        [skillId]: true
      };
      return;
    }

    const next = { ...pendingRef.value };
    delete next[skillId];
    pendingRef.value = next;
  }

  function tickCooldownMap(cooldownRef, deltaSec) {
    const entries = Object.entries(cooldownRef.value);
    if (!entries.length) return;

    const next = {};
    for (const [id, value] of entries) {
      const remaining = Math.max(0, Number(value) - deltaSec);
      if (remaining > 0.01) next[id] = remaining;
    }
    cooldownRef.value = next;
  }

  function tickSkillCooldowns(deltaSec) {
    if (deltaSec <= 0) return;
    tickCooldownMap(playerSkillCooldowns, deltaSec);
    tickCooldownMap(enemySkillCooldowns, deltaSec);
  }

  function clampNumber(value, min, max, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function resolveRandomizedIntervalMs(baseMs, varianceMs, minMs = 0) {
    const base = Math.max(0, Math.round(Number(baseMs) || 0));
    const variance = Math.max(0, Math.round(Number(varianceMs) || 0));
    if (variance <= 0) return Math.max(minMs, base);
    const offset = Math.round((Math.random() * (variance * 2)) - variance);
    return Math.max(minMs, base + offset);
  }

  function scheduleNextEnemyAttackInterval() {
    enemyAttackNextIntervalMs = resolveRandomizedIntervalMs(
      battleStats.enemyAttackIntervalMs,
      battleStats.enemyAttackIntervalVarianceMs,
      MIN_ENEMY_ATTACK_INTERVAL_MS
    );
  }

  function scheduleNextEnemySkillAttemptInterval({ first = false } = {}) {
    if (first) {
      enemySkillNextIntervalMs = Math.max(0, Math.round(Number(battleStats.enemySkillStartDelayMs) || 0));
      return;
    }

    enemySkillNextIntervalMs = resolveRandomizedIntervalMs(
      battleStats.enemySkillCastIntervalMs,
      battleStats.enemySkillCastVarianceMs,
      MIN_ENEMY_SKILL_CAST_INTERVAL_MS
    );
  }

  function resetEnemyRhythmSchedulers() {
    enemyAttackElapsedMs = 0;
    enemySkillElapsedMs = 0;
    scheduleNextEnemyAttackInterval();
    scheduleNextEnemySkillAttemptInterval({ first: true });
  }

  function runEnemyNormalAttackOnce() {
    const missRate = clampNumber(battleStats.enemyMissRate, 0, 0.95, 0);
    if (Math.random() < missRate) {
      return;
    }

    const criticalRate = clampNumber(battleStats.enemyCriticalRate, 0, 1, 0);
    const criticalMultiplier = Math.max(1, Number(battleStats.enemyCriticalMultiplier) || 1);
    const baseDamage = Math.max(1, Math.round(Number(battleStats.enemyDamage) || 1));
    const isCritical = Math.random() < criticalRate;
    const finalDamage = isCritical
      ? Math.max(1, Math.round(baseDamage * criticalMultiplier))
      : baseDamage;

    enemyRoundHits.value += 1;
    damagePlayer(finalDamage);
    triggerImpactShake(Math.random() * 360, isCritical ? 12 : 10);
    vibrate(isCritical ? [16, 10, 16] : 16);
    sfx.playHit();

    if (playerHp.value <= 0) {
      triggerSlowMotionFinish();
    }
  }

  function tickEnemyAttackPattern() {
    if (gameState.value !== 'playing' || isPaused.value) return;
    if (enemyDebuff.value) return;
    enemyAttackElapsedMs += GAME_CONFIG.tickMs;
    if (enemyAttackElapsedMs < enemyAttackNextIntervalMs) return;

    enemyAttackElapsedMs = Math.max(0, enemyAttackElapsedMs - enemyAttackNextIntervalMs);
    runEnemyNormalAttackOnce();
    scheduleNextEnemyAttackInterval();
  }

  function shouldDisableEnemySkillFallback(pool) {
    return Boolean(pool && pool[ENEMY_SKILL_NO_FALLBACK_FLAG] === true);
  }

  function pickEffectiveEnemySkillPool() {
    const resolvedPool = typeof getEnemySkillPool === 'function' ? getEnemySkillPool() : null;
    const fallbackDisabled = shouldDisableEnemySkillFallback(resolvedPool);
    const hasArrayPool = Array.isArray(resolvedPool);
    if (!hasArrayPool) return enemySkills;
    if (resolvedPool.length <= 0 && !fallbackDisabled) return enemySkills;
    return resolvedPool;
  }

  function tickEnemySkillPattern() {
    if (gameState.value !== 'playing' || isPaused.value) return;
    enemySkillElapsedMs += GAME_CONFIG.tickMs;
    if (enemySkillElapsedMs < enemySkillNextIntervalMs) return;
    enemySkillElapsedMs = Math.max(0, enemySkillElapsedMs - enemySkillNextIntervalMs);
    scheduleNextEnemySkillAttemptInterval();

    if (enemyDebuff.value) return;
    if (isSkillSequenceActive.value) return;
    if (timeLeft.value <= 1.5) return;

    const chance = clampNumber(battleStats.enemySkillCastChance, 0, 1, 0);
    if (Math.random() >= chance) return;

    const pool = pickEffectiveEnemySkillPool();
    if (!Array.isArray(pool) || pool.length <= 0) return;
    void useEnemyUlt(pool);
  }

  function vibrate(pattern) {
    if (!vibrationEnabled.value) return;
    triggerHaptic(pattern);
  }

  function damageEnemy(amount, color = '#ef4444', meta = null) {
    const damage = Math.max(0, Number(amount));
    if (damage <= 0) return;
    enemyHp.value = Math.max(0, enemyHp.value - damage);
    showDamagePopup(-damage, false, color, { finishing: isFinishing() });
    if (typeof onLocalAttack === 'function') {
      const source = typeof meta?.source === 'string' ? meta.source : 'slash';
      const skillId = typeof meta?.skillId === 'string' ? meta.skillId : '';
      const castId = typeof meta?.castId === 'string' ? meta.castId : '';
      onLocalAttack({
        type: 'damage',
        amount: damage,
        source,
        skillId,
        castId
      });
    }
  }

  function damagePlayer(amount, color = '#ef4444') {
    playerHp.value = Math.max(0, playerHp.value - amount);
    showDamagePopup(-amount, true, color, { finishing: isFinishing() });
  }

  function healPlayer(amount, color = '#22c55e') {
    const heal = Math.max(0, Number(amount));
    if (heal <= 0) return 0;
    const before = playerHp.value;
    const after = Math.min(playerMaxHp.value, before + heal);
    const actual = Math.max(0, after - before);
    if (actual <= 0) return 0;
    playerHp.value = after;
    showDamagePopup(`+${actual}`, true, color, { finishing: isFinishing() });
    return actual;
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

    damageEnemy(battleStats.targetHitDamage, '#ef4444', { source: 'slash' });
    vibrate(20);
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

    const forcedTargetId = typeof getForcedTargetId === 'function' ? getForcedTargetId() : null;
    const forcedTarget = forcedTargetId
      ? directions.find(direction => direction.id === forcedTargetId)
      : null;
    const rnd = forcedTarget ?? directions[Math.floor(Math.random() * directions.length)];
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

    const disableRoundTimer = typeof shouldDisableRoundTimer === 'function' ? shouldDisableRoundTimer() : false;
    timeLeft.value = disableRoundTimer
      ? 0
      : (GAME_CONFIG.firstRoundSeconds - ((currentRound.value - 1) * GAME_CONFIG.secondsLostPerRound));
    gameState.value = 'intro';
    const skipRoundIntro = typeof shouldSkipRoundIntro === 'function' ? shouldSkipRoundIntro() : false;

    if (skipRoundIntro) {
      announcementText.value = '';
      gameState.value = 'playing';
      await spawnTarget(token);
      startTimer(token);
      return;
    }

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

      if (!isPaused.value && gameState.value === 'playing') {
        tickSkillCooldowns(GAME_CONFIG.tickMs / 1000);
      }

      if (gameState.value !== 'playing' || isPaused.value) return;

      const disableRoundTimer = typeof shouldDisableRoundTimer === 'function' ? shouldDisableRoundTimer() : false;
      if (!disableRoundTimer) {
        timeLeft.value -= GAME_CONFIG.tickMs / 1000;
      }

      if (!isPvpMode()) {
        tickEnemyAttackPattern();
        tickEnemySkillPattern();
      }

      if (!disableRoundTimer && timeLeft.value <= 0) {
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

  async function playSkillCinematic({
    skillName = '',
    isEnemyTurn: enemyTurn = false,
    casterSide = 'opponent',
    timelineSync = null
  } = {}, token = runToken.value) {
    if (!isRunActive(token)) return false;
    const shouldMoveLocalAvatar = casterSide === 'local-player';

    if (shouldMoveLocalAvatar) {
      await animatePlayerAvatarOut(token);
      if (!isRunActive(token)) return false;
    }

    await playCutscene(skillName, Boolean(enemyTurn), token, {
      timelineSync
    });
    return isRunActive(token);
  }

  function resetCutsceneLayerState({ clearName = false } = {}) {
    const cutscene = document.getElementById('cutscene-layer');
    if (cutscene) {
      gsap.killTweensOf(cutscene);
      gsap.set(cutscene, { opacity: 0, pointerEvents: 'none' });
      const portrait = cutscene.querySelector('.cutscene-portrait');
      if (portrait) {
        gsap.killTweensOf(portrait);
        gsap.set(portrait, { opacity: 0 });
      }
      const nameText = cutscene.querySelector('.cutscene-skill-name');
      if (nameText) {
        gsap.killTweensOf(nameText);
        gsap.set(nameText, { opacity: 0, x: 0 });
      }
    }
    if (clearName) {
      cutsceneSkillName.value = '';
    }
    activeSyncedCutsceneMeta = null;
  }

  async function playCutsceneExitPhase({
    isEnemy = false,
    exitDurationMs = 0
  } = {}, token = runToken.value) {
    if (!isRunActive(token)) return false;

    const cutscene = document.getElementById('cutscene-layer');
    const portrait = cutscene?.querySelector('.cutscene-portrait');
    const nameText = cutscene?.querySelector('.cutscene-skill-name');
    if (!cutscene || !portrait || !nameText) return isRunActive(token);

    const normalizedExitMs = Number.isFinite(Number(exitDurationMs))
      ? Math.max(120, Math.min(260, Math.round(Number(exitDurationMs))))
      : 0;
    const portraitOutDuration = normalizedExitMs > 0 ? normalizedExitMs / 1000 : 0.35;
    const nameOutDuration = normalizedExitMs > 0
      ? Math.max(0.10, portraitOutDuration * 0.75)
      : 0.24;
    const layerFadeOutDuration = normalizedExitMs > 0
      ? Math.max(0.10, portraitOutDuration * 0.68)
      : 0.22;

    gsap.set(cutscene, { pointerEvents: 'none' });
    const timeline = gsap.timeline();
    timeline.to(
      portrait,
      {
        left: isEnemy ? '130%' : '-35%',
        opacity: 0,
        duration: portraitOutDuration,
        ease: 'power2.in'
      },
      '>-0.02'
    );
    timeline.to(
      nameText,
      {
        x: isEnemy ? -180 : 180,
        opacity: 0,
        duration: nameOutDuration,
        ease: 'power1.in'
      },
      '<'
    );
    timeline.to(cutscene, { opacity: 0, duration: layerFadeOutDuration, pointerEvents: 'none' }, '<0.08');
    await timeline;
    return isRunActive(token);
  }

  async function finishSkillCinematic({
    casterSide = 'opponent',
    exitDurationMs = 0
  } = {}, token = runToken.value) {
    if (!isRunActive(token)) return false;
    const syncedCutscene = activeSyncedCutsceneMeta;
    if (syncedCutscene && isRunActive(token)) {
      const exitAlive = await playCutsceneExitPhase({
        isEnemy: Boolean(syncedCutscene.isEnemyTurn),
        exitDurationMs
      }, token);
      if (!exitAlive) return false;
      activeSyncedCutsceneMeta = null;
    }
    const shouldMoveLocalAvatar = casterSide === 'local-player';

    if (shouldMoveLocalAvatar) {
      await animatePlayerAvatarBack(token);
      if (!isRunActive(token)) return false;
    }

    resetCutsceneLayerState({ clearName: true });
    return true;
  }

  async function useSkill(skill, options = {}) {
    const allowWhenPaused = Boolean(options?.allowWhenPaused);
    if ((isPaused.value && !allowWhenPaused) || isSkillSequenceActive.value || skillPoints.value < skill.cost || gameState.value !== 'playing') return false;
    if (playerDebuff.value === 'cataract') return false;
    if (getCooldownLeft(playerSkillCooldowns, skill.id) > 0) return false;
    const token = runToken.value;
    isSkillSequenceActive.value = true;
    if (timeLeft.value <= 0) pendingRoundAdvance.value = true;
    setPendingCooldown(playerSkillCooldownPending, skill.id, true);

    try {
      skillPoints.value -= skill.cost;
      const cinematicAlive = await playSkillCinematic({
        skillName: skill.name,
        isEnemyTurn: false,
        casterSide: 'local-player'
      }, token);
      if (!cinematicAlive) return false;
      sfx.playSkillCast(skill);

      const skillCastMeta = options && typeof options === 'object' && options.syncMeta && typeof options.syncMeta === 'object'
        ? options.syncMeta
        : null;
      const skillDamageMeta = {
        source: 'skill',
        skillId: skill.id,
        castId: typeof skillCastMeta?.castId === 'string' ? skillCastMeta.castId : ''
      };
      const damageEnemyFromSkill = (amount, color = '#ef4444') => {
        damageEnemy(amount, color, skillDamageMeta);
      };

      const playerUltimateAlive = await runPlayerUltimateEffect(skill, token, {
        enemyDebuff,
        damageEnemy: damageEnemyFromSkill,
        triggerImpactShake,
        vibrate,
        sfx,
        healPlayer,
        waitForRun,
        scheduleTimeout,
        isRunActive,
        runAstigmatismSlash: (nextToken) => runAstigmatismSlash(nextToken, damageEnemyFromSkill)
      });
      if (!playerUltimateAlive) return false;

      const cinematicRestoreAlive = await finishSkillCinematic({
        casterSide: 'local-player'
      }, token);
      if (!cinematicRestoreAlive) return false;

      if (gameState.value !== 'finishing') {
        gameState.value = 'playing';
        setPendingCooldown(playerSkillCooldownPending, skill.id, false);
        startCooldown(playerSkillCooldowns, skill);
      } else {
        setPendingCooldown(playerSkillCooldownPending, skill.id, false);
      }
      if (enemyHp.value <= 0) triggerSlowMotionFinish();
      return true;
    } finally {
      if (isRunActive(token)) {
        setPendingCooldown(playerSkillCooldownPending, skill.id, false);
        isSkillSequenceActive.value = false;
        resolveRoundTransitionIfNeeded(token);
      }
    }
  }

  async function runAstigmatismSlash(token, damageEnemyFn = damageEnemy) {
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
        damageEnemyFn(5, '#facc15');
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
          clearImpactShakeTransforms();
          scheduleTimeout(resolve, 800);
        }
      }, 60);
    });
  }

  async function useEnemyUlt(skillPoolOverride = null) {
    if (isPaused.value || gameState.value !== 'playing') return;
    if (enemyDebuff.value === 'cataract') return;
    const pool = Array.isArray(skillPoolOverride) ? skillPoolOverride : pickEffectiveEnemySkillPool();
    const normalizedPool = Array.isArray(pool) ? pool : enemySkills;
    const availableSkills = normalizedPool.filter(skill => getCooldownLeft(enemySkillCooldowns, skill.id) <= 0);
    if (!availableSkills.length) return;

    const token = runToken.value;
    const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
    isSkillSequenceActive.value = true;
    if (timeLeft.value <= 0) pendingRoundAdvance.value = true;
    try {

      const cinematicAlive = await playSkillCinematic({
        skillName: skill.name,
        isEnemyTurn: true,
        casterSide: 'opponent'
      }, token);
      if (!cinematicAlive) return;
      sfx.playSkillCast(skill);

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

      if (gameState.value !== 'finishing') {
        gameState.value = 'playing';
        startCooldown(enemySkillCooldowns, skill);
      }
      if (playerHp.value <= 0) triggerSlowMotionFinish();
    } finally {
      if (isRunActive(token)) {
        isSkillSequenceActive.value = false;
        resolveRoundTransitionIfNeeded(token);
      }
    }
  }

  async function playCutscene(skillName, isEnemy, token = runToken.value, options = {}) {
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

    const rawSync = options && typeof options === 'object' ? options.timelineSync : null;
    const startAtMs = Number(rawSync?.castStartAtMs);
    const resumeAtMs = Number(rawSync?.resumeAtMs);
    const useSyncedLifecycle = Number.isFinite(startAtMs) || Number.isFinite(resumeAtMs);

    const fadeInDuration = 0.2;
    const portraitInDuration = 0.5;
    const nameInDuration = 0.4;
    const holdDuration = 0.85;

    resetCutsceneLayerState({ clearName: false });

    if (useSyncedLifecycle && Number.isFinite(startAtMs)) {
      const nowMs = Date.now();
      const waitMs = Math.max(0, Math.round(startAtMs - nowMs));
      if (waitMs > 0) {
        const alive = await waitForRun(waitMs, token);
        if (!alive) return;
      }
      if (!isRunActive(token)) return;
    }

    const timeline = gsap.timeline();
    timeline.to(cutscene, { opacity: 1, duration: fadeInDuration, pointerEvents: 'auto' });
    timeline.fromTo(
      portrait,
      { left: isEnemy ? '130%' : '-30%', opacity: 0 },
      { left: isEnemy ? '50%' : '10%', opacity: 1, duration: portraitInDuration, ease: 'back.out(1.2)' }
    );
    timeline.fromTo(
      nameText,
      { x: isEnemy ? -300 : 300, opacity: 0 },
      { x: 0, opacity: 1, duration: nameInDuration },
      '-=0.3'
    );
    if (!useSyncedLifecycle) {
      timeline.to({}, { duration: holdDuration });
      await timeline;
      const exitAlive = await playCutsceneExitPhase({ isEnemy }, token);
      if (!exitAlive) return;
      return;
    }

    await timeline;
    if (!isRunActive(token)) return;
    activeSyncedCutsceneMeta = {
      token,
      isEnemyTurn: Boolean(isEnemy),
      castStartAtMs: Number.isFinite(startAtMs) ? Math.round(startAtMs) : 0,
      resumeAtMs: Number.isFinite(resumeAtMs) ? Math.round(resumeAtMs) : 0
    };
  }

  function applyBattleProgression(stats = {}) {
    const nextPlayerMaxHp = Math.max(120, Math.round(stats.maxHp ?? GAME_CONFIG.maxHp));
    const nextEnemyMaxHp = Math.max(1, Math.round(stats.enemyHp ?? GAME_CONFIG.maxHp));
    const legacyAttackChance = clampNumber(stats.enemyAttackChancePerTick, 0, 1, 0);
    const legacySkillChance = clampNumber(stats.enemyUltChancePerTick, 0, 1, 0);
    const fallbackAttackIntervalMs = legacyAttackChance > 0
      ? Math.max(MIN_ENEMY_ATTACK_INTERVAL_MS, Math.round(GAME_CONFIG.tickMs / legacyAttackChance))
      : 600;
    const fallbackSkillIntervalMs = legacySkillChance > 0
      ? Math.max(MIN_ENEMY_SKILL_CAST_INTERVAL_MS, Math.round(GAME_CONFIG.tickMs / legacySkillChance))
      : 3000;

    playerMaxHp.value = nextPlayerMaxHp;
    enemyMaxHp.value = nextEnemyMaxHp;
    battleStats.maxHp = nextPlayerMaxHp;
    battleStats.targetHitDamage = Math.max(1, Math.round(stats.targetHitDamage ?? GAME_CONFIG.targetHitDamage));
    battleStats.skillPointGainPerHit = Math.max(1, Math.round(stats.skillPointGainPerHit ?? GAME_CONFIG.skillPointGainPerHit));
    battleStats.enemyHp = nextEnemyMaxHp;
    battleStats.enemyDamage = Math.max(1, Math.round(stats.enemyDamage ?? stats.enemyAttackDamage ?? GAME_CONFIG.enemyAttackDamage));
    battleStats.enemyAttackIntervalMs = Math.max(
      MIN_ENEMY_ATTACK_INTERVAL_MS,
      Math.round(stats.enemyAttackIntervalMs ?? fallbackAttackIntervalMs)
    );
    battleStats.enemyAttackIntervalVarianceMs = Math.max(0, Math.round(stats.enemyAttackIntervalVarianceMs ?? 0));
    battleStats.enemyMissRate = clampNumber(stats.enemyMissRate, 0, 0.95, 0);
    battleStats.enemyCriticalRate = clampNumber(stats.enemyCriticalRate, 0, 1, 0);
    battleStats.enemyCriticalMultiplier = Math.max(1, Number(stats.enemyCriticalMultiplier ?? 1));
    battleStats.enemySkillCastIntervalMs = Math.max(
      MIN_ENEMY_SKILL_CAST_INTERVAL_MS,
      Math.round(stats.enemySkillCastIntervalMs ?? fallbackSkillIntervalMs)
    );
    battleStats.enemySkillCastVarianceMs = Math.max(0, Math.round(stats.enemySkillCastVarianceMs ?? 0));
    battleStats.enemySkillCastChance = clampNumber(stats.enemySkillCastChance, 0, 1, legacySkillChance);
    battleStats.enemySkillStartDelayMs = Math.max(0, Math.round(stats.enemySkillStartDelayMs ?? 1200));
  }

  function initGame() {
    const token = bumpRunToken();

    if (typeof getBattleProgression === 'function') {
      applyBattleProgression(getBattleProgression());
    } else {
      applyBattleProgression();
    }
    resetEnemyRhythmSchedulers();

    currentRound.value = 1;
    playerHp.value = playerMaxHp.value;
    enemyHp.value = enemyMaxHp.value;
    combo.value = 0;
    playerTotalHits.value = 0;
    enemyRoundHits.value = 0;
    skillPoints.value = 0;
    playerSkillCooldowns.value = {};
    playerSkillCooldownPending.value = {};
    enemySkillCooldowns.value = {};
    gameState.value = 'intro';
    pendingRoundAdvance.value = false;
    isSkillSequenceActive.value = false;
    playerSkillCooldowns.value = {};
    playerSkillCooldownPending.value = {};
    enemySkillCooldowns.value = {};
    playerDebuff.value = null;
    enemyDebuff.value = null;
    isSplitting.value = false;
    resetCutsceneLayerState({ clearName: true });
    currentTarget.rotation = 0;
    currentTarget.id = 'right';
    clearReticleOffset();
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
    playerSkillCooldownPending.value = {};
    playerSkillCooldowns.value = {};
    enemySkillCooldowns.value = {};
    playerDebuff.value = null;
    enemyDebuff.value = null;
    isSplitting.value = false;
    resetCutsceneLayerState({ clearName: true });
    clearReticleOffset();
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
    sfx.setSfxEnabled(normalized);
  }

  function setBgmEnabled(enabled) {
    const normalized = Boolean(enabled);
    bgmEnabled.value = normalized;
    if (normalized) {
      // On iOS WKWebView, toggling BGM back on should actively re-init + resume.
      sfx.init();
      sfx.setBgmEnabled(true);
      sfx.ensureBgmRunning();
      return;
    }
    sfx.setBgmEnabled(false);
  }

  function setVibrationEnabled(enabled) {
    vibrationEnabled.value = Boolean(enabled);
  }

  function applyRemoteDamage(amount, color = '#ef4444') {
    if (gameState.value === 'gameResult') return;
    const damage = Math.max(0, Number(amount));
    if (damage <= 0) return;
    damagePlayer(damage, color);
    triggerImpactShake(Math.random() * 360, 10);
    vibrate(16);
    sfx.playHit();
    if (playerHp.value <= 0) {
      triggerSlowMotionFinish();
    }
  }

  function applyOpponentDamage(amount, color = '#facc15') {
    if (gameState.value === 'gameResult') return;
    const damage = Math.max(0, Number(amount));
    if (damage <= 0) return;
    enemyHp.value = Math.max(0, enemyHp.value - damage);
    showDamagePopup(-damage, false, color, { finishing: isFinishing() });
    triggerImpactShake(Math.random() * 360, 10);
    vibrate(16);
    sfx.playHit();
    if (enemyHp.value <= 0) {
      triggerSlowMotionFinish();
    }
  }

  function forceOpponentDefeat() {
    if (gameState.value === 'gameResult') return;
    enemyHp.value = 0;
    triggerSlowMotionFinish();
  }

  function setReticleOffset(offset = {}) {
    const nextX = Math.round(Number(offset?.x ?? 0));
    const nextY = Math.round(Number(offset?.y ?? 0));
    currentTarget.offsetX = Number.isFinite(nextX) ? nextX : 0;
    currentTarget.offsetY = Number.isFinite(nextY) ? nextY : 0;
  }

  function clearReticleOffset() {
    currentTarget.offsetX = 0;
    currentTarget.offsetY = 0;
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
    playerSkillCooldowns,
    playerSkillCooldownPending,
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
    reticleOffsetTransform,
    processSlash,
    useSkill,
    initGame,
    stopGame,
    setPaused,
    setAudioVolume,
    setSfxVolume,
    setSfxEnabled,
    setBgmEnabled,
    setVibrationEnabled,
    playSkillCinematic,
    finishSkillCinematic,
    applyOpponentDamage,
    applyRemoteDamage,
    forceOpponentDefeat,
    setReticleOffset,
    clearReticleOffset
  };
}
