<template>
  <section class="intro-screen" aria-label="Samureye 開場動畫">
    <button type="button" class="intro-skip-button" @click="handleSkip">
      Skip
    </button>

    <div v-if="isIntroVisible" class="intro-stage">
      <img
        v-if="currentScene.kind === 'imageText' && (phase === 'image' || phase === 'imageFadeOut') && activeImageSrc"
        :src="activeImageSrc"
        alt=""
        class="intro-image"
        :class="phase === 'image' ? 'intro-image--visible' : 'intro-image--fade-out'"
        draggable="false"
        @load="handleImageLoaded"
        @error="handleImageError"
      />

      <div
        v-if="phase === 'text' || phase === 'textFadeOut'"
        class="intro-caption"
        :class="phase === 'text' ? 'intro-caption--visible' : 'intro-caption--fade-out'"
      >
        {{ currentScene.caption }}
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import scene1WebpUrl from '../assets/images/intro/scene1.webp';
import scene1PngUrl from '../assets/images/intro/scene1.png';
import scene2WebpUrl from '../assets/images/intro/scene2.webp';
import scene2PngUrl from '../assets/images/intro/scene2.png';
import scene3WebpUrl from '../assets/images/intro/scene3.webp';
import scene3PngUrl from '../assets/images/intro/scene3.png';
import scene4WebpUrl from '../assets/images/intro/scene4.webp';
import scene4PngUrl from '../assets/images/intro/scene4.png';

const emit = defineEmits(['skip', 'complete']);

const introScenes = [
  {
    kind: 'imageText',
    image: scene1WebpUrl,
    fallback: scene1PngUrl,
    caption: '視界，原本還算和平...'
  },
  {
    kind: 'imageText',
    image: scene2WebpUrl,
    fallback: scene2PngUrl,
    caption: '直到眼睛怪物開始四處作亂...'
  },
  {
    kind: 'imageText',
    image: scene3WebpUrl,
    fallback: scene3PngUrl,
    caption: '正規軍團試圖反擊...'
  },
  {
    kind: 'imageText',
    image: scene4WebpUrl,
    fallback: scene4PngUrl,
    caption: '但他們好像……不太行?!'
  },
  {
    kind: 'textOnly',
    caption: '剩下你！'
  },
  {
    kind: 'textOnly',
    caption: '最後的...'
  },
  {
    kind: 'textOnly',
    caption: 'SAMUREYE'
  }
];

const IMAGE_DURATION_MS = 1800;
const IMAGE_FADE_OUT_MS = 500;
const TEXT_DURATION_MS = 2200;
const TEXT_FADE_OUT_MS = 500;

const sceneIndex = ref(0);
const phase = ref('image');
const isIntroVisible = ref(false);
const activeImageSrc = ref('');
const fallbackUsed = ref(false);
const timerHandles = new Set();
let isFinishing = false;

const currentScene = computed(() => introScenes[sceneIndex.value] ?? introScenes[introScenes.length - 1]);

function schedule(callback, delayMs) {
  const handle = setTimeout(() => {
    timerHandles.delete(handle);
    callback();
  }, delayMs);
  timerHandles.add(handle);
  return handle;
}

function clearAllTimers() {
  timerHandles.forEach((handle) => clearTimeout(handle));
  timerHandles.clear();
}

function finishIntro() {
  if (isFinishing) return;
  isFinishing = true;
  clearAllTimers();
  console.info('[Intro] completed, enter home');
  emit('complete');
}

function goNextScene() {
  if (isFinishing) return;
  const nextIndex = sceneIndex.value + 1;

  if (nextIndex >= introScenes.length) {
    finishIntro();
    return;
  }

  console.info('[Intro] next scene:', nextIndex);
  sceneIndex.value = nextIndex;
  configureImageSourceForCurrentScene();
  startScenePlayback();
}

function configureImageSourceForCurrentScene() {
  const scene = currentScene.value;

  if (scene.kind !== 'imageText') {
    activeImageSrc.value = '';
    fallbackUsed.value = false;
    return;
  }

  activeImageSrc.value = scene.image;
  fallbackUsed.value = false;
  console.info('[Intro] loading scene:', scene.image);
}

function startImageTextFlow(indexAtStart) {
  console.info('[Intro] scene image shown:', indexAtStart);
  phase.value = 'image';

  schedule(() => {
    if (isFinishing || sceneIndex.value !== indexAtStart) return;
    console.info('[Intro] scene image fade out:', indexAtStart);
    phase.value = 'imageFadeOut';
  }, IMAGE_DURATION_MS);

  schedule(() => {
    if (isFinishing || sceneIndex.value !== indexAtStart) return;
    console.info('[Intro] scene text shown:', indexAtStart);
    phase.value = 'text';
  }, IMAGE_DURATION_MS + IMAGE_FADE_OUT_MS);

  schedule(() => {
    if (isFinishing || sceneIndex.value !== indexAtStart) return;
    console.info('[Intro] scene text fade out:', indexAtStart);
    phase.value = 'textFadeOut';
  }, IMAGE_DURATION_MS + IMAGE_FADE_OUT_MS + TEXT_DURATION_MS);

  schedule(() => {
    if (isFinishing || sceneIndex.value !== indexAtStart) return;
    goNextScene();
  }, IMAGE_DURATION_MS + IMAGE_FADE_OUT_MS + TEXT_DURATION_MS + TEXT_FADE_OUT_MS);
}

