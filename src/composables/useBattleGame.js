import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { gsap } from 'gsap';
import { GAME_CONFIG } from '../data/gameConfig.js';
import { directions } from '../data/directions.js';
import { enemySkills } from '../data/enemySkills.js';
import { sfx } from '../services/SoundEngine.js';
import { wait } from '../utils/wait.js';
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

export function useBattleGame() {
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
  const isSplitting = ref(false);
  const isEnemyTurn = ref(false);
  const cutsceneSkillName = ref('');
  const currentTarget = reactive({ rotation: 0, id: 'right' });
  const targetTransform = computed(() => ({ transform: `rotate(${currentTarget.rotation}deg)` }));

  let timerInterval = null;

  function isFinishing() {
    return gameState.value === 'finishing';
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

    clearInterval(timerInterval);
    gameState.value = 'finishing';
    sfx.playUlt();
    setTimeout(() => {
      gameState.value = 'gameResult';
    }, 3000);
  }

  function processSlash(dirId, x, y) {
    if (gameState.value !== 'playing') return;

    if (dirId !== currentTarget.id) {
      combo.value = 0;
      showFeedbackPop('誤', '#ef4444', x, y);
      triggerImpactShake(0, 25);
      sfx.playHit();
      return;
    }

    playerTotalHits.value++;
    combo.value++;
    skillPoints.value = Math.min(100, skillPoints.value + GAME_CONFIG.skillPointGainPerHit);

    const targetEl = document.getElementById('target-anchor');
    const rect = targetEl ? targetEl.getBoundingClientRect() : null;

    damageEnemy(GAME_CONFIG.targetHitDamage);
    sfx.playHit();

    if (rect) {
      triggerSplitEffect(rect, currentTarget.rotation, { finishing: isFinishing() });
    }

    isSplitting.value = true;

    if (enemyHp.value <= 0) {
      triggerSlowMotionFinish();
      return;
    }

    setTimeout(() => {
      isSplitting.value = false;
      spawnTarget();
    }, 80);
  }

  async function spawnTarget() {
    const rnd = directions[Math.floor(Math.random() * directions.length)];
    currentTarget.rotation = rnd.deg;
    currentTarget.id = rnd.id;

    await nextTick();

    gsap.fromTo(
      '#target-anchor',
      { scale: 0, opacity: 0, rotation: rnd.deg + 45 },
      { scale: 1, opacity: 1, rotation: rnd.deg, duration: 0.45, ease: 'elastic.out(1, 0.6)' }
    );
  }

  async function runAnnouncement(text, duration) {
    announcementText.value = text;
    await nextTick();

    const el = document.getElementById('round-announcement');
    if (el) {
      gsap.fromTo(
        el,
        { scale: 0.5, opacity: 0, rotation: -8 },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.2)' }
      );
    }

    await wait(duration);

    if (el) {
      await gsap.to(el, { scale: 1.4, opacity: 0, duration: 0.35, ease: 'expo.in' });
    }

    announcementText.value = '';
  }

  async function startNewRound() {
    playerDebuff.value = null;
    enemyDebuff.value = null;
    isSplitting.value = false;
    enemyRoundHits.value = 0;
    hideCataractMist();

    if (gameState.value === 'gameResult' || gameState.value === 'finishing') return;

    timeLeft.value = GAME_CONFIG.firstRoundSeconds - ((currentRound.value - 1) * GAME_CONFIG.secondsLostPerRound);
    gameState.value = 'intro';

    await runAnnouncement(`第 ${currentRound.value} 回`, 1200);
    await runAnnouncement('準備', 1000);
    await runAnnouncement('斬！', 800);

    gameState.value = 'playing';
    spawnTarget();
    startTimer();
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      if (gameState.value !== 'playing') return;

      timeLeft.value -= GAME_CONFIG.tickMs / 1000;

      if (Math.random() < GAME_CONFIG.enemyAttackChancePerTick && !enemyDebuff.value) {
        enemyRoundHits.value++;
        damagePlayer(GAME_CONFIG.enemyAttackDamage);
        triggerImpactShake(Math.random() * 360, 10);
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

        if (currentRound.value < GAME_CONFIG.totalRounds) {
          currentRound.value++;
          startNewRound();
        } else {
          triggerSlowMotionFinish();
        }
      }
    }, GAME_CONFIG.tickMs);
  }

  async function useSkill(skill) {
    if (skillPoints.value < skill.cost || gameState.value !== 'playing') return;

    skillPoints.value -= skill.cost;
    await playCutscene(skill.name, false);
    sfx.playUlt();

    if (skill.id === 'cataract') {
      enemyDebuff.value = 'cataract';
      await wait(500);
      setTimeout(() => {
        if (enemyDebuff.value) enemyDebuff.value = null;
      }, 3000);
    }

    if (skill.id === 'dilation') {
      damageEnemy(140, '#facc15');
      triggerImpactShake(0, 45, 0.1);
      sfx.playHit();
      await wait(1200);
    }

    if (skill.id === 'astig') {
      await runAstigmatismSlash();
    }

    if (gameState.value !== 'finishing') gameState.value = 'playing';
    if (enemyHp.value <= 0) triggerSlowMotionFinish();
  }

  async function runAstigmatismSlash() {
    await new Promise(resolve => {
      let count = 0;
      const interval = setInterval(() => {
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

        count++;
        if (enemyHp.value <= 0 || count >= 15) {
          clearInterval(interval);
          gsap.set('#app-shell', { x: 0, y: 0, clearProps: 'transform' });
          setTimeout(resolve, 800);
        }
      }, 60);
    });
  }

  async function useEnemyUlt() {
    const skill = enemySkills[Math.floor(Math.random() * enemySkills.length)];

    await playCutscene(skill.name, true);
    sfx.playUlt();

    if (skill.id === 'cataract') {
      playerDebuff.value = 'cataract';
      showCataractMist();
      setTimeout(() => {
        if (playerDebuff.value) {
          fadeOutCataractMist(() => {
            playerDebuff.value = null;
          });
        }
      }, 3000);
    } else {
      triggerImpactShake(0, 50, 0.12);
    }

    damagePlayer(skill.damage, '#facc15');
    sfx.playHit();
    await wait(1200);

    if (gameState.value !== 'finishing') gameState.value = 'playing';
    if (playerHp.value <= 0) triggerSlowMotionFinish();
  }

  async function playCutscene(skillName, isEnemy) {
    gameState.value = 'skillCutscene';
    isEnemyTurn.value = isEnemy;
    cutsceneSkillName.value = skillName;

    await nextTick();

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
    if (timerInterval) clearInterval(timerInterval);

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
    hideCataractMist();
    startNewRound();
  }

  onMounted(initGame);

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
    isSplitting,
    isEnemyTurn,
    cutsceneSkillName,
    currentTarget,
    targetTransform,
    processSlash,
    useSkill,
    initGame
  };
}
