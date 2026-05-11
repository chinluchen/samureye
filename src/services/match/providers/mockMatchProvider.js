function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export class MockMatchProvider {
  constructor() {
    this.listeners = new Set();
    this.searchTimer = null;
    this.tickTimer = null;
    this.queueStartedAt = null;
    this.matchReadyAt = null;
    this.state = {
      provider: 'mock',
      phase: 'idle',
      message: '開發模式：使用模擬配對流程。',
      queueSeconds: 0,
      localProfile: {
        id: 'local-dev-player',
        gameCenterId: null,
        displayName: 'SAMUREYE',
        avatarEmoji: '🗡️'
      },
      opponentProfile: null,
      errorMessage: ''
    };
  }

  getCapabilities() {
    return {
      provider: 'mock',
      platform: 'web',
      requiresNativeBridge: false,
      supportsGameCenter: false,
      canUseCustomDisplayName: true
    };
  }

  async init() {
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

  async signIn({ displayName } = {}) {
    const nextName = (displayName || '').trim();
    if (nextName) {
      this.state.localProfile = {
        ...this.state.localProfile,
        displayName: nextName
      };
    }
    this.state.phase = 'idle';
    this.state.message = '已準備配對。';
    this.state.errorMessage = '';
    this.emit();
  }

  async startMatchmaking({ displayName } = {}) {
    if (this.state.phase === 'searching') return;

    const nextName = (displayName || '').trim();
    if (nextName) {
      this.state.localProfile = {
        ...this.state.localProfile,
        displayName: nextName
      };
    }

    this.queueStartedAt = Date.now();
    const matchDelayMs = 4200 + Math.floor(Math.random() * 2600);
    this.matchReadyAt = this.queueStartedAt + matchDelayMs;
    this.state.phase = 'searching';
    this.state.message = '正在搜尋對手...';
    this.state.opponentProfile = null;
    this.state.errorMessage = '';
    this.state.queueSeconds = 0;
    this.emit();

    this.startSearchingTimers();
  }

  async cancelMatchmaking() {
    if (this.state.phase !== 'searching') return;
    this.clearRuntimeTimers();
    this.queueStartedAt = null;
    this.matchReadyAt = null;
    this.state.phase = 'idle';
    this.state.message = '已取消配對。';
    this.state.queueSeconds = 0;
    this.emit();
  }

  async onAppPause() {
    if (this.state.phase !== 'searching') return;
    this.syncQueueSeconds();
    this.clearRuntimeTimers();
    this.state.message = '背景中，返回前景後繼續配對。';
    this.emit();
  }

  async onAppResume() {
    if (this.state.phase !== 'searching') return;
    this.syncQueueSeconds();
    if (this.matchReadyAt && Date.now() >= this.matchReadyAt) {
      this.completeMatchmaking();
      return;
    }

    this.state.message = '正在搜尋對手...';
    this.startSearchingTimers();
    this.emit();
  }

  subscribeRealtime() {
    return () => {};
  }

  async sendRealtimeEvent() {
    // Mock provider does not implement realtime transport.
  }

  startSearchingTimers() {
    this.clearRuntimeTimers();

    this.tickTimer = setInterval(() => {
      if (this.state.phase !== 'searching') return;
      this.syncQueueSeconds();
      this.emit();
    }, 250);

    const remainingMs = Math.max(0, Number(this.matchReadyAt ?? Date.now()) - Date.now());
    this.searchTimer = setTimeout(() => {
      if (this.state.phase !== 'searching') return;
      this.completeMatchmaking();
    }, remainingMs);
  }

  completeMatchmaking() {
    const opponentNames = ['Master HOU', 'LensRider', 'Dr. Retina', 'FocusFox', 'Astig Ace'];
    this.syncQueueSeconds();
    this.state.phase = 'matched';
    this.state.message = '配對成功，準備進入對戰。';
    this.state.opponentProfile = {
      id: `mock-opponent-${Math.floor(Math.random() * 100000)}`,
      gameCenterId: null,
      displayName: randomFrom(opponentNames),
      avatarEmoji: '🥷'
    };
    this.clearRuntimeTimers();
    this.queueStartedAt = null;
    this.matchReadyAt = null;
    this.emit();
  }

  syncQueueSeconds() {
    if (!this.queueStartedAt) {
      this.state.queueSeconds = 0;
      return;
    }
    this.state.queueSeconds = Math.max(0, Math.floor((Date.now() - this.queueStartedAt) / 1000));
  }

  clearRuntimeTimers() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  destroy() {
    this.clearRuntimeTimers();
    this.queueStartedAt = null;
    this.matchReadyAt = null;
    this.listeners.clear();
  }
}
