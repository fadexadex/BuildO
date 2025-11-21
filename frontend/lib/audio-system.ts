/**
 * ZK Quest Audio System
 * Uses Web Audio API for immersive sound effects and ambient audio
 */

type SoundType = 
  | 'ambient' 
  | 'success' 
  | 'error' 
  | 'click' 
  | 'hover' 
  | 'compute' 
  | 'unlock'
  | 'levelStart'
  | 'levelComplete'
  | 'puzzleSolve'
  | 'powerup'
  | 'transition'
  | 'warning'
  | 'whoosh'
  | 'sparkle'
  | 'gameAmbient';

class AudioSystem {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private sounds: Map<string, AudioBuffer> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private ambientLoop: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  constructor() {
    // Initialize on first user interaction to comply with browser policies
  }

  private init() {
    if (this.context) return;
    
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create gain nodes for different audio channels
      this.masterGain = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.ambientGain = this.context.createGain();
      
      // Connect the audio chain
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.ambientGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);
      
      // Set initial volumes (increased for better audibility)
      this.musicGain.gain.value = 0.5;
      this.sfxGain.gain.value = 0.8;
      this.ambientGain.gain.value = 0.3;
      
      this.loadSounds();
    } catch (e) {
      console.error('Web Audio API not supported', e);
    }
  }

  private async loadSounds() {
    // In a real app, we would fetch audio files. 
    // For this hackathon/demo, we can synthesize simple sounds or load placeholders.
    // Here we'll set up the structure.
  }

  public async toggleMute(muted: boolean) {
    this.isMuted = muted;
    
    // Initialize context on first unmute (user interaction)
    if (!this.context && !muted) {
      this.init();
    }
    
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
    
    // Suspend/resume context to save resources
    if (this.context) {
      if (muted) {
        this.stopAmbient(); // Stop ambient if running
        await this.context.suspend();
      } else {
        try {
          await this.context.resume();
          // Note: Ambient sound is disabled by default
          // Call audioSystem.startAmbient() manually if you want it
        } catch (e) {
          console.warn('Could not resume audio context:', e);
        }
      }
    }
  }

  public async startAmbient() {
    if (this.isMuted) {
      console.log('🔇 Audio muted, skipping ambient');
      return;
    }
    
    if (!this.context) {
      this.init();
      console.log('🔊 Audio context initialized for ambient');
    }
    
    // Resume context if suspended (browser autoplay policy)
    if (this.context && this.context.state === 'suspended') {
      try {
        await this.context.resume();
        console.log('🔊 Audio context resumed for ambient');
      } catch (e) {
        console.warn('❌ Could not resume audio context:', e);
        return;
      }
    }
    
    if (!this.context || !this.ambientGain) {
      console.warn('❌ Audio context or gain node not available');
      return;
    }
    
    // Stop existing ambient if any
    this.stopAmbient();
    
    console.log('🎶 Starting ambient sound layers');
    
    // Create a rich ambient soundscape with multiple layers
    this.createAmbientLayer(60, 'sine', 0.03);
    this.createAmbientLayer(120, 'sine', 0.02);
    this.createAmbientLayer(240, 'triangle', 0.015);
    this.createAmbientLayer(480, 'sine', 0.01);
    
    // Add some subtle modulation
    if (this.context && this.ambientGain) {
      const lfo = this.context.createOscillator();
      const lfoGain = this.context.createGain();
      lfo.frequency.value = 0.1;
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(this.ambientGain.gain);
      lfo.start();
    }
  }

  private createAmbientLayer(freq: number, type: OscillatorType, volume: number) {
    if (!this.context || !this.ambientGain) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume * 2; // Doubled for better audibility
    
    osc.connect(gain);
    gain.connect(this.ambientGain);
    
    osc.start();
    
    // Store reference to stop later
    const key = `ambient_${freq}`;
    this.activeSources.set(key, osc);
  }

  public stopAmbient() {
    // Stop all ambient layers
    this.activeSources.forEach((source, key) => {
      if (key.startsWith('ambient_')) {
        try {
          source.stop();
        } catch (e) {
          // Already stopped
        }
        this.activeSources.delete(key);
      }
    });
  }

  public getStatus() {
    return {
      initialized: !!this.context,
      state: this.context?.state,
      isMuted: this.isMuted,
      activeSourcesCount: this.activeSources.size
    };
  }

  // Force initialization (call on user click/interaction)
  public async initialize() {
    if (!this.context) {
      this.init();
      console.log('🔊 Audio context created');
    }
    if (this.context && this.context.state === 'suspended') {
      try {
        await this.context.resume();
        console.log('🔊 Audio context resumed, state:', this.context.state);
      } catch (e) {
        console.error('❌ Failed to initialize audio context:', e);
      }
    } else if (this.context) {
      console.log('🔊 Audio context ready, state:', this.context.state);
    }
  }

  public async play(type: SoundType, volume: number = 1.0) {
    if (this.isMuted) {
      console.log('🔇 Audio muted, skipping sound:', type);
      return;
    }
    
    if (!this.context) {
      this.init();
      console.log('🔊 Audio context initialized on play');
    }
    
    // Resume context if suspended (browser autoplay policy)
    if (this.context && this.context.state === 'suspended') {
      try {
        await this.context.resume();
        console.log('🔊 Audio context resumed for:', type);
      } catch (e) {
        console.warn('❌ Could not resume audio context:', e);
        return;
      }
    }
    
    if (!this.context) {
      console.warn('❌ No audio context available');
      return;
    }

    console.log('🎵 Playing sound:', type, 'volume:', volume, 'context state:', this.context.state);
    
    // Synthesize sounds for now to avoid external asset dependencies in this phase
    this.synthesizeSound(type, volume);
  }

  private synthesizeSound(type: SoundType, volume: number) {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;

    switch (type) {
      case 'click':
        // Soft marimba-like click
        this.createNote(1046.5, 0.08, volume * 0.25, 'sine', 0); // C6
        this.createNote(1318.5, 0.06, volume * 0.15, 'sine', 0.02); // E6
        break;

      case 'hover':
        // Gentle bell tone
        this.createNote(880, 0.1, volume * 0.12, 'sine', 0); // A5
        this.createNote(1174.7, 0.08, volume * 0.08, 'sine', 0.01); // D6
        break;

      case 'success':
        // Pleasant major chord arpeggio (C major)
        this.createNote(523.25, 0.2, volume * 0.3, 'sine', 0);    // C5
        this.createNote(659.25, 0.2, volume * 0.3, 'sine', 0.12);  // E5
        this.createNote(783.99, 0.25, volume * 0.35, 'sine', 0.24); // G5
        this.createNote(1046.5, 0.3, volume * 0.25, 'sine', 0.36);  // C6
        break;

      case 'levelComplete':
        // Triumphant fanfare (C major scale ascending)
        this.createNote(523.25, 0.15, volume * 0.35, 'sine', 0);     // C5
        this.createNote(587.33, 0.15, volume * 0.35, 'sine', 0.1);   // D5
        this.createNote(659.25, 0.15, volume * 0.35, 'sine', 0.2);   // E5
        this.createNote(783.99, 0.2, volume * 0.4, 'sine', 0.3);     // G5
        this.createNote(1046.5, 0.4, volume * 0.45, 'sine', 0.45);   // C6
        // Add harmonics
        this.createNote(1318.5, 0.3, volume * 0.2, 'sine', 0.5);    // E6
        // Sparkle
        for (let i = 0; i < 4; i++) {
          this.createNote(1568 + Math.random() * 500, 0.12, volume * 0.15, 'sine', 0.6 + i * 0.08);
        }
        break;

      case 'levelStart':
        // Uplifting start (ascending fifths)
        this.createNote(523.25, 0.15, volume * 0.3, 'sine', 0);    // C5
        this.createNote(783.99, 0.2, volume * 0.35, 'sine', 0.12);  // G5
        this.createNote(1046.5, 0.25, volume * 0.3, 'sine', 0.25);  // C6
        break;

      case 'puzzleSolve':
        // Satisfying "ding" with harmonics
        this.createNote(1046.5, 0.15, volume * 0.35, 'sine', 0);    // C6
        this.createNote(2093, 0.15, volume * 0.2, 'sine', 0);       // C7 (octave)
        this.createNote(1568, 0.12, volume * 0.15, 'sine', 0.05);   // G6 (fifth)
        break;

      case 'error':
        // Gentle negative feedback (minor chord)
        this.createNote(293.66, 0.12, volume * 0.25, 'sine', 0);    // D4
        this.createNote(349.23, 0.15, volume * 0.28, 'sine', 0.08);  // F4
        this.createNote(220, 0.2, volume * 0.22, 'sine', 0.12);      // A3
        break;
        
      case 'compute':
        // Soft digital processing (like typing)
        for(let i = 0; i < 8; i++) {
          const freq = 800 + Math.random() * 400;
          this.createNote(freq, 0.04, volume * 0.08, 'sine', i * 0.05);
        }
        break;

      case 'unlock':
        // Magical shimmer (pentatonic scale)
        this.createNote(523.25, 0.2, volume * 0.3, 'sine', 0);     // C5
        this.createNote(659.25, 0.2, volume * 0.3, 'sine', 0.08);  // E5
        this.createNote(783.99, 0.25, volume * 0.32, 'sine', 0.16); // G5
        this.createNote(987.77, 0.25, volume * 0.28, 'sine', 0.24); // B5
        this.createNote(1318.5, 0.3, volume * 0.25, 'sine', 0.32);  // E6
        // Sparkle tail
        for (let i = 0; i < 5; i++) {
          this.createNote(1568 + Math.random() * 800, 0.1, volume * 0.15, 'sine', 0.4 + i * 0.08);
        }
        break;

      case 'powerup':
        // Energetic rising arpeggio
        this.createNote(261.63, 0.08, volume * 0.25, 'sine', 0);    // C4
        this.createNote(329.63, 0.08, volume * 0.28, 'sine', 0.06);  // E4
        this.createNote(392, 0.08, volume * 0.3, 'sine', 0.12);      // G4
        this.createNote(523.25, 0.1, volume * 0.32, 'sine', 0.18);   // C5
        this.createNote(659.25, 0.12, volume * 0.35, 'sine', 0.26);  // E5
        this.createNote(783.99, 0.15, volume * 0.38, 'sine', 0.36);  // G5
        break;

      case 'transition':
        // Smooth pad-like transition
        this.createNote(440, 0.3, volume * 0.15, 'sine', 0);        // A4
        this.createNote(554.37, 0.3, volume * 0.15, 'sine', 0.05);  // C#5
        this.createNote(659.25, 0.25, volume * 0.12, 'sine', 0.1);  // E5
        break;

      case 'warning':
        // Gentle alert (two-tone)
        this.createNote(880, 0.1, volume * 0.25, 'sine', 0);      // A5
        this.createNote(740, 0.12, volume * 0.28, 'sine', 0.12);  // F#5
        break;

      case 'whoosh':
        // Soft swoosh (filtered sweep)
        this.createSoftSweep(600, 200, 0.15, volume * 0.2);
        break;

      case 'sparkle':
        // Delicate chimes
        const sparkleNotes = [1568, 1760, 1976, 2093, 2349]; // G6, A6, B6, C7, D7
        for (let i = 0; i < 3; i++) {
          const note = sparkleNotes[Math.floor(Math.random() * sparkleNotes.length)];
          this.createNote(note, 0.15, volume * 0.12, 'sine', i * 0.06);
        }
        break;
    }
  }

  private createSimpleBeep(startFreq: number, endFreq: number, duration: number, volume: number, type: OscillatorType) {
    if (!this.context || !this.sfxGain) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + duration);
  }

  private createNote(freq: number, duration: number, volume: number, type: OscillatorType, delay: number) {
    if (!this.context || !this.sfxGain) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime + delay;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    
    // Smooth ADSR envelope for pleasant sound
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01); // Quick attack
    gain.gain.linearRampToValueAtTime(volume * 0.7, now + 0.05); // Slight decay
    gain.gain.linearRampToValueAtTime(volume * 0.5, now + duration * 0.5); // Sustain
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Release
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + duration);
  }

  private createSoftSweep(startFreq: number, endFreq: number, duration: number, volume: number) {
    if (!this.context || !this.sfxGain) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const now = this.context.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(startFreq * 2, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq * 2, now + duration);
    filter.Q.value = 1;
    
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + duration);
  }

  private createGlissando(startFreq: number, endFreq: number, duration: number, volume: number, type: OscillatorType) {
    if (!this.context || !this.sfxGain) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + duration);
  }

  private createWhiteSweep(startFreq: number, endFreq: number, duration: number, volume: number) {
    if (!this.context || !this.sfxGain) return;
    
    // Create noise buffer for whoosh effect
    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.context.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(startFreq, this.context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(endFreq, this.context.currentTime + duration);
    filter.Q.value = 1;
    
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    noise.start();
    noise.stop(this.context.currentTime + duration);
  }
}

// Singleton instance
export const audioSystem = new AudioSystem();
