import { GameCenterBridge } from '../nativeGameCenterBridge.js';

function toDisplayName(value, fallback = 'Game Center 玩家') {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function resolveLocalProfile(player = {}) {
  const displayName = toDisplayName(player.displayName);
  return {
    id: player.id ?? '',
    gameCenterId: player.gameCenterId ?? '',
    displayName,
    gameCenterDisplayName: displayName,
    avatarEmoji: '🎮'
  };
}

function resolveOpponentProfile(raw = {}) {
  const displayName = toDisplayName(raw.displayName, '對手連線中');
  return {
    id: raw.id ?? 'pending-opponent',
    gameCenterId: raw.gameCenterId ?? '',
    displayName,
    gameCenterDisplayName: displayName,
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

function parseJsonObjectSafely(text) {
  if (typeof text !== 'string') return null;
  const sanitized = text.replace(/\u0000/g, '').trim();
  if (!sanitized) return null;

  const candidates = [sanitized];
  const firstBrace = sanitized.indexOf('{');
  const lastBrace = sanitized.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = sanitized.slice(firstBrace, lastBrace + 1);
    if (sliced !== sanitized) candidates.push(sliced);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // Keep trying with the next candidate.
    }
  }

  return null;
}

function decodeBase64ToText(base64Text) {
  if (typeof base64Text !== 'string' || !base64Text) return '';
  try {
    if (typeof atob === 'function') {
      return atob(base64Text);
    }
  } catch {
    // Fall back to Buffer below.
  }

  if (typeof Buffer !== 'undefined') {
    try {
      return Buffer.from(base64Text, 'base64').toString('utf8');
    } catch {
      return '';
    }
  }

  return '';
}

function normalizeNativeRealtimePayload(payload = {}) {
  let data = payload?.payload && typeof payload.payload === 'object'
    ? payload.payload
    : payload;

  if (typeof data === 'string') {
    const parsed = parseJsonObjectSafely(data);
    if (parsed) data = parsed;
  }

  for (let depth = 0; depth < 4; depth += 1) {
    if (!data || typeof data !== 'object') break;

    if (data.type === 'raw_json_text' && typeof data.json === 'string') {
      const parsed = parseJsonObjectSafely(data.json);
      if (parsed) {
        data = parsed;
        continue;
      }
    }

    if (data.type === 'raw' && typeof data.dataBase64 === 'string') {
      const decoded = decodeBase64ToText(data.dataBase64);
      const parsed = parseJsonObjectSafely(decoded);
      if (parsed) {
        data = parsed;
        continue;
      }
    }

    break;
  }

  if (!data || typeof data !== 'object') return {};
  return data;
}

export class GameCenterProvider {
  constructor() {
    this.listeners = new Set();
    this.realtimeListeners = new Set();
    this.tickTimer = null;
    this.queueStartedAt = null;
    this.matchRequestToken = 0;
    this.nativeMatchStateListener = null;
    this.nativeMatchDataListener = null;
    this.nativeMatchPlayerStateListener = null;
    this.authPromise = null;
    this.state = {
      provider: 'gamecenter',
      phase: 'auth_required',
      message: '請先到設定頁連接 Game Center。',
      queueSeconds: 0,
      expectedPlayerCount: 0,
      connectedPlayerCount: 0,
      localProfile: {
        id: '',
        gameCenterId: '',
        displayName: 'Game Center 玩家',
        gameCenterDisplayName: 'Game Center 玩家',
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
      canUseCustomDisplayName: true,
      supportsRealtime: true
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

  subscribeRealtime(listener) {
    if (typeof listener !== 'function') return () => {};
    this.realtimeListeners.add(listener);
    return () => {
      this.realtimeListeners.delete(listener);
    };
  }

  getState() {
    return { ...this.state };
  }

  emit() {
    const snapshot = this.getState();
    this.listeners.forEach(listener => listener(snapshot));
  }

  emitRealtime(payload = {}) {
    this.realtimeListeners.forEach(listener => listener(payload));
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

    try {
      this.nativeMatchDataListener = await GameCenterBridge.addListener('matchData', (payload) => {
        this.applyNativeMatchData(payload);
      });
    } catch {
      // Listener is optional for this MVP.
    }

    try {
      this.nativeMatchPlayerStateListener = await GameCenterBridge.addListener('matchPlayerStateChange', (payload) => {
        this.applyNativePlayerState(payload);
      });
    } catch {
      // Listener is optional for this MVP.
    }
  }

  applyNativeMatchData(payload = {}) {
    const data = normalizeNativeRealtimePayload(payload);

    this.emitRealtime({
      ...data,
      _sourcePlayerId: payload?.fromPlayerId ?? '',
      _sourceDisplayName: payload?.fromDisplayName ?? ''
    });
  }

  applyNativePlayerState(payload = {}) {
    this.state.expectedPlayerCount = Number.isFinite(Number(payload?.expectedPlayerCount))
      ? Math.max(0, Math.floor(Number(payload.expectedPlayerCount)))
      : this.state.expectedPlayerCount;
    this.state.connectedPlayerCount = Number.isFinite(Number(payload?.connectedPlayerCount))
      ? Math.max(0, Math.floor(Number(payload.connectedPlayerCount)))
      : this.state.connectedPlayerCount;

    if (payload?.state === 'connected') {
      if (this.state.phase === 'searching' || this.state.phase === 'matched') {
        this.emit();
      }
      return;
    }

    if (payload?.state !== 'disconnected') return;
    if (this.state.phase === 'searching' || this.state.phase === 'matched') {
      this.stopQueueTick();
      this.state.phase = 'error';
      this.state.message = '對手已離線。';
      this.state.errorMessage = 'Game Center 連線中斷。';
      this.state.opponentProfile = null;
      this.state.expectedPlayerCount = 0;
      this.state.connectedPlayerCount = 0;
      this.emit();
    }
  }

  applyNativeMatchState(payload = {}) {
    const phase = payload.phase;
    if (!phase) return;

    if (phase === 'searching') {
      this.state.phase = 'searching';
      this.state.message = payload.message || '正在搜尋對手...';
      this.state.errorMessage = '';
      this.state.opponentProfile = payload.opponentProfile
        ? resolveOpponentProfile(payload.opponentProfile)
        : null;
      this.state.expectedPlayerCount = Number.isFinite(Number(payload?.expectedPlayerCount))
        ? Math.max(0, Math.floor(Number(payload.expectedPlayerCount)))
        : this.state.expectedPlayerCount;
      this.state.connectedPlayerCount = Number.isFinite(Number(payload?.connectedPlayerCount))
        ? Math.max(0, Math.floor(Number(payload.connectedPlayerCount)))
        : this.state.connectedPlayerCount;
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
      this.state.expectedPlayerCount = Number.isFinite(Number(payload?.expectedPlayerCount))
        ? Math.max(0, Math.floor(Number(payload.expectedPlayerCount)))
        : 0;
      this.state.connectedPlayerCount = Number.isFinite(Number(payload?.connectedPlayerCount))
        ? Math.max(0, Math.floor(Number(payload.connectedPlayerCount)))
        : this.state.connectedPlayerCount;
      this.emit();
      return;
    }

    if (phase === 'idle') {
      this.stopQueueTick();
      this.state.phase = 'idle';
      this.state.message = payload.message || '已取消配對。';
      this.state.errorMessage = '';
      this.state.opponentProfile = null;
      this.state.expectedPlayerCount = 0;
      this.state.connectedPlayerCount = 0;
      this.emit();
      return;
    }

    if (phase === 'error') {
      this.stopQueueTick();
      this.state.phase = 'error';
      this.state.message = payload.message || '配對流程發生錯誤。';
      this.state.errorMessage = payload.errorMessage || '';
      this.state.opponentProfile = null;
      this.state.expectedPlayerCount = 0;
      this.state.connectedPlayerCount = 0;
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
      this.state.message = '請先到設定頁連接 Game Center。';
      this.state.errorMessage = '';
      this.state.expectedPlayerCount = 0;
      this.state.connectedPlayerCount = 0;
      this.state.localProfile = {
        ...this.state.localProfile,
        id: '',
        gameCenterId: '',
        displayName: 'Game Center 玩家',
        gameCenterDisplayName: 'Game Center 玩家'
      };
      return false;
    } catch (error) {
      this.state.phase = 'error';
      this.state.message = '無法讀取 Game Center 狀態。';
      this.state.errorMessage = resolveErrorMessage(error, 'Bridge 呼叫失敗。');
      this.state.expectedPlayerCount = 0;
      this.state.connectedPlayerCount = 0;
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
        this.state.expectedPlayerCount = 0;
        this.state.connectedPlayerCount = 0;
        this.emit();
        return;
      }

      this.state.localProfile = resolveLocalProfile(payload?.player);
      this.state.phase = 'idle';
      this.state.message = '已連線 Game Center，可開始配對。';
      this.state.errorMessage = '';
      this.state.expectedPlayerCount = 0;
      this.state.connectedPlayerCount = 0;
      this.emit();
    } catch (error) {
      if (isCancelledError(error)) {
        this.state.phase = 'auth_required';
        this.state.message = '已取消 Game Center 登入。';
        this.state.errorMessage = '';
        this.state.expectedPlayerCount = 0;
        this.state.connectedPlayerCount = 0;
        this.emit();
        return;
      }
      this.state.phase = 'error';
      this.state.message = 'Game Center 登入失敗。';
      this.state.errorMessage = resolveErrorMessage(error, '請確認 iOS 裝置已登入 Game Center。');
      this.state.expectedPlayerCount = 0;
      this.state.connectedPlayerCount = 0;
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
    this.state.expectedPlayerCount = 1;
    this.state.connectedPlayerCount = 0;
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
      this.state.expectedPlayerCount = 0;
      this.state.connectedPlayerCount = 1;
      this.emit();
    } catch (error) {
      if (token !== this.matchRequestToken) return;
      this.stopQueueTick();
      this.state.opponentProfile = null;
      this.state.expectedPlayerCount = 0;
      this.state.connectedPlayerCount = 0;

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
    this.state.expectedPlayerCount = 0;
    this.state.connectedPlayerCount = 0;
    this.emit();

    try {
      await GameCenterBridge.cancelMatchmaking();
    } catch {
      // Ignore cancellation errors if the native side already ended matchmaking.
    }
  }

  async sendRealtimeEvent(payload = {}) {
    if (!payload || typeof payload !== 'object') return;
    await GameCenterBridge.sendMatchData({
      payload,
      reliable: true
    });
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
    this.realtimeListeners.clear();
    if (this.nativeMatchStateListener?.remove) {
      void this.nativeMatchStateListener.remove();
    }
    this.nativeMatchStateListener = null;
    if (this.nativeMatchDataListener?.remove) {
      void this.nativeMatchDataListener.remove();
    }
    this.nativeMatchDataListener = null;
    if (this.nativeMatchPlayerStateListener?.remove) {
      void this.nativeMatchPlayerStateListener.remove();
    }
    this.nativeMatchPlayerStateListener = null;
  }
}
