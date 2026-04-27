import { gsap } from 'gsap';

function generateOrganicBladePath() {
  const rand = (min, max) => Math.random() * (max - min) + min;
  const points = ['0% 50%'];

  for (let i = 1; i <= 5; i++) {
    points.push(`${rand(i * 15, (i + 1) * 15)}% ${rand(0, 45)}%`);
  }

  points.push('100% 50%');

  for (let i = 5; i >= 1; i--) {
    points.push(`${rand(i * 15, (i + 1) * 15)}% ${rand(55, 100)}%`);
  }

  return `polygon(${points.join(', ')})`;
}

export function triggerImpactShake(angleDeg = 0, power = 18, duration = 0.05) {
  const app = document.getElementById('app-shell');
  if (!app) return;

  const rad = angleDeg * Math.PI / 180;

  gsap.killTweensOf(app);
  gsap.to(app, {
    x: Math.cos(rad) * power,
    y: Math.sin(rad) * power,
    duration,
    yoyo: true,
    repeat: 1,
    onComplete: () => {
      gsap.set(app, { x: 0, y: 0, clearProps: 'transform' });
    }
  });
}

export function drawSlashLine(x1, y1, x2, y2, { finishing = false, muteShake = false } = {}) {
  const fxLayer = document.getElementById('fx-layer');
  if (!fxLayer) return;

  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  const line = document.createElement('div');

  line.className = 'slash-line';
  line.style.width = `${dist * 5}px`;
  line.style.left = `${x1}px`;
  line.style.top = `${y1}px`;
  line.style.transform = `rotate(${angle}deg)`;
  line.style.clipPath = generateOrganicBladePath();
  fxLayer.appendChild(line);

  const scale = finishing ? 2.5 : 1;
  const timeline = gsap.timeline();

  timeline.to(line, { opacity: 1, duration: 0.05 * scale });
  timeline.to(line, {
    opacity: 0,
    scaleY: 0.1,
    width: `+=${dist * 4}`,
    x: Math.cos(angle * Math.PI / 180) * 200,
    y: Math.sin(angle * Math.PI / 180) * 200,
    duration: 0.45 * scale,
    delay: 0.1 * scale,
    ease: 'expo.out',
    onComplete: () => line.remove()
  });

  if (!muteShake) {
    triggerImpactShake(angle, finishing ? 35 : 18);
  }
}

export function showDamagePopup(amount, isPlayer, color = '#ef4444', { finishing = false } = {}) {
  const fxLayer = document.getElementById('fx-layer');
  const anchor = document.getElementById(isPlayer ? 'player-hp-anchor' : 'enemy-hp-anchor');

  if (!fxLayer || !anchor) return;

  const rect = anchor.getBoundingClientRect();
  const popup = document.createElement('div');
  popup.className = 'damage-popup';
  popup.innerText = amount;
  popup.style.color = color;
  popup.style.left = `${rect.left + rect.width / 2}px`;
  popup.style.top = `${rect.top - 30}px`;
  fxLayer.appendChild(popup);

  const moveY = isPlayer ? -200 : 200;
  const scaleFactor = finishing ? 3 : 1;
  const timeline = gsap.timeline({ onComplete: () => popup.remove() });

  gsap.set(popup, { xPercent: -50 });
  timeline
    .fromTo(
      popup,
      { opacity: 0, scale: 0.6, y: 0, x: 0 },
      { opacity: 1, scale: 1.4, duration: 0.2 * scaleFactor, ease: 'back.out(3)' }
    )
    .to(popup, {
      x: (Math.random() - 0.5) * 70,
      y: moveY,
      opacity: 0,
      duration: 1.1 * scaleFactor,
      ease: 'sine.out'
    });
}

export function showFeedbackPop(msg, color, x, y) {
  const fxLayer = document.getElementById('fx-layer');
  if (!fxLayer) return;

  const el = document.createElement('div');
  el.className = 'feedback-pop';
  el.innerText = msg;
  el.style.color = color;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  fxLayer.appendChild(el);

  gsap.set(el, { xPercent: -50, yPercent: -50 });
  gsap.fromTo(
    el,
    { scale: 0, rotation: -20, opacity: 0 },
    { scale: 1.3, rotation: 5, y: -90, opacity: 1, duration: 0.3, ease: 'back.out(2.5)' }
  );
  gsap.to(el, {
    opacity: 0,
    y: -150,
    duration: 0.8,
    delay: 0.4,
    ease: 'power2.in',
    onComplete: () => el.remove()
  });
}

export function triggerSplitEffect(rect, rotation, { finishing = false } = {}) {
  const fxLayer = document.getElementById('fx-layer');
  if (!fxLayer) return;

  const container = document.createElement('div');
  container.className = 'split-shard-container';
  container.style.left = `${rect.left}px`;
  container.style.top = `${rect.top}px`;
  container.style.transform = `rotate(${rotation}deg)`;
  fxLayer.appendChild(container);

  ['top', 'bottom'].forEach(pos => {
    const half = document.createElement('div');
    const moveY = pos === 'top' ? -400 : 400;
    const scale = finishing ? 4 : 1;

    half.className = `shard-half shard-${pos}`;
    half.innerHTML = '<div class="shard-circle"></div>';
    container.appendChild(half);

    gsap.to(half, {
      y: moveY,
      x: (Math.random() - 0.5) * 300,
      rotation: (Math.random() - 0.5) * 450,
      opacity: 0,
      duration: 1 * scale,
      ease: 'power3.out',
      onComplete: () => {
        if (pos === 'bottom') container.remove();
      }
    });
  });
}

export function hideCataractMist() {
  gsap.set('#cataract-mist-layer', { opacity: 0 });
}

export function showCataractMist() {
  gsap.to('#cataract-mist-layer', { opacity: 1, duration: 0.3 });
}

export function fadeOutCataractMist(onComplete) {
  gsap.to('#cataract-mist-layer', { opacity: 0, duration: 0.5, onComplete });
}
