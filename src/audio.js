(function defineGameAudio(global) {
  const SOUND_TYPES = Object.freeze({
    correct: "correct",
    comboCorrect: "combo-correct",
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
    let resumePromise = null;

    function getContext() {
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

      return audioContext;
    }

    function requestResume(context) {
      if (context.state === "running" || context.state === "closed" || typeof context.resume !== "function") {
        return null;
      }

      if (!resumePromise) {
        resumePromise = Promise.resolve(context.resume())
          .catch(() => null)
          .finally(() => {
            resumePromise = null;
          });
      }

      return resumePromise;
    }

    function playSilentUnlockTone(context) {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const startTime = context.currentTime;
      const endTime = startTime + 0.01;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, startTime);
      gainNode.gain.setValueAtTime(0.0001, startTime);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(startTime);
      oscillator.stop(endTime);
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

    function playPattern(context, soundType) {
      const now = context.currentTime;

      if (soundType === SOUND_TYPES.correct) {
        playTone(context, 523.25, now, 0.08);
        playTone(context, 659.25, now + 0.07, 0.1);
        return true;
      }

      if (soundType === SOUND_TYPES.comboCorrect) {
        playTone(context, 659.25, now, 0.07, 0.09);
        playTone(context, 783.99, now + 0.055, 0.08, 0.1);
        playTone(context, 987.77, now + 0.12, 0.09, 0.11);
        playTone(context, 1318.51, now + 0.2, 0.12, 0.09);
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
    }

    function unlock() {
      try {
        const context = getContext();

        if (!context) {
          return false;
        }

        playSilentUnlockTone(context);
        requestResume(context);
        return true;
      } catch (_error) {
        return false;
      }
    }

    function play(soundType) {
      try {
        const context = getContext();

        if (!context) {
          return false;
        }

        if (context.state === "running") {
          return playPattern(context, soundType);
        }

        const resume = requestResume(context);

        if (!resume) {
          return false;
        }

        resume.then(() => {
          if (!muted && context.state === "running") {
            playPattern(context, soundType);
          }
        });

        return true;
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
      unlock,
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
