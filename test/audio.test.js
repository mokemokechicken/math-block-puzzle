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
    this.state = FakeAudioContext.initialState;
    this.nodes = [];
    this.resumeCalls = 0;
    this.resolveResume = null;
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

  resume() {
    this.resumeCalls += 1;

    if (FakeAudioContext.resumeMode === "immediate") {
      this.state = "running";
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.resolveResume = () => {
        this.state = "running";
        resolve();
      };
    });
  }
}

FakeAudioContext.instances = [];
FakeAudioContext.initialState = "running";
FakeAudioContext.resumeMode = "immediate";

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
  FakeAudioContext.initialState = "running";
  FakeAudioContext.resumeMode = "immediate";
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

test("sound controller unlocks and delays playback until a suspended context resumes", async () => {
  const originalAudioContext = globalThis.AudioContext;

  FakeAudioContext.instances = [];
  FakeAudioContext.initialState = "suspended";
  FakeAudioContext.resumeMode = "deferred";
  globalThis.AudioContext = FakeAudioContext;

  try {
    const controller = createSoundController();

    assert.equal(controller.unlock(), true);

    const context = FakeAudioContext.instances[0];
    assert.equal(context.resumeCalls, 1);
    assert.equal(context.nodes.length, 2);

    assert.equal(controller.play(SOUND_TYPES.correct), true);
    assert.equal(context.nodes.length, 2);

    context.resolveResume();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    assert.equal(context.state, "running");
    assert.equal(context.nodes.length > 2, true);
  } finally {
    globalThis.AudioContext = originalAudioContext;
    FakeAudioContext.initialState = "running";
    FakeAudioContext.resumeMode = "immediate";
  }
});
