import { MockMatchProvider } from './providers/mockMatchProvider.js';
import { GameCenterProvider } from './providers/gameCenterProvider.js';

function detectPlatform() {
  if (typeof window === 'undefined') return 'web';
  const platform = window.Capacitor?.getPlatform?.();
  if (platform) return platform;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios-web' : 'web';
}

function createProvider(platform) {
  if (platform === 'ios') {
    return new GameCenterProvider();
  }
  return new MockMatchProvider();
}

export function createMatchService() {
  const platform = detectPlatform();
  const provider = createProvider(platform);
  return {
    platform,
    providerName: provider.getCapabilities().provider,
    init: () => provider.init(),
    subscribe: (listener) => provider.subscribe(listener),
    signIn: (payload = {}) => provider.signIn(payload),
    startMatchmaking: (payload = {}) => provider.startMatchmaking(payload),
    cancelMatchmaking: () => provider.cancelMatchmaking(),
    destroy: () => provider.destroy(),
    getCapabilities: () => provider.getCapabilities()
  };
}
