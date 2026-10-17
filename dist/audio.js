'use strict';

// Create and resume audio during player input, then schedule effects only once
// the browser's audio clock is running. All effects share one master mute.
class SoundEffects {
  constructor({Context = globalThis.AudioContext || globalThis.webkitAudioContext, enabled = true} = {}) {
    this.Context = Context;
    this.enabled = enabled;
    this.context = null;
    this.master = null;
    this.resuming = null;
    this.revision = 0;
    this.voices = new Set();
  }

  async unlock(fromGesture = false) {
    if (!this.enabled || !this.Context) return false;
    try {
      if (!this.context || this.context.state === 'closed') {
        this.context = new this.Context({latencyHint: 'interactive'});
        this.master = this.context.createGain();
        this.master.gain.value = 0.8;
        this.master.connect(this.context.destination);
      }
      const context = this.context;
      if (context.state === 'running') return true;
      if (!this.resuming || fromGesture) {
        // A resume requested without activation may remain pending. A later
        // player gesture must be able to retry rather than await it forever.
        const attempt = context.resume()
          .then(() => context.state === 'running')
          .catch(() => false)
          .finally(() => { if (this.resuming === attempt) this.resuming = null; });
        this.resuming = attempt;
      }
      return await this.resuming;
    } catch {
      // Keep gameplay usable when audio is unavailable; retry on later input.
      return false;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.revision++;
    if (this.master) {
      this.master.gain.setValueAtTime(enabled ? 0.8 : 0, this.context.currentTime);
    }
  }

  async tone(freq = 100, type = 'square', duration = 0.07, volume = 0.025, end = 40) {
    if (!this.enabled) return false;
    const revision = this.revision;
    if (!await this.unlock() || !this.enabled || revision !== this.revision) return false;

    try {
      const context = this.context;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const now = context.currentTime;
      const start = now + 0.005;
      const peak = Math.min(0.25, volume * 4);
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), start + duration);
      // A brief attack and a complete fade avoid clicks during rapid fire.
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(peak, start + 0.003);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      envelope.gain.linearRampToValueAtTime(0, start + duration + 0.01);
      oscillator.connect(envelope);
      envelope.connect(this.master);
      this.voices.add(oscillator);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
        this.voices.delete(oscillator);
      };
      oscillator.start(start);
      oscillator.stop(start + duration + 0.015);
      return true;
    } catch {
      return false;
    }
  }
}
