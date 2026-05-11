import { GameCenterBridge } from '../nativeGameCenterBridge.js';

function toDisplayName(value, fallback = 'Game Center 玩家') {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function resolveLocalProfile(player = {}) {
  return {
    id: player.id ?? '',
    gameCenterId: player.gameCenterId ?? '',
    displayName: toDisplayName(player.displayName),
    avatarEmoji: '🎮'
  };
}

function resolveOpponentProfile(raw = {}) {
  return {
    id: raw.id ?? 'pending-opponent',
    gameCenterId: raw.gameCenterId ?? '',
    displayName: toDisplayName(raw.displayName, '對手連線中'),
    avatarEmoji: raw.avatarEmoji ?? '🥷'
  };
}

function resolveErrorMessage(error, fallback) {
  const msg = String(error?.message ?? '').trim();
  if (msg) return msg;
  return fallback;
}

function isCancelledError(error) {
  const code = String(error?.code ?? '').toLowerCase();
  const message = String(error?.message ?? '').toLowerCase();
  return code.includes('cancel') || message.includes('cancel') || message.includes('取消');
}

export class GameCenterProvider {
  constructor() {
    this.listeners = new Set();
    this.tickTimer = null;
    this.queueStartedAt = null;
    this.matchRequestToken = 0;
    this.nativeMatchStateListener = null;
    this.authPromise = null;
    this.state = {
      provider: 'gamecenter',
      phase: 'auth_required',
      message: '請先同步 Game Center 帳號。',
      queueSeconds: 0,
      localProfile: {
        id: '',
        gameCenterId: '',
        displayName: 'Game Center 玩家',
        avatarEmoji: '🎮'
      },
      opponentProfile: null,
      errorMessage: ''
    };
  }

  getCapabilities() {
    return {
      provider: 'gamecenter',
      platform: 'ios',
      requiresNativeBridge: true,
      supportsGameCenter: true,
      canUseCustomDisplayName: false
    };
  }

  async init() {
    await this.bindNativeListeners();
    await this.refreshLocalPlayer();
    this.emit();
    return this.getCapabilities();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState() {
    return { ...this.state };
  }

  emit() {
    const snapshot = this.getState();
    this.listeners.forEach(listener => listener(snapshot));
  }

  async bindNativeListeners() {
    if (this.nativeMatchStateListener) return;
    try {
      this.nativeMatchStateListener = await GameCenterBridge.addListener('matchStateChange', (payload) => {
        this.applyNativeMatchState(payload);
      });
    } catch {
      // Listener is optional for this MVP.
    }
  }

  applyNativeMatchState(payload = {}) {
    const phase = payload.phase;
    if (!phase) return;

    if (phase === 'searching') {
      this.state.phase = 'searching';
      this.state.message = payload.message || '正在搜尋對手...';
      this.state.errorMessage = '';
      this.state.opponentProfile = null;
      this.queueStartedAt = Date.now();
      this.startQueueTick();
      this.emit();
      return;
    }

    if (phase === 'matched') {
      this.stopQueueTick();
      this.state.phase = 'matched';
      this.state.message = payload.message || '配對成功，準備進入對戰。';
      this.state.opponentProfile = resolveOpponentProfile(payload.opponentProfile);
      this.state.errorMessage = '';
      this.emit();
      return;
    }

    if (phase === 'idle') {
      this.stopQueueTick();
      this.state.phase = 'idle';
      this.state.message = payload.message || '已取消配對。';
      this.state.errorMessage = '';
      this.state.opponentProfile = null;
      this.emit();
      return;
    }

    if (phase === 'error') {
      this.stopQueueTick();
      this.state.phase = 'error';
      this.state.message = payload.message || '配對流程發生錯誤。';
      this.state.errorMessage = payload.errorMessage || '';
      this.emit();
    }
  }

  startQueueTick() {
    this.clearQueueTick();
    this.tickTimer = setInterval(() => {
      this.syncQueueSeconds();
      this.emit();
    }, 250);
  }

  clearQueueTick() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  stopQueueTick() {
    this.clearQueueTick();
    this.queueStartedAt = null;
    this.state.queueSeconds = 0;
  }

  syncQueueSeconds() {
    if (!this.queueStartedAt) {
      this.state.queueSeconds = 0;
      return;
    }
    this.state.queueSeconds = Math.max(0, Math.floor((Date.now() - this.queueStartedAt) / 1000));
  }

  async refreshLocalPlayer() {
    try {
      const payload = await GameCenterBridge.getLocalPlayer();
      const isAuthenticated = Boolean(payload?.isAuthenticated);
      if (isAuthenticated) {
        this.state.localProfile = resolveLocalProfile(payload?.player);
        if (this.state.phase !== 'searching' && this.state.phase !== 'matched') {
          this.state.phase = 'idle';
          this.state.message = '已連線 Game Center，可開始配對。';
          this.state.errorMessage = '';
        }
        return true;
      }
      this.state.phase = 'auth_required';
      this.state.message = '請先同步 Game Center 帳號。';
      this.state.errorMessage = '';
      this.state.localProfile = {
        ...this.state.localProfile,
        id: '',
        gameCenterId: '',
        displayName: 'Game Center 玩家'
      };
      return false;
    } catch (error) {
      this.state.phase = 'error';
      this.state.message = '無法讀取 Game Center 狀態。';
      this.state.errorMessage = resolveErrorMessage(error, 'Bridge 呼叫失敗。');
      return false;
    }
  }

  async signIn(options = {}) {
    if (this.authPromise) {
      await this.authPromise;
      return;
    }

    this.authPromise = this.performSignIn(options);
    try {
      await this.authPromise;
    } finally {
      this.authPromise = null;
    }
  }

  async performSignIn(options = {}) {
    const interactive = options?.silent !== true;

    try {
      if (!interactive) {
        await this.refreshLocalPlayer();
        this.emit();
        return;
      }

      const payload = await GameCenterBridge.authenticate();
      const isAuthenticated = Boolean(payload?.isAuthenticated);
      if (!isAuthenticated) {
        this.state.phase = 'auth_required';
        this.state.message = '尚未登入 Game Center。';
        this.state.errorMessage = '';
        this.emit();
        return;
      }

      this.state.localProfile = resolveLocalProfile(payload?.player);
      this.state.phase = 'idle';
      this.state.message = '已連線 Game Center，可開始配對。';
      this.state.errorMessage = '';
      this.emit();
    } catch (error) {
      if (isCancelledError(error)) {
        this.state.phase = 'auth_required';
        this.state.message = '已取消 Game Center 登入。';
        this.state.errorMessage = '';
        this.emit();
        return;
      }
      this.state.phase = 'error';
      this.state.message = 'Game Center 登入失敗。';
      this.state.errorMessage = resolveErrorMessage(error, '請確認 iOS 裝置已登入 Game Center。');
      this.emit();
    }
  }

  async startMatchmaking() {
    if (this.state.phase === 'searching') return;
    if (this.authPromise) {
      try {
        await this.authPromise;
      } catch {
        // Ignore here; readiness check below will produce the right state.
      }
    }

    const ready = await this.refreshLocalPlayer();
    if (!ready) {
      this.emit();
      return;
    }

    this.matchRequestToken += 1;
    const token = this.matchRequestToken;

    this.state.phase = 'searching';
    this.state.message = '正在搜尋對手...';
    this.state.errorMessage = '';
    this.state.opponentProfile = null;
    this.queueStartedAt = Date.now();
    this.startQueueTick();
    this.emit();

    try {
      const result = await GameCenterBridge.startMatchmaking({
        minPlayers: 2,
        maxPlayers: 2
      });
      if (token !== this.matchRequestToken) return;

      this.stopQueueTick();
      this.state.phase = 'matched';
      this.state.message = '配對成功，準備進入對戰。';
      this.state.opponentProfile = resolveOpponentProfile(result?.opponentProfile);
      this.state.errorMessage = '';
      this.emit();
    } catch (error) {
      if (token !== this.matchRequestToken) return;
      this.stopQueueTick();
      this.state.opponentProfile = null;

      if (isCancelledError(error)) {
        this.state.phase = 'idle';
        this.state.message = '已取消配對。';
        this.state.errorMessage = '';
        this.emit();
        return;
      }

      this.state.phase = 'error';
      this.state.message = '配對失敗。';
      this.state.errorMessage = resolveErrorMessage(error, '請稍後再試。');
      this.emit();
    }
  }

  async cancelMatchmaking() {
    this.matchRequestToken += 1;
    this.stopQueueTick();
    this.state.phase = 'idle';
    this.state.message = '已取消配對。';
    this.state.errorMessage = '';
    this.state.opponentProfile = null;
    this.emit();

    try {
      await GameCenterBridge.cancelMatchmaking();
    } catch {
      // Ignore cancellation errors if the native side already ended matchmaking.
    }
  }

  async onAppPause() {
    if (this.state.phase !== 'searching') return;
    this.syncQueueSeconds();
    this.clearQueueTick();
    this.state.message = '背景中，返回前景後繼續配對。';
    this.emit();
  }

  async onAppResume() {
    if (this.state.phase !== 'searching') return;
    this.queueStartedAt = Date.now() - (this.state.queueSeconds * 1000);
    this.startQueueTick();
    this.state.message = '正在搜尋對手...';
    this.emit();
  }

  destroy() {
    this.stopQueueTick();
    this.listeners.clear();
    if (this.nativeMatchStateListener?.remove) {
      void this.nativeMatchStateListener.remove();
    }
    this.nativeMatchStateListener = null;
  }
}
