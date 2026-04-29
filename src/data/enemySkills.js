import { skillPool } from './skillPool.js';

export const enemySkills = skillPool
  .filter(skill => skill.bossOnly !== true && skill.equipable !== false)
  .map(skill => ({
    id: skill.id,
    name: skill.name,
    icon: skill.icon,
    damage: skill.damage,
    configurable: true
  }));
