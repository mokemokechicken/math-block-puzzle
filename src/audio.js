(function defineGameAudio(global) {
  const SOUND_TYPES = Object.freeze({
    correct: "correct",
    incorrect: "incorrect",
    clear: "clear",
    hint: "hint"
  });

  function getAudioContextConstructor() {
    return global.AudioContext || global.webkitAudioContext || null;
  }

  function createSoundController(options = {}) {
    let audioContext = null;
    let muted = Boolean(options.muted);

    function ensureContext() {
      if (muted) {
        return null;
      }

      const AudioContextConstructor = getAudioContextConstructor();

      if (!AudioContextConstructor) {
        return null;
      }

      if (!audioContext) {
        audioContext = new AudioContextConstructor();
      }

      if (audioContext.state === "suspended") {
        audioContext.resume?.().catch?.(() => {});
      }

      return audioContext;
    }

    function playTone(context, frequency, startTime, duration, gain = 0.08) {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const endTime = startTime + duration;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(gain, startTime + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(startTime);
      oscillator.stop(endTime + 0.02);
    }

    function play(soundType) {
      try {
        const context = ensureContext();

        if (!context) {
          return false;
        }

        const now = context.currentTime;

        if (soundType === SOUND_TYPES.correct) {
          playTone(context, 523.25, now, 0.08);
          playTone(context, 659.25, now + 0.07, 0.1);
          return true;
        }

        if (soundType === SOUND_TYPES.incorrect) {
          playTone(context, 220, now, 0.1, 0.045);
          return true;
        }

        if (soundType === SOUND_TYPES.clear) {
          playTone(context, 523.25, now, 0.08);
          playTone(context, 659.25, now + 0.08, 0.08);
          playTone(context, 783.99, now + 0.16, 0.14);
          return true;
        }

        if (soundType === SOUND_TYPES.hint) {
          playTone(context, 880, now, 0.055, 0.035);
          return true;
        }

        return false;
      } catch (_error) {
        return false;
      }
    }

    function setMuted(nextMuted) {
      muted = Boolean(nextMuted);
      return muted;
    }

    function toggleMuted() {
      muted = !muted;
      return muted;
    }

    return {
      play,
      unlock: ensureContext,
      isMuted: () => muted,
      setMuted,
      toggleMuted
    };
  }

  global.MathBlockPuzzleAudio = Object.freeze({
    SOUND_TYPES,
    createSoundController
  });
})(globalThis);
