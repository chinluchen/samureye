import { onBeforeUnmount, onMounted } from 'vue';
import { GAME_CONFIG } from '../data/gameConfig.js';
import { directionFromSwipe } from '../data/directions.js';
import { sfx } from '../services/SoundEngine.js';
import { drawSlashLine } from '../utils/effects.js';

export function useSwipeControls({ gameState, playerDebuff, isPaused, processSlash }) {
  let touchStartPos = { x: 0, y: 0 };
  let isSwiping = false;

  function onTouchStart(event) {
    sfx.init();

    if (gameState.value !== 'playing' || isPaused.value || playerDebuff.value === 'cataract') return;
    if (event.target.closest('button')) return;

    touchStartPos = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
    isSwiping = true;
  }

  function onTouchMove(event) {
    if (!isSwiping || isPaused.value) return;

    const dx = event.touches[0].clientX - touchStartPos.x;
    const dy = event.touches[0].clientY - touchStartPos.y;

    if (Math.sqrt(dx * dx + dy * dy) <= GAME_CONFIG.swipeThresholdPx) return;

    isSwiping = false;

    const direction = directionFromSwipe(dx, dy);
    const endX = event.touches[0].clientX;
    const endY = event.touches[0].clientY;

    sfx.playSlash();
    drawSlashLine(touchStartPos.x, touchStartPos.y, endX, endY, {
      finishing: gameState.value === 'finishing'
    });
    processSlash(direction.id, endX, endY);
  }

  function stopSwipe() {
    isSwiping = false;
  }

  onMounted(() => {
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', stopSwipe, { passive: false });
    window.addEventListener('touchcancel', stopSwipe, { passive: false });
  });

  onBeforeUnmount(() => {
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', stopSwipe);
    window.removeEventListener('touchcancel', stopSwipe);
  });
}
