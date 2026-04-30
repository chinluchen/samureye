import { BGM_SCENE_PRESETS, SKILL_SFX_PROFILE } from '../data/audioCatalog.js';
import slashSfxUrl from '../assets/audio/sfx/sound_slash.wav';

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterVolume = 1;
    this.sfxVolume = 1;
    this.bgmEnabled = false;
    this.bgmNodes = null;
    this.bgmScene = 'home';
    this.sampleBuffers = {};
    this.sampleLoaders = {};
    this.sampleUrls = {
      slash: slashSfxUrl
    };
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.preloadSamples();
  }

  preloadSamples() {
    void this.loadSample('slash');
  }

  async loadSample(sampleId) {
    if (!this.ctx) return null;
    if (this.sampleBuffers[sampleId]) return this.sampleBuffers[sampleId];
    if (this.sampleLoaders[sampleId]) return this.sampleLoaders[sampleId];
    const url = this.sampleUrls[sampleId];
    if (!url) return null;

    const task = fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load sample: ${sampleId}`);
        return response.arrayBuffer();
      })
      .then(arrayBuffer => this.ctx.decodeAudioData(arrayBuffer.slice(0)))
      .then(decoded => {
        this.sampleBuffers[sampleId] = decoded;
        return decoded;
      })
      .catch(() => null)
      .finally(() => {
        delete this.sampleLoaders[sampleId];
      });

    this.sampleLoaders[sampleId] = task;
    return task;
  }

  playSample(sampleId, baseGain = 1) {
    if (!this.enabled || this.masterVolume <= 0) return false;
    this.init();

    const sample = this.sampleBuffers[sampleId];
    if (!sample) {
      void this.loadSample(sampleId);
      return false;
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = sample;
    gain.gain.setValueAtTime(this.getSfxGain(baseGain), this.ctx.currentTime);
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
    return true;
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

  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(volume)));
  }

  setBgmEnabled(enabled) {
    this.bgmEnabled = Boolean(enabled);

    if (this.bgmEnabled) {
      this.startBgm();
      return;
    }

    this.stopBgm();
  }

  setBgmScene(sceneId) {
    const nextScene = sceneId && BGM_SCENE_PRESETS[sceneId] ? sceneId : 'home';
    if (nextScene === this.bgmScene) return;
    this.bgmScene = nextScene;

    if (!this.bgmEnabled || !this.enabled || this.masterVolume <= 0) return;
    if (!this.bgmNodes) {
      this.startBgm();
      return;
    }

    this.stopBgm();
    this.startBgm();
  }

  getGain(base) {
    return base * this.masterVolume;
  }

  getSfxGain(base) {
    return base * this.masterVolume * this.sfxVolume;
  }

  startBgm() {
    if (!this.bgmEnabled || !this.enabled || this.masterVolume <= 0) return;

    this.init();
    if (this.bgmNodes) return;

    const preset = BGM_SCENE_PRESETS[this.bgmScene] ?? BGM_SCENE_PRESETS.home;

    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    const gainA = this.ctx.createGain();
    const gainB = this.ctx.createGain();
    const master = this.ctx.createGain();

    oscA.type = preset.oscAType;
    oscA.frequency.setValueAtTime(preset.oscAFreq, this.ctx.currentTime);
    oscB.type = preset.oscBType;
    oscB.frequency.setValueAtTime(preset.oscBFreq, this.ctx.currentTime);

    gainA.gain.setValueAtTime(preset.gainA, this.ctx.currentTime);
    gainB.gain.setValueAtTime(preset.gainB, this.ctx.currentTime);
    master.gain.setValueAtTime(this.getGain(preset.masterGain), this.ctx.currentTime);

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

    const preset = BGM_SCENE_PRESETS[this.bgmScene] ?? BGM_SCENE_PRESETS.home;
    const next = this.bgmEnabled && this.enabled ? this.getGain(preset.masterGain) : 0;
    this.bgmNodes.master.gain.setValueAtTime(next, this.ctx.currentTime);
  }

  playSlash() {
    const played = this.playSample('slash', 0.95);
    if (played) return;
    this.playSlashSynth();
  }

  playSlashSynth() {
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
    gain.gain.setValueAtTime(this.getSfxGain(0.2), this.ctx.currentTime);
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
    gain.gain.setValueAtTime(this.getSfxGain(0.4), this.ctx.currentTime);
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
    gain.gain.setValueAtTime(this.getSfxGain(0.3), this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  playSkillCast(skill) {
    if (!skill) {
      this.playUlt();
      return;
    }

    const skillId = typeof skill === 'string' ? skill : skill.id;
    const profile = SKILL_SFX_PROFILE[skillId] ?? 'ult';
    this.playSfxProfile(profile);
  }

  playSfxProfile(profile) {
    switch (profile) {
      case 'slash':
        this.playSlash();
        break;
      case 'flash':
        this.playFlash();
        break;
      case 'focus':
        this.playFocus();
        break;
      case 'shield':
        this.playShield();
        break;
      case 'heavy':
        this.playHeavy();
        break;
      case 'burst':
        this.playBurst();
        break;
      case 'dark':
        this.playDark();
        break;
      case 'split':
        this.playSplit();
        break;
      default:
        this.playUlt();
        break;
    }
  }

  playFlash() {
    if (!this.enabled || this.masterVolume <= 0) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2400, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(this.getSfxGain(0.15), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playFocus() {
    if (!this.enabled || this.masterVolume <= 0) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, this.ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(this.getSfxGain(0.22), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.24);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.24);
  }

  playShield() {
    if (!this.enabled || this.masterVolume <= 0) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(160, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(this.getSfxGain(0.2), this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.34);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.34);
  }

  playHeavy() {
    if (!this.enabled || this.masterVolume <= 0) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(95, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(38, this.ctx.currentTime + 0.36);
    gain.gain.setValueAtTime(this.getSfxGain(0.32), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.38);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.38);
  }

  playBurst() {
    if (!this.enabled || this.masterVolume <= 0) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.26);
    gain.gain.setValueAtTime(this.getSfxGain(0.26), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.28);
  }

  playDark() {
    if (!this.enabled || this.masterVolume <= 0) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(52, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(this.getSfxGain(0.2), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.32);
  }

  playSplit() {
    if (!this.enabled || this.masterVolume <= 0) return;
    this.init();

    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscA.type = 'sine';
    oscB.type = 'sine';
    oscA.frequency.setValueAtTime(180, this.ctx.currentTime);
    oscB.frequency.setValueAtTime(280, this.ctx.currentTime);
    gain.gain.setValueAtTime(this.getSfxGain(0.18), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    oscA.connect(gain);
    oscB.connect(gain);
    gain.connect(this.ctx.destination);
    oscA.start();
    oscB.start();
    oscA.stop(this.ctx.currentTime + 0.2);
    oscB.stop(this.ctx.currentTime + 0.2);
  }
}

export const sfx = new SoundEngine();
