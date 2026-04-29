import { skillPool } from './skillPool.js';

export const skills = skillPool
  .filter(skill => skill.equipable !== false && skill.bossOnly !== true)
  .map(skill => ({
    id: skill.id,
    name: skill.name,
    icon: skill.icon,
    cost: skill.cost,
    cooldownSec: skill.cooldownSec,
    damage: skill.damage,
    configurable: true
  }));
