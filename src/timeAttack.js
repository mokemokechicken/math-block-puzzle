(function defineTimeAttack(global) {
  const BASE_SCORE = 10;
  const DURATION_MS = 60000;
  const CHAIN_LIMIT_MS = 10000;
  const FULL_MULTIPLIER_MS = 1000;
  const MAX_MULTIPLIER = 2;
  const MIN_MULTIPLIER = 1;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function calculateChainMultiplier(elapsedMs) {
    const elapsedSeconds = Math.max(0, Number(elapsedMs) || 0) / 1000;
    const multiplier = MAX_MULTIPLIER - ((elapsedSeconds - 1) / 9);

    return clamp(multiplier, MIN_MULTIPLIER, MAX_MULTIPLIER);
  }

  function createTimeAttackState() {
    return {
      startedAt: null,
      endsAt: null,
      score: 0,
      cumulativeMultiplier: MIN_MULTIPLIER,
      lastCorrectAt: null,
      lastGain: 0,
      lastMultiplier: MIN_MULTIPLIER
    };
  }

  function hasCountdownStarted(state) {
    return typeof state.startedAt === "number" && typeof state.endsAt === "number";
  }

  function startCountdown(state, now = Date.now()) {
    if (hasCountdownStarted(state)) {
      return state;
    }

    const startedAt = Number(now);

    return {
      ...state,
      startedAt,
      endsAt: startedAt + DURATION_MS
    };
  }

  function applyCorrectAnswer(state, now = Date.now()) {
    const currentTime = Number(now);
    const previousCorrectAt = state.lastCorrectAt;
    let cumulativeMultiplier = state.cumulativeMultiplier || MIN_MULTIPLIER;
    let lastMultiplier = MIN_MULTIPLIER;

    if (typeof previousCorrectAt === "number") {
      const elapsedMs = currentTime - previousCorrectAt;

      if (elapsedMs <= CHAIN_LIMIT_MS) {
        lastMultiplier = calculateChainMultiplier(elapsedMs);
        cumulativeMultiplier += lastMultiplier - MIN_MULTIPLIER;
      } else {
        cumulativeMultiplier = MIN_MULTIPLIER;
        lastMultiplier = MIN_MULTIPLIER;
      }
    }

    const bonusScore = Math.floor(BASE_SCORE * (cumulativeMultiplier - MIN_MULTIPLIER));
    const lastGain = BASE_SCORE + bonusScore;

    return {
      ...state,
      score: state.score + lastGain,
      cumulativeMultiplier,
      lastCorrectAt: currentTime,
      lastGain,
      lastMultiplier
    };
  }

  function getRemainingMs(state, now = Date.now()) {
    if (!hasCountdownStarted(state)) {
      return DURATION_MS;
    }

    return Math.max(0, state.endsAt - Number(now));
  }

  function isTimeUp(state, now = Date.now()) {
    return hasCountdownStarted(state) && getRemainingMs(state, now) <= 0;
  }

  function formatRemainingSeconds(remainingMs) {
    return String(Math.max(0, Math.ceil(remainingMs / 1000)));
  }

  function formatMultiplier(multiplier) {
    return `${(Math.round(multiplier * 10) / 10).toFixed(1)}x`;
  }

  global.MathBlockPuzzleTimeAttack = Object.freeze({
    BASE_SCORE,
    DURATION_MS,
    CHAIN_LIMIT_MS,
    FULL_MULTIPLIER_MS,
    calculateChainMultiplier,
    createTimeAttackState,
    hasCountdownStarted,
    startCountdown,
    applyCorrectAnswer,
    getRemainingMs,
    isTimeUp,
    formatRemainingSeconds,
    formatMultiplier
  });
})(globalThis);
