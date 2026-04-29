export async function runPlayerUltimateEffect(skill, token, ctx) {
  if (skill.id === 'cataract') {
    ctx.enemyDebuff.value = 'cataract';
    const alive = await ctx.waitForRun(500, token);
    if (!alive) return false;

    ctx.scheduleTimeout(() => {
      if (!ctx.isRunActive(token)) return;
      if (ctx.enemyDebuff.value) {
        ctx.enemyDebuff.value = null;
      }
    }, 3000);
    return true;
  }

  if (skill.id === 'dilation') {
    ctx.damageEnemy(140, '#facc15');
    ctx.triggerImpactShake(0, 45, 0.1);
    ctx.vibrate([18, 18, 18]);
    ctx.sfx.playHit();
    return ctx.waitForRun(1200, token);
  }

  if (skill.id === 'astig') {
    await ctx.runAstigmatismSlash(token);
    return ctx.isRunActive(token);
  }

  if (skill.id === 'glaucoma') {
    ctx.damageEnemy(95, '#86efac');
    ctx.triggerImpactShake(0, 52, 0.12);
    ctx.vibrate([16, 24, 16]);
    ctx.sfx.playHit();
    return ctx.waitForRun(1000, token);
  }

  if (skill.id === 'macular') {
    ctx.damageEnemy(130, '#fca5a5');
    ctx.triggerImpactShake(0, 58, 0.12);
    ctx.vibrate([20, 24, 20]);
    ctx.sfx.playHit();
    return ctx.waitForRun(1150, token);
  }

  if (Number(skill.damage) > 0) {
    ctx.damageEnemy(skill.damage, '#facc15');
    ctx.triggerImpactShake(0, 42, 0.1);
    ctx.vibrate([14, 16, 14]);
    ctx.sfx.playHit();
    return ctx.waitForRun(950, token);
  }

  return true;
}

export async function runEnemyUltimateEffect(skill, token, ctx) {
  if (skill.id === 'cataract') {
    ctx.playerDebuff.value = 'cataract';
    ctx.showCataractMist();
    ctx.scheduleTimeout(() => {
      if (!ctx.isRunActive(token)) return;
      if (ctx.playerDebuff.value) {
        ctx.fadeOutCataractMist(() => {
          if (!ctx.isRunActive(token)) return;
          ctx.playerDebuff.value = null;
        });
      }
    }, 3000);
  } else {
    ctx.triggerImpactShake(0, 50, 0.12);
    ctx.vibrate([14, 20, 14]);
  }

  ctx.damagePlayer(skill.damage, '#facc15');
  ctx.sfx.playHit();
  return ctx.waitForRun(1200, token);
}
