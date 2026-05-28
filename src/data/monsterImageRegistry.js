const monsterImageModules = import.meta.glob('../assets/images/monsters/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default'
});

function toBaseName(path = '') {
  const normalized = String(path || '').trim().replace(/\\/g, '/');
  if (!normalized) return '';
  const pieces = normalized.split('/');
  return String(pieces[pieces.length - 1] || '').trim();
}

const monsterImageByName = Object.freeze(
  Object.entries(monsterImageModules).reduce((acc, [path, moduleUrl]) => {
    const baseName = toBaseName(path);
    if (!baseName) return acc;
    const value = String(moduleUrl || '').trim();
    if (!value) return acc;
    acc[baseName] = value;
    return acc;
  }, {})
);

export function resolveMonsterImageUrl(fileName = '') {
  const baseName = toBaseName(fileName);
  if (!baseName) return '';
  return monsterImageByName[baseName] || '';
}

export function getMonsterImageRegistrySnapshot() {
  return { ...monsterImageByName };
}
