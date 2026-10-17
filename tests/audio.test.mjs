import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const SoundEffects = vm.runInNewContext(`${readFileSync(new URL('../dist/audio.js', import.meta.url), 'utf8')}\nSoundEffects`);
const parameter = () => ({
  value: 0,
  setValueAtTime(value) { this.value = value; },
  linearRampToValueAtTime() {},
  exponentialRampToValueAtTime() {},
});
function audioContext({state = 'running', resume} = {}) {
  return class {
    constructor() {
      this.state = state;
      this.currentTime = 12;
      this.destination = {};
      this.oscillators = [];
      this.gains = [];
      this.resumeCalls = 0;
    }
    async resume() {
      this.resumeCalls++;
      if (resume) await resume(this);
      this.state = 'running';
    }
    createGain() {
      const gain = {gain: parameter(), connect() {}, disconnect() { this.disconnected = true; }};
      this.gains.push(gain);
      return gain;
    }
    createOscillator() {
      const oscillator = {
        frequency: parameter(),
        connect() {},
        disconnect() { this.disconnected = true; },
        start(time) { this.startTime = time; },
        stop(time) { this.stopTime = time; },
      };
      this.oscillators.push(oscillator);
      return oscillator;
    }
  };
}

test('sound is enabled by default and uses a shared audible output', async () => {
  const sound = new SoundEffects({Context: audioContext()});
  assert.equal(sound.enabled, true);
  assert.equal(await sound.tone(), true);
  assert.equal(sound.master.gain.value, 0.8);
  assert.equal(sound.context.oscillators.length, 1);
  assert.ok(sound.context.oscillators[0].startTime > sound.context.currentTime);
});

test('first effects wait for resume, including concurrent effects', async () => {
  let release;
  const resumed = new Promise(resolve => { release = resolve; });
  const sound = new SoundEffects({Context: audioContext({state: 'suspended', resume: () => resumed})});
  const first = sound.tone();
  const second = sound.tone();
  assert.equal(sound.context.resumeCalls, 1);
  assert.equal(sound.context.oscillators.length, 0);
  release();
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(sound.context.oscillators.length, 2);
});

test('muting silences active effects and skips new effects', async () => {
  const sound = new SoundEffects({Context: audioContext()});
  await sound.tone();
  sound.setEnabled(false);
  assert.equal(sound.master.gain.value, 0);
  assert.equal(await sound.tone(), false);
  assert.equal(sound.context.oscillators.length, 1);
  sound.setEnabled(true);
  assert.equal(sound.master.gain.value, 0.8);
  assert.equal(await sound.tone(), true);
});

test('mute/unmute does not replay effects waiting for browser unlock', async () => {
  let release;
  const resumed = new Promise(resolve => { release = resolve; });
  const sound = new SoundEffects({Context: audioContext({state: 'suspended', resume: () => resumed})});
  const pending = sound.tone();
  sound.setEnabled(false);
  sound.setEnabled(true);
  release();
  assert.equal(await pending, false);
  assert.equal(sound.context.oscillators.length, 0);
});

test('rejected audio resume is handled and can recover on later input', async () => {
  let reject = true;
  const sound = new SoundEffects({Context: audioContext({state: 'suspended', resume: () => {
    if (reject) throw new Error('Browser blocked audio');
  }})});
  assert.equal(await sound.tone(), false);
  reject = false;
  assert.equal(await sound.tone(), true);
  assert.equal(sound.context.resumeCalls, 2);
});

test('interrupted audio resumes and ended effects disconnect their nodes', async () => {
  const sound = new SoundEffects({Context: audioContext({state: 'interrupted'})});
  assert.equal(await sound.tone(), true);
  assert.equal(sound.context.resumeCalls, 1);
  const oscillator = sound.context.oscillators[0];
  const envelope = sound.context.gains[1];
  oscillator.onended();
  assert.equal(oscillator.disconnected, true);
  assert.equal(envelope.disconnected, true);
  assert.equal(sound.voices.size, 0);
});

test('a closed audio context is recreated', async () => {
  const sound = new SoundEffects({Context: audioContext()});
  await sound.tone();
  const previous = sound.context;
  previous.state = 'closed';
  assert.equal(await sound.tone(), true);
  assert.notEqual(sound.context, previous);
});

test('unavailable audio and initial mute do not break gameplay', async () => {
  const unsupported = new SoundEffects({Context: null});
  assert.equal(await unsupported.tone(), false);
  const muted = new SoundEffects({Context: audioContext(), enabled: false});
  assert.equal(await muted.tone(), false);
  assert.equal(muted.context, null);
});
