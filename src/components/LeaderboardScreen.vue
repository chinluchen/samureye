<template>
  <section class="leaderboard-screen">
    <header class="settings-header">
      <button type="button" class="study-back-btn pixel-border" @click="$emit('back-home')">返回</button>
      <h2 class="settings-title">天梯排行</h2>
      <div class="settings-account">Beta</div>
    </header>

    <article class="settings-card pixel-border leaderboard-card">
      <h3 class="settings-section-title">即將開放</h3>
      <p class="leaderboard-note">這裡會顯示全服排名、好友排行與你的積分變化。</p>
      <div class="leaderboard-placeholder-list">
        <div class="leaderboard-row">
          <span class="leaderboard-rank">#1</span>
          <span class="leaderboard-name">Master HOU</span>
          <span class="leaderboard-score">2480</span>
        </div>
        <div class="leaderboard-row">
          <span class="leaderboard-rank">#2</span>
          <span class="leaderboard-name">SAMUREYE</span>
          <span class="leaderboard-score">2310</span>
        </div>
        <div class="leaderboard-row">
          <span class="leaderboard-rank">#3</span>
          <span class="leaderboard-name">Player</span>
          <span class="leaderboard-score">2190</span>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup>
defineEmits(['back-home']);
</script>