function startTextOnlyFlow(indexAtStart) {
  console.info('[Intro] text-only scene shown:', indexAtStart);
  phase.value = 'text';

  schedule(() => {
    if (isFinishing || sceneIndex.value !== indexAtStart) return;
    console.info('[Intro] text-only scene fade out:', indexAtStart);
    phase.value = 'textFadeOut';
  }, TEXT_DURATION_MS);

  schedule(() => {
    if (isFinishing || sceneIndex.value !== indexAtStart) return;
    goNextScene();
  }, TEXT_DURATION_MS + TEXT_FADE_OUT_MS);
}

function startScenePlayback() {
  if (!isIntroVisible.value || isFinishing) return;
  clearAllTimers();

  const indexAtStart = sceneIndex.value;
  const scene = currentScene.value;

  if (scene.kind === 'imageText') {
    startImageTextFlow(indexAtStart);
    return;
  }

  startTextOnlyFlow(indexAtStart);
}

function handleImageLoaded() {
  console.info('[Intro] image loaded:', activeImageSrc.value);
}

function handleImageError() {
  if (isFinishing) return;

  const scene = currentScene.value;
  if (scene.kind !== 'imageText') return;

  if (!fallbackUsed.value && scene.fallback) {
    console.warn('[Intro] WebP failed, fallback to PNG:', scene.image);
    fallbackUsed.value = true;
    activeImageSrc.value = scene.fallback;
    return;
  }

  console.warn('[Intro] image failed, continue to text:', scene.image);
  clearAllTimers();

  const indexAtStart = sceneIndex.value;
  console.info('[Intro] scene text shown:', indexAtStart);
  phase.value = 'text';

  schedule(() => {
    if (isFinishing || sceneIndex.value !== indexAtStart) return;
    console.info('[Intro] scene text fade out:', indexAtStart);
    phase.value = 'textFadeOut';
  }, TEXT_DURATION_MS);

  schedule(() => {
    if (isFinishing || sceneIndex.value !== indexAtStart) return;
    goNextScene();
  }, TEXT_DURATION_MS + TEXT_FADE_OUT_MS);
}

async function preloadImageSource(src) {
  if (!src) return false;
  return await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

async function preloadFirstSceneImage() {
  const firstScene = introScenes[0];
  if (!firstScene || firstScene.kind !== 'imageText') return true;

  console.info('[Intro] loading scene:', firstScene.image);
  const webpLoaded = await preloadImageSource(firstScene.image);
  if (webpLoaded) {
    activeImageSrc.value = firstScene.image;
    fallbackUsed.value = false;
    return true;
  }

  console.warn('[Intro] WebP failed, fallback to PNG:', firstScene.image);

  if (!firstScene.fallback) return false;
  const pngLoaded = await preloadImageSource(firstScene.fallback);
  if (pngLoaded) {
    activeImageSrc.value = firstScene.fallback;
    fallbackUsed.value = true;
    return true;
  }

  console.warn('[Intro] image failed, skip scene:', firstScene.image);
  return false;
}

function handleSkip() {
  if (isFinishing) return;
  isFinishing = true;
  clearAllTimers();
  console.info('[Intro] skipped by user');
  emit('skip');
}

onMounted(async () => {
  console.info('[Intro] start');

  const firstSceneReady = await preloadFirstSceneImage();
  if (isFinishing) return;

  if (!firstSceneReady) {
    finishIntro();
    return;
  }

  isIntroVisible.value = true;
  configureImageSourceForCurrentScene();
  startScenePlayback();
});

onBeforeUnmount(() => {
  isFinishing = true;
  clearAllTimers();
});
</script>

<style scoped>
.intro-screen {
  position: fixed;
  inset: 0;
  background: #000;
  overflow: hidden;
  z-index: 9999;
}

.intro-stage {
  position: absolute;
  inset: 0;
}

.intro-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.intro-image--visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 500ms ease;
}

.intro-image--fade-out {
  opacity: 0;
  visibility: hidden;
  transition: opacity 500ms ease, visibility 0s linear 500ms;
}

.intro-caption {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(86vw, 720px);
  color: #fff;
  font-size: clamp(24px, 5vw, 48px);
  font-weight: 800;
  line-height: 1.5;
  text-align: center;
  letter-spacing: 0.04em;
  text-shadow: 0 3px 18px rgba(0, 0, 0, 0.9);
  z-index: 3;
}

.intro-caption--visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 500ms ease;
}

.intro-caption--fade-out {
  opacity: 0;
  visibility: hidden;
  transition: opacity 500ms ease, visibility 0s linear 500ms;
}

.intro-skip-button {
  position: absolute;
  top: calc(16px + var(--safe-top, 0px));
  right: max(14px, env(safe-area-inset-right));
  z-index: 10;
  padding: 9px 14px;
  min-width: 72px;
  border: 1px solid rgba(191, 219, 254, 0.75);
  border-radius: 999px;
  background: rgba(2, 6, 23, 0.56);
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 120ms ease, background-color 180ms ease;
}

.intro-skip-button:active {
  transform: translateY(1px) scale(0.98);
}
</style>
