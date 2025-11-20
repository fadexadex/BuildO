/**
 * ZK Quest Audio System
 * Uses Web Audio API for immersive sound effects and ambient audio
 */

type SoundType = 'ambient' | 'success' | 'error' | 'click' | 'hover' | 'compute' | 'unlock';

class AudioSystem {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private sounds: Map<string, AudioBuffer> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();

  constructor() {
    // Initialize on first user interaction to comply with browser policies
  }

  private init() {
    if (this.context) return;
    
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
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

  public toggleMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
    
    // Suspend/resume context to save resources
    if (this.context) {
      if (muted) {
        this.context.suspend();
      } else {
        this.context.resume();
      }
    }
  }

  public play(type: SoundType, volume: number = 1.0) {
    if (this.isMuted) return;
    if (!this.context) this.init();
    if (!this.context || this.context.state === 'suspended') return;

    // Synthesize sounds for now to avoid external asset dependencies in this phase
    this.synthesizeSound(type, volume);
  }

  private synthesizeSound(type: SoundType, volume: number) {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    const now = this.context.currentTime;

    switch (type) {
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'success':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.1); // C#
        osc.frequency.setValueAtTime(659, now + 0.2); // E
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
        break;

      case 'error':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
        
      case 'compute':
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        // Random bleeps
        for(let i=0; i<10; i++) {
            osc.frequency.setValueAtTime(200 + Math.random()*800, now + i*0.05);
        }
        gain.gain.setValueAtTime(volume * 0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;

      case 'unlock':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        osc.start(now);
        osc.stop(now + 1.5);
        break;
    }
  }
}

// Singleton instance
export const audioSystem = new AudioSystem();
