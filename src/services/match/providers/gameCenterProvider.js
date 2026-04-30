export class GameCenterProvider {
  constructor() {
    this.listeners = new Set();
    this.state = {
      provider: 'gamecenter',
      phase: 'auth_required',
      message: '尚未接入 iOS Game Center Bridge（Capacitor plugin）。',
      queueSeconds: 0,
      localProfile: {
        id: '',
        gameCenterId: '',
        displayName: '',
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

  async signIn() {
    this.state.phase = 'error';
    this.state.errorMessage = '目前尚未接入 iOS 原生 Game Center plugin。';
    this.state.message = '請先完成 Capacitor iOS plugin 連接。';
    this.emit();
  }

  async startMatchmaking() {
    this.state.phase = 'error';
    this.state.errorMessage = '尚未接入原生配對。';
    this.state.message = '配對流程待接 iOS Game Center SDK。';
    this.emit();
  }

  async cancelMatchmaking() {
    this.state.phase = 'idle';
    this.state.message = '已取消。';
    this.state.queueSeconds = 0;
    this.emit();
  }

  destroy() {
    this.listeners.clear();
  }
}
