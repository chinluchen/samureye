export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterVolume = 1;
    this.bgmEnabled = false;
    this.bgmNodes = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (this.enabled && this.bgmEnabled && this.masterVolume > 0 && !this.bgmNodes) {
      this.startBgm();
    }
    this.refreshBgmGain();
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, Number(volume)));
    if (this.masterVolume > 0 && this.enabled && this.bgmEnabled && !this.bgmNodes) {
      this.startBgm();
    }
    this.refreshBgmGain();
  }

  setBgmEnabled(enabled) {
    this.bgmEnabled = Boolean(enabled);

    if (this.bgmEnabled) {
      this.startBgm();
      return;
    }

    this.stopBgm();
  }

  getGain(base) {
    return base * this.masterVolume;
  }

  startBgm() {
    if (!this.bgmEnabled || !this.enabled || this.masterVolume <= 0) return;

    this.init();
    if (this.bgmNodes) return;

    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    const gainA = this.ctx.createGain();
    const gainB = this.ctx.createGain();
    const master = this.ctx.createGain();

    oscA.type = 'triangle';
    oscA.frequency.setValueAtTime(164.81, this.ctx.currentTime);
    oscB.type = 'sine';
    oscB.frequency.setValueAtTime(246.94, this.ctx.currentTime);

    gainA.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gainB.gain.setValueAtTime(0.04, this.ctx.currentTime);
    master.gain.setValueAtTime(this.getGain(0.35), this.ctx.currentTime);

    oscA.connect(gainA);
    oscB.connect(gainB);
    gainA.connect(master);
    gainB.connect(master);
    master.connect(this.ctx.destination);

    oscA.start();
    oscB.start();

    this.bgmNodes = { oscA, oscB, master };
  }

  stopBgm() {
    if (!this.bgmNodes || !this.ctx) return;

    const { oscA, oscB, master } = this.bgmNodes;

    try {
      master.gain.cancelScheduledValues(this.ctx.currentTime);
      master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
      oscA.stop(this.ctx.currentTime + 0.2);
      oscB.stop(this.ctx.currentTime + 0.2);
    } catch {
      // Ignore repeated stop calls.
    }

    this.bgmNodes = null;
  }

  refreshBgmGain() {
    if (!this.bgmNodes || !this.ctx) return;

    const next = this.bgmEnabled && this.enabled ? this.getGain(0.35) : 0;
    this.bgmNodes.master.gain.setValueAtTime(next, this.ctx.currentTime);
  }

  playSlash() {
    if (!this.enabled || this.masterVolume <= 0) return;

    this.init();

    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    noise.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(5000, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(this.getGain(0.2), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }

  playHit() {
    if (!this.enabled || this.masterVolume <= 0) return;

    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(this.getGain(0.4), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playUlt() {
    if (!this.enabled || this.masterVolume <= 0) return;

    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(60, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(this.getGain(0.3), this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }
}

export const sfx = new SoundEngine();
