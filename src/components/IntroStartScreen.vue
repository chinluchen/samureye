<template>
  <section class="intro-start-screen" aria-label="遊戲開始">
    <img :src="startBgUrl" alt="" class="intro-start-bg" draggable="false">

    <div class="intro-start-content">
      <button type="button" class="intro-start-button pixel-border" @click="$emit('start')">
        遊戲開始
      </button>
    </div>
  </section>
</template>

<script setup>
import startBgUrl from '../assets/images/intro/start-bg.jpg';

defineEmits(['start']);
</script>

<style scoped>
.intro-start-screen {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #000;
  z-index: 9998;
}

.intro-start-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.intro-start-content {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0 20px;
  padding-top: 75dvh;
  background: linear-gradient(
    to top,
    rgba(5, 18, 44, 0.52) 0%,
    rgba(5, 18, 44, 0.18) 36%,
    rgba(5, 18, 44, 0) 62%
  );
}

.intro-start-button {
  min-width: min(320px, calc(100vw - 48px));
  height: 58px;
  border-radius: 12px;
  border-width: 3px;
  background: linear-gradient(180deg, #ffffff 0%, #e8f2ff 100%);
  color: #0f2b5f;
  font-size: clamp(24px, 5.2vw, 32px);
  font-weight: 900;
  letter-spacing: 0.08em;
  text-align: center;
  cursor: pointer;
}

.intro-start-button:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}
</style>
