import { skillPool } from './skillPool.js';

export const enemySkills = skillPool
  .filter(skill => {
    if (skill.bossOnly === true || skill.equipable === false) return false;
    const targetRule = String(skill.targetRule ?? '').trim();
    const effectType = String(skill.effectType ?? '').trim();
    return targetRule === 'opponent' && effectType !== 'heal';
  })
  .map(skill => ({
    id: skill.id,
    name: skill.name,
    icon: skill.icon,
    damage: skill.damage,
    configurable: true
  }));
