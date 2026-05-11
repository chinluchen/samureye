import { Preferences } from '@capacitor/preferences';

function getLocalStorageSafe() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function getFromPreferences(key) {
  const { value } = await Preferences.get({ key });
  return value;
}

async function setToPreferences(key, value) {
  await Preferences.set({ key, value });
}

export const appStorage = {
  async getItem(key) {
    const value = await getFromPreferences(key);
    if (value !== null) return value;

    const localStorage = getLocalStorageSafe();
    if (!localStorage) return null;
    return localStorage.getItem(key);
  },

  async setItem(key, value) {
    const normalized = String(value ?? '');
    await setToPreferences(key, normalized);

    // Keep localStorage mirrored for web fallback/dev convenience.
    const localStorage = getLocalStorageSafe();
    if (!localStorage) return;
    localStorage.setItem(key, normalized);
  },

  async removeItem(key) {
    await Preferences.remove({ key });
    const localStorage = getLocalStorageSafe();
    if (!localStorage) return;
    localStorage.removeItem(key);
  },

  async migrateKeysFromLocalStorage(keys = []) {
    const localStorage = getLocalStorageSafe();
    if (!localStorage || !Array.isArray(keys) || keys.length === 0) return [];

    const migrated = [];
    for (const key of keys) {
      const localValue = localStorage.getItem(key);
      if (localValue === null) continue;

      const { value: prefValue } = await Preferences.get({ key });
      if (prefValue !== null) continue;

      await Preferences.set({
        key,
        value: localValue
      });
      migrated.push(key);
    }

    return migrated;
  }
};
