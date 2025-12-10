
class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private bgmInterval: number | null = null;
  private currentBgmType: 'CALM' | 'UPBEAT' | 'TENSE' | 'FUNKY' = 'CALM';
  private lastHitTime: number = 0;

  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      
      this.masterGain.connect(this.ctx.destination);
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      
      this.masterGain.gain.value = 0.4;
      this.musicGain.gain.value = 0.3;
      this.sfxGain.gain.value = 0.5;
    } catch (e) {
      console.warn('AudioContext not supported');
    }
  }

  toggleMute() {
    if (this.masterGain) {
      this.isMuted = !this.isMuted;
      this.masterGain.gain.value = this.isMuted ? 0 : 0.4;
    }
    return this.isMuted;
  }

  startBGM(type: 'CALM' | 'UPBEAT' | 'TENSE' | 'FUNKY') {
    if (this.bgmInterval) clearInterval(this.bgmInterval);
    this.currentBgmType = type;
    
    let scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C Pentatonic
    let tempo = 400;

    if (type === 'TENSE') {
        scale = [220, 246, 261, 293, 311, 349];
        tempo = 150;
    } else if (type === 'UPBEAT') {
        tempo = 200;
    } else if (type === 'FUNKY') { // Match 3
        scale = [261, 293, 311, 349, 392, 466, 523]; // Minor pentatonic + blues
        tempo = 300;
    }
    
    this.bgmInterval = window.setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      
      if (Math.random() > 0.3) {
        const note = scale[Math.floor(Math.random() * scale.length)];
        const octave = Math.random() > 0.5 ? 1 : 2;
        const wave = type === 'FUNKY' ? 'square' : 'triangle';
        this.playTone(note * octave, wave, 0.1, 0, 0.05);
        
        // Bass line for funky
        if (type === 'FUNKY' && Math.random() > 0.7) {
            this.playTone(scale[0] / 2, 'sine', 0.2, 0, 0.1);
        }
      }
    }, tempo);
  }

  stopBGM() {
    if (this.bgmInterval) {
        clearInterval(this.bgmInterval);
        this.bgmInterval = null;
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 0.1) {
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
    
    gain.connect(this.sfxGain);
    osc.connect(gain);

    gain.gain.setValueAtTime(0, this.ctx.currentTime + startTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  playClick() {
    this.playTone(800, 'sine', 0.05, 0, 0.1);
  }

  playMatch() {
      // Satisfying chord
      this.playTone(523.25, 'sine', 0.3, 0, 0.1);
      this.playTone(659.25, 'sine', 0.3, 0.05, 0.1);
      this.playTone(783.99, 'sine', 0.3, 0.1, 0.1);
  }

  playShuffle() {
      for(let i=0; i<5; i++) {
          this.playTone(200 + i*100, 'square', 0.05, i*0.05, 0.05);
      }
  }

  playSuccess() {
    this.playTone(523.25, 'triangle', 0.4, 0, 0.1);
    this.playTone(659.25, 'triangle', 0.4, 0.1, 0.1);
    this.playTone(783.99, 'triangle', 0.6, 0.2, 0.1);
    this.playTone(1046.50, 'triangle', 0.8, 0.3, 0.1);
  }

  playError() {
    this.playTone(150, 'sawtooth', 0.3, 0, 0.1);
    this.playTone(130, 'sawtooth', 0.3, 0.1, 0.1);
  }

  playShoot() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playZap() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playWhoosh() {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.1;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
  }

  playEnemyHit() {
    const now = Date.now();
    if (now - this.lastHitTime < 50) return;
    this.lastHitTime = now;
    if (!this.ctx || !this.sfxGain) return;
    const pitch = 150 + Math.random() * 100;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playJump() {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
  }

  playExplosion() {
      if (!this.ctx || !this.sfxGain) return;
      const duration = 0.5;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start();
  }

  playLevelUp() {
      this.playTone(440, 'sine', 0.1, 0, 0.2);
      this.playTone(554, 'sine', 0.1, 0.1, 0.2);
      this.playTone(659, 'sine', 0.3, 0.2, 0.2);
  }

  playAttack() {
      this.playTone(150, 'sawtooth', 0.1, 0, 0.1);
  }
}

export const audioService = new AudioService();
