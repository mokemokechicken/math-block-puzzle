import test from "node:test";
import assert from "node:assert/strict";
import "../src/audio.js";

const { SOUND_TYPES, createSoundController } = globalThis.MathBlockPuzzleAudio;

class FakeAudioParam {
  setValueAtTime(value) {
    this.value = value;
  }

  exponentialRampToValueAtTime(value) {
    this.value = value;
  }
}

class FakeNode {
  constructor() {
    this.frequency = new FakeAudioParam();
    this.gain = new FakeAudioParam();
    this.started = false;
    this.stopped = false;
  }

  connect() {
    return undefined;
  }

  start() {
    this.started = true;
  }

  stop() {
    this.stopped = true;
  }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = {};
    this.state = "running";
    FakeAudioContext.instances.push(this);
  }

  createOscillator() {
    const node = new FakeNode();
    this.nodes.push(node);
    return node;
  }

  createGain() {
    const node = new FakeNode();
    this.nodes.push(node);
    return node;
  }
}

FakeAudioContext.instances = [];
FakeAudioContext.prototype.nodes = null;

test("sound controller is silent when Web Audio is unavailable", () => {
  const originalAudioContext = globalThis.AudioContext;
  const originalWebkitAudioContext = globalThis.webkitAudioContext;

  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;

  try {
    const controller = createSoundController();

    assert.equal(controller.play(SOUND_TYPES.correct), false);
    assert.equal(controller.isMuted(), false);
  } finally {
    globalThis.AudioContext = originalAudioContext;
    globalThis.webkitAudioContext = originalWebkitAudioContext;
  }
});

test("sound controller plays generated tones and supports mute", () => {
  const originalAudioContext = globalThis.AudioContext;

  FakeAudioContext.instances = [];
  FakeAudioContext.prototype.nodes = [];
  globalThis.AudioContext = FakeAudioContext;

  try {
    const controller = createSoundController();

    assert.equal(controller.play(SOUND_TYPES.correct), true);
    assert.equal(FakeAudioContext.instances.length, 1);
    assert.equal(FakeAudioContext.instances[0].nodes.length > 0, true);

    assert.equal(controller.toggleMuted(), true);
    assert.equal(controller.play(SOUND_TYPES.clear), false);
    assert.equal(controller.isMuted(), true);

    assert.equal(controller.setMuted(false), false);
    assert.equal(controller.play(SOUND_TYPES.hint), true);
  } finally {
    globalThis.AudioContext = originalAudioContext;
  }
});
