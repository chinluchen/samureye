import samuAvatarUrl from '../image/characters/samurai.runtime.webp';
import samuCutsceneFrontUrl from '../image/characters/samu-q-front.runtime.webp';
import hanaAvatarUrl from '../image/characters/hana.runtime.webp';
import hanaCutsceneFrontUrl from '../image/characters/hana-q-front.runtime.webp';
import hanaCutsceneBackUrl from '../image/characters/hana-q-back.runtime.webp';

export const characters = [
  {
    id: 'samureye',
    name: 'SAMUREYE',
    avatarUrl: samuAvatarUrl,
    cutsceneFrontUrl: samuCutsceneFrontUrl,
    description: '均衡型。適合目前關卡模式。'
  },
  {
    id: 'hana',
    name: 'HANA',
    avatarUrl: hanaAvatarUrl,
    cutsceneFrontUrl: hanaCutsceneFrontUrl,
    cutsceneBackUrl: hanaCutsceneBackUrl,
    description: '精準型。擅長節奏型連擊。'
  }
];
