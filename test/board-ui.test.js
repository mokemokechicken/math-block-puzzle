import test from "node:test";
import assert from "node:assert/strict";
import "../src/config.js";
import "../src/rules.js";
import "../src/board.js";
import "../src/input.js";
import "../src/hints.js";
import "../src/audio.js";
import "../src/timeAttack.js";
import "../src/main.js";

const {
  createGameState,
  updateAnswerHeatMap,
  createBoardMarkup,
  createGamePanelMarkup,
  createClearMarkup,
  formatSelectionPreview,
  getFloatingEquationPoint,
  getFloatingEquationViewportPoint,
  getBoardRefillDelay,
  getSuccessAnimationDurations,
  playSuccessAnimation,
  nextBoardSeed,
  clearScheduledBoardRefresh,
  clearTimeAttackTimer,
  syncTimeAttackTimerState,
  getTimeAttackTickDelay,
  updateTimeAttackDisplay,
  startTimeAttackTimer,
  scheduleBoardRefresh,
  scheduleBoardRefill,
  scrollBoardIntoView,
  setText,
  setStyleProperty,
  installAudioUnlockHandlers,
  applyHintStage,
  createHintController,
  setupBoardInput
} = globalThis.MathBlockPuzzleApp;
const { getLevelConfig } = globalThis.MathBlockPuzzleConfig;

function cell(row, col, value) {
  return { id: `${row}:${col}`, row, col, value };
}

function cellElement(cellId) {
  const classes = new Set();

  return {
    dataset: { cellId },
    classList: {
      add: (className) => classes.add(className),
      remove: (className) => classes.delete(className),
      contains: (className) => classes.has(className)
    }
  };
}

function boardRootFor(elements) {
  return {
    querySelectorAll: (selector) => (selector === "[data-cell-id]" ? elements : [])
  };
}

class GestureAudioParam {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class GestureAudioNode {
  constructor() {
    this.frequency = new GestureAudioParam();
    this.gain = new GestureAudioParam();
  }

  connect() {}
  start() {}
  stop() {}
}

class GestureAudioContext {
  constructor() {
    this.currentTime = 0;
    this.destination = {};
    this.state = "suspended";
    this.resumeCalls = 0;
    this.nodes = [];
    GestureAudioContext.instances.push(this);
  }

  createOscillator() {
    const node = new GestureAudioNode();
    this.nodes.push(node);
    return node;
  }

  createGain() {
    const node = new GestureAudioNode();
    this.nodes.push(node);
    return node;
  }

  resume() {
    this.resumeCalls += 1;
    this.state = "running";
    return Promise.resolve();
  }
}

GestureAudioContext.instances = [];

function createHintFixture() {
  const ids = ["0:0", "0:1", "0:2"];
  const elements = ids.map(cellElement);
  const cells = ids.map((id, index) => ({
    id,
    row: 0,
    col: index,
    value: [5, 7, 12][index],
    element: elements[index]
  }));

  return {
    boardRoot: boardRootFor(elements),
    cellMap: new Map(cells.map((hintCell) => [hintCell.id, hintCell])),
    elements,
    answer: {
      cells: cells.map(({ id, row, col, value }) => ({ id, row, col, value })),
      expression: "5 + 7 = 12"
    }
  };
}

test("game state creates a generated board for the selected level", () => {
  const state = createGameState({ levelId: 5, seed: 5 });

  assert.equal(state.level.id, 5);
  assert.equal(state.board.length, 5);
  assert.equal(state.board[0].length, 5);
  assert.equal(state.correctCount, 0);
  assert.equal(state.level.clearAnswerCount, 5);
  assert.equal(state.allAnswers.length >= state.guaranteedAnswers.length, true);
  assert.deepEqual(state.answerHeatMap, {});
});

test("answer heat map decays old cells and warms selected cells", () => {
  const heatMap = updateAnswerHeatMap(
    {
      "0:0": 1,
      "3:3": 0.04
    },
    [
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 }
    ]
  );

  assert.equal(heatMap["0:0"], 0.75);
  assert.equal(heatMap["0:1"], 1);
  assert.equal(heatMap["0:2"], 1);
  assert.equal(heatMap["0:3"], 1);
  assert.equal("3:3" in heatMap, false);
});

test("board markup exposes cell ids and values for input wiring", () => {
  const state = createGameState({ levelId: 5, seed: 5 });
  const markup = createBoardMarkup(state);

  assert.match(markup, /data-game-board/);
  assert.match(markup, /data-cell-id="0:0"/);
  assert.match(markup, /data-value="/);
  assert.match(markup, /--board-size: 5/);
});

test("selection preview shows empty, partial, and complete expressions", () => {
  const level = getLevelConfig(4);

  assert.equal(formatSelectionPreview([], level), "ブロックをなぞって式を作ろう");
  assert.equal(formatSelectionPreview([cell(0, 0, 5)], level), "5");
  assert.equal(formatSelectionPreview([cell(0, 0, 5), cell(0, 1, 4)], level), "5 ± 4 = ?");
  assert.equal(formatSelectionPreview([
    cell(0, 0, 5),
    cell(0, 1, 4),
    cell(0, 2, 9)
  ], level), "5 + 4 = 9");
});

test("game panel exposes level selection, progress, and audio control", () => {
  const state = createGameState({ levelId: 1, seed: 1 });
  const markup = createGamePanelMarkup(state);

  assert.match(markup, /data-level-id="1"/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /0 \/ 5/);
  assert.match(markup, /role="progressbar"/);
  assert.match(markup, /aria-label="ステージ進捗"/);
  assert.match(markup, /aria-valuenow="0"/);
  assert.match(markup, /aria-valuemax="5"/);
  assert.match(markup, /--progress-percent: 0%/);
  assert.match(markup, /data-game-mode="normal"/);
  assert.match(markup, /data-game-mode="time-attack"/);
  assert.match(markup, />通常</);
  assert.match(markup, />1分アタック</);
  assert.match(markup, /data-audio-toggle/);
  assert.doesNotMatch(markup, /こ見つかる/);
  assert.doesNotMatch(markup, /盤面の正解候補数/);
});

test("game panel progress bar reflects completed answers", () => {
  const state = createGameState({ levelId: 1, seed: 1, correctCount: 3 });
  const markup = createGamePanelMarkup(state);

  assert.match(markup, /3 \/ 5/);
  assert.match(markup, /aria-valuenow="3"/);
  assert.match(markup, /--progress-percent: 60%/);
});

test("time attack mode exposes timer, score, and multiplier status", () => {
  const state = createGameState({ levelId: 1, seed: 1, mode: "time-attack" });
  const markup = createGamePanelMarkup(state);

  assert.equal(state.mode, "time-attack");
  assert.equal(state.timeAttack.startedAt, null);
  assert.equal(state.timeAttack.endsAt, null);
  assert.match(markup, /1分でハイスコアを狙おう/);
  assert.match(markup, /data-time-remaining/);
  assert.match(markup, /data-time-score/);
  assert.match(markup, /data-time-multiplier/);
  assert.match(markup, /data-time-gain/);
  assert.match(markup, /data-time-remaining>60</);
  assert.doesNotMatch(markup, /role="progressbar"/);
});

test("time attack timer waits until countdown starts", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let timeoutCallback = null;
  const root = {
    querySelector: () => null
  };

  globalThis.setTimeout = (callback) => {
    timeoutCallback = callback;
    return 1000;
  };
  globalThis.clearTimeout = () => {};

  try {
    const state = createGameState({ levelId: 1, seed: 1, mode: "time-attack" });
    startTimeAttackTimer(root, state);

    assert.equal(timeoutCallback, null);
  } finally {
    clearTimeAttackTimer();
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("time attack clear panel shows final score on time up", () => {
  const state = createGameState({ levelId: 2, seed: 2, mode: "time-attack", now: 1000 });
  const markup = createClearMarkup({
    ...state,
    completed: true,
    completionReason: "time-up",
    timeAttack: {
      ...state.timeAttack,
      score: 42
    }
  });

  assert.match(markup, /タイムアップ/);
  assert.match(markup, /最終スコア 42点/);
  assert.match(markup, /data-next-level="3"/);
});

test("time attack display updater reflects latest score state", () => {
  const now = Date.now();
  const textNodes = new Map([
    ["[data-time-remaining]", { textContent: "" }],
    ["[data-time-score]", { textContent: "" }],
    ["[data-time-multiplier]", { textContent: "" }],
    ["[data-time-gain]", { textContent: "" }]
  ]);
  const fill = {
    style: {
      values: new Map(),
      getPropertyValue(name) {
        return this.values.get(name) ?? "";
      },
      setProperty(name, value) {
        this.values.set(name, value);
      }
    }
  };
  const root = {
    querySelector: (selector) => selector === "[data-time-fill]" ? fill : textNodes.get(selector)
  };
  const state = createGameState({
    levelId: 1,
    seed: 1,
    mode: "time-attack",
    timeAttack: {
      startedAt: now - 1000,
      endsAt: now + 5000,
      score: 28,
      cumulativeMultiplier: 1.889,
      lastCorrectAt: now - 2000,
      lastGain: 18,
      lastMultiplier: 1.889
    }
  });

  assert.equal(updateTimeAttackDisplay(root, state) > 0, true);
  assert.equal(textNodes.get("[data-time-remaining]").textContent, "5");
  assert.equal(textNodes.get("[data-time-score]").textContent, "28");
  assert.equal(textNodes.get("[data-time-multiplier]").textContent, "1.9x");
  assert.equal(textNodes.get("[data-time-gain]").textContent, "+18");
  assert.equal(Number(fill.style.values.get("--time-scale")) > 0, true);
  assert.equal(Number(fill.style.values.get("--time-scale")) <= 1, true);
});

test("time attack tick delay schedules the next second boundary", () => {
  assert.equal(getTimeAttackTickDelay(60000), 1000);
  assert.equal(getTimeAttackTickDelay(59500), 500);
  assert.equal(getTimeAttackTickDelay(500), 500);
  assert.equal(getTimeAttackTickDelay(0), 0);
});

test("text and style updates skip unchanged values", () => {
  let textWriteCount = 0;
  const textElement = {};
  Object.defineProperty(textElement, "textContent", {
    get() {
      return "同じ";
    },
    set() {
      textWriteCount += 1;
    }
  });

  let styleWriteCount = 0;
  const styleElement = {
    style: {
      getPropertyValue: () => "1",
      setProperty: () => {
        styleWriteCount += 1;
      }
    }
  };

  setText(textElement, "同じ");
  setStyleProperty(styleElement, "--time-scale", "1");

  assert.equal(textWriteCount, 0);
  assert.equal(styleWriteCount, 0);
});

test("time attack timer keeps counting while pending refill uses latest score state", () => {
  const originalDateNow = Date.now;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let currentNow = 100000;
  let timeoutCallback = null;
  let timeoutDelay = null;
  const textNodes = new Map([
    ["[data-time-remaining]", { textContent: "" }],
    ["[data-time-score]", { textContent: "" }],
    ["[data-time-multiplier]", { textContent: "" }],
    ["[data-time-gain]", { textContent: "" }]
  ]);
  const fill = {
    style: {
      setProperty() {}
    }
  };
  const root = {
    querySelector: (selector) => selector === "[data-time-fill]" ? fill : textNodes.get(selector)
  };

  Date.now = () => currentNow;
  globalThis.setTimeout = (callback, delay) => {
    timeoutCallback = callback;
    timeoutDelay = delay;
    return 1001;
  };
  globalThis.clearTimeout = () => {};

  try {
    const initial = createGameState({ levelId: 1, seed: 1, mode: "time-attack" });
    const state = {
      ...initial,
      timeAttack: globalThis.MathBlockPuzzleTimeAttack.startCountdown(initial.timeAttack, currentNow)
    };

    startTimeAttackTimer(root, state);
    assert.equal(textNodes.get("[data-time-score]").textContent, "0");
    assert.equal(textNodes.get("[data-time-remaining]").textContent, "60");
    assert.equal(typeof timeoutCallback, "function");
    assert.equal(timeoutDelay, 1000);

    const nextState = {
      ...state,
      timeAttack: globalThis.MathBlockPuzzleTimeAttack.applyCorrectAnswer(state.timeAttack, currentNow + 100)
    };

    syncTimeAttackTimerState(nextState);
    updateTimeAttackDisplay(root, nextState);

    currentNow += 1500;
    timeoutCallback();

    assert.equal(textNodes.get("[data-time-score]").textContent, "10");
    assert.equal(textNodes.get("[data-time-gain]").textContent, "+10");
    assert.equal(textNodes.get("[data-time-remaining]").textContent, "59");
    assert.equal(timeoutDelay, 500);
  } finally {
    clearTimeAttackTimer();
    Date.now = originalDateNow;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("stale time attack timeout callback does not update after timer is cleared", () => {
  const originalDateNow = Date.now;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let currentNow = 200000;
  let timeoutCallback = null;
  const textNodes = new Map([
    ["[data-time-remaining]", { textContent: "keep" }],
    ["[data-time-score]", { textContent: "keep" }],
    ["[data-time-multiplier]", { textContent: "keep" }],
    ["[data-time-gain]", { textContent: "keep" }]
  ]);
  const fill = {
    style: {
      setProperty() {}
    }
  };
  const root = {
    querySelector: (selector) => selector === "[data-time-fill]" ? fill : textNodes.get(selector)
  };

  Date.now = () => currentNow;
  globalThis.setTimeout = (callback) => {
    timeoutCallback = callback;
    return 1002;
  };
  globalThis.clearTimeout = () => {};

  try {
    const initial = createGameState({ levelId: 1, seed: 1, mode: "time-attack" });
    const state = {
      ...initial,
      timeAttack: globalThis.MathBlockPuzzleTimeAttack.startCountdown(initial.timeAttack, currentNow)
    };

    startTimeAttackTimer(root, state);
    clearTimeAttackTimer();

    textNodes.get("[data-time-remaining]").textContent = "keep";
    textNodes.get("[data-time-score]").textContent = "keep";
    currentNow += 61000;
    timeoutCallback();

    assert.equal(textNodes.get("[data-time-remaining]").textContent, "keep");
    assert.equal(textNodes.get("[data-time-score]").textContent, "keep");
  } finally {
    clearTimeAttackTimer();
    Date.now = originalDateNow;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("time attack selection completion uses one timestamp for timeout and scoring", () => {
  const originalDateNow = Date.now;
  const originalInput = globalThis.MathBlockPuzzleInput;
  const originalRules = globalThis.MathBlockPuzzleRules;
  const originalTimeAttack = globalThis.MathBlockPuzzleTimeAttack;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const state = createGameState({ levelId: 1, seed: 1, mode: "time-attack", now: 0 });
  const selection = [
    { id: "0:0", row: 0, col: 0, value: 1, element: cellElement("0:0") },
    { id: "0:1", row: 0, col: 1, value: 1, element: cellElement("0:1") },
    { id: "0:2", row: 0, col: 2, value: 2, element: cellElement("0:2") }
  ];
  const boardRoot = {
    classList: {
      add() {}
    },
    querySelectorAll: () => []
  };
  const root = {
    querySelector: (selector) => ({
      "[data-game-board]": boardRoot,
      "[data-status-text]": { textContent: "" },
      "[data-expression-preview]": { textContent: "" },
      "[data-time-remaining]": { textContent: "" },
      "[data-time-score]": { textContent: "" },
      "[data-time-multiplier]": { textContent: "" },
      "[data-time-gain]": { textContent: "" },
      "[data-time-fill]": { style: { setProperty() {} } }
    })[selector] ?? null
  };
  let isTimeUpNow = null;
  let applyNow = null;
  let dateCallCount = 0;

  Date.now = () => {
    dateCallCount += 1;
    return dateCallCount === 1 ? 59999 : 60001;
  };
  globalThis.setTimeout = () => 2001;
  globalThis.clearTimeout = () => {};
  globalThis.MathBlockPuzzleInput = {
    createElementCellResolver: () => null,
    createPointerDragController: (options) => {
      options.onSelectionComplete(selection);
      return { destroy() {} };
    }
  };
  globalThis.MathBlockPuzzleRules = {
    ...originalRules,
    validateSelection: () => ({
      valid: true,
      expression: "1 + 1 = 2"
    })
  };
  globalThis.MathBlockPuzzleTimeAttack = {
    ...originalTimeAttack,
    isTimeUp: (timeAttackState, now) => {
      isTimeUpNow = now;
      return originalTimeAttack.isTimeUp(timeAttackState, now);
    },
    applyCorrectAnswer: (timeAttackState, now) => {
      applyNow = now;
      return originalTimeAttack.applyCorrectAnswer(timeAttackState, now);
    }
  };

  try {
    setupBoardInput(root, state);

    assert.equal(isTimeUpNow, 59999);
    assert.equal(applyNow, 59999);
  } finally {
    clearScheduledBoardRefresh();
    clearTimeAttackTimer();
    Date.now = originalDateNow;
    globalThis.MathBlockPuzzleInput = originalInput;
    globalThis.MathBlockPuzzleRules = originalRules;
    globalThis.MathBlockPuzzleTimeAttack = originalTimeAttack;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("global audio unlock handlers prepare sound on the first page gesture", () => {
  const originalAudioContext = globalThis.AudioContext;
  const handlers = {};
  const documentTarget = {
    addEventListener: (eventName, handler, options) => {
      handlers[eventName] = { handler, options };
    }
  };

  GestureAudioContext.instances = [];
  globalThis.AudioContext = GestureAudioContext;

  try {
    assert.equal(installAudioUnlockHandlers(documentTarget), true);
    assert.equal(typeof handlers.pointerdown.handler, "function");
    assert.equal(handlers.pointerdown.options.capture, true);
    assert.equal(handlers.pointerdown.options.passive, true);

    handlers.pointerdown.handler();

    assert.equal(GestureAudioContext.instances.length, 1);
    assert.equal(GestureAudioContext.instances[0].resumeCalls, 1);
    assert.equal(GestureAudioContext.instances[0].nodes.length, 2);
  } finally {
    globalThis.AudioContext = originalAudioContext;
  }
});

test("floating equation point uses selected cell centers relative to board", () => {
  const boardRoot = {
    getBoundingClientRect: () => ({ left: 10, top: 20 })
  };
  const selectedCells = [
    { element: { getBoundingClientRect: () => ({ left: 20, top: 40, width: 40, height: 40 }) } },
    { element: { getBoundingClientRect: () => ({ left: 70, top: 40, width: 40, height: 40 }) } },
    { element: { getBoundingClientRect: () => ({ left: 120, top: 40, width: 40, height: 40 }) } }
  ];

  assert.deepEqual(getFloatingEquationPoint(boardRoot, selectedCells), { x: 80, y: 40 });
});

test("floating equation viewport point is stable after board rerender", () => {
  const selectedCells = [
    { element: { getBoundingClientRect: () => ({ left: 20, top: 40, width: 40, height: 40 }) } },
    { element: { getBoundingClientRect: () => ({ left: 70, top: 40, width: 40, height: 40 }) } },
    { element: { getBoundingClientRect: () => ({ left: 120, top: 40, width: 40, height: 40 }) } }
  ];

  assert.deepEqual(getFloatingEquationViewportPoint(selectedCells), { x: 90, y: 60 });
});

test("success animation durations follow reduced motion preference", () => {
  const originalMatchMedia = globalThis.matchMedia;

  globalThis.matchMedia = () => ({ matches: true });
  assert.deepEqual(getSuccessAnimationDurations(), { highlight: 180, floating: 240 });
  assert.equal(getBoardRefillDelay(), 60);

  globalThis.matchMedia = () => ({ matches: false });
  assert.deepEqual(getSuccessAnimationDurations(), { highlight: 520, floating: 1200 });
  assert.equal(getBoardRefillDelay(), 120);

  globalThis.matchMedia = originalMatchMedia;
});

test("success animation detaches floating equation so refill can rerender the board", () => {
  const originalDocument = globalThis.document;
  const originalSetTimeout = globalThis.setTimeout;
  const appended = [];
  const callbacks = [];
  const floating = {
    className: "",
    textContent: "",
    style: {},
    remove: () => {
      floating.removed = true;
    }
  };
  const selectedCells = [
    {
      element: {
        dataset: {},
        classList: { add: () => {}, remove: () => {} },
        getBoundingClientRect: () => ({ left: 20, top: 40, width: 40, height: 40 })
      }
    }
  ];
  const boardRoot = {
    append: () => {
      throw new Error("floating equation should be detached from board root");
    }
  };

  globalThis.document = {
    body: {
      append: (element) => appended.push(element)
    },
    createElement: () => floating
  };
  globalThis.setTimeout = (callback) => {
    callbacks.push(callback);
    return callbacks.length;
  };

  try {
    playSuccessAnimation(boardRoot, selectedCells, "1 + 6 = 7");

    assert.equal(appended[0], floating);
    assert.match(floating.className, /floating-equation--detached/);
    assert.equal(floating.textContent, "1 + 6 = 7");
    assert.equal(floating.style.left, "40px");
    assert.equal(floating.style.top, "60px");

    callbacks[0]();
    assert.equal(floating.removed, true);
  } finally {
    globalThis.document = originalDocument;
    globalThis.setTimeout = originalSetTimeout;
  }
});

test("next board seed increases monotonically for board refresh", () => {
  const first = nextBoardSeed();
  const second = nextBoardSeed();

  assert.equal(second, first + 1);
});

test("scheduling a board refresh clears the previous refresh timer", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const cleared = [];
  let nextTimerId = 1;

  globalThis.setTimeout = () => nextTimerId++;
  globalThis.clearTimeout = (timerId) => {
    cleared.push(timerId);
  };

  try {
    scheduleBoardRefresh({ innerHTML: "" }, 2, 100);
    scheduleBoardRefresh({ innerHTML: "" }, 2, 100);

    assert.deepEqual(cleared, [1]);
  } finally {
    clearScheduledBoardRefresh();
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("queued stale board refresh callbacks do not render over newer state", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const callbacks = [];
  const root = { innerHTML: "" };

  globalThis.setTimeout = (callback) => {
    callbacks.push(callback);
    return callbacks.length;
  };
  globalThis.clearTimeout = () => {};

  try {
    scheduleBoardRefresh(root, 2, 100);
    scheduleBoardRefresh(root, 2, 100);

    callbacks[0]();
    assert.equal(root.innerHTML, "");

    callbacks[1]();
    assert.match(root.innerHTML, /data-game-panel/);
  } finally {
    clearScheduledBoardRefresh();
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("scheduled board refill keeps progress and replaces board values", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const callbacks = [];
  const state = createGameState({ levelId: 2, seed: 22 });
  const root = { innerHTML: "" };
  const selectedCells = [
    state.board[0][0],
    state.board[0][1],
    state.board[0][2]
  ];

  globalThis.setTimeout = (callback) => {
    callbacks.push(callback);
    return callbacks.length;
  };
  globalThis.clearTimeout = () => {};

  try {
    scheduleBoardRefill(root, { ...state, correctCount: 1 }, selectedCells, 100);
    callbacks[0]();

    assert.match(root.innerHTML, /1 \/ 5/);
    assert.match(root.innerHTML, /data-game-board/);
  } finally {
    clearScheduledBoardRefresh();
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("scheduled board refill passes answer heat map to board refill", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalBoard = globalThis.MathBlockPuzzleBoard;
  const callbacks = [];
  const state = createGameState({ levelId: 2, seed: 22 });
  const answerHeatMap = { "0:0": 1 };
  const root = { innerHTML: "" };
  const selectedCells = [
    state.board[0][0],
    state.board[0][1],
    state.board[0][2]
  ];
  let capturedOptions = null;

  globalThis.setTimeout = (callback) => {
    callbacks.push(callback);
    return callbacks.length;
  };
  globalThis.clearTimeout = () => {};
  globalThis.MathBlockPuzzleBoard = {
    ...originalBoard,
    refillCells(board, cells, level, options) {
      capturedOptions = options;
      return originalBoard.refillCells(board, cells, level, options);
    }
  };

  try {
    scheduleBoardRefill(root, { ...state, correctCount: 1, answerHeatMap }, selectedCells, 100);
    callbacks[0]();

    assert.equal(capturedOptions.answerHeatMap, answerHeatMap);
  } finally {
    clearScheduledBoardRefresh();
    globalThis.MathBlockPuzzleBoard = originalBoard;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("time attack countdown starts after the first cleared cells are refilled", () => {
  const originalDateNow = Date.now;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const callbacks = [];
  const timeNodes = new Map([
    ["[data-time-remaining]", { textContent: "" }],
    ["[data-time-score]", { textContent: "" }],
    ["[data-time-multiplier]", { textContent: "" }],
    ["[data-time-gain]", { textContent: "" }],
    ["[data-time-fill]", { style: { setProperty() {} } }]
  ]);
  const initial = createGameState({ levelId: 1, seed: 15, mode: "time-attack" });
  const scoredState = {
    ...initial,
    correctCount: 1,
    timeAttack: globalThis.MathBlockPuzzleTimeAttack.applyCorrectAnswer(initial.timeAttack, 4000)
  };
  const selectedCells = [
    initial.board[0][0],
    initial.board[0][1],
    initial.board[0][2]
  ];
  const root = {
    innerHTML: "",
    querySelectorAll: () => [],
    querySelector: (selector) => timeNodes.get(selector) ?? null
  };

  Date.now = () => 5000;
  globalThis.setTimeout = (callback) => {
    callbacks.push(callback);
    return callbacks.length;
  };
  globalThis.clearTimeout = () => {};

  try {
    scheduleBoardRefill(root, scoredState, selectedCells, 100);
    callbacks[0]();

    assert.match(root.innerHTML, /data-time-score>10</);
    assert.match(root.innerHTML, /data-time-remaining>60</);
    assert.equal(typeof callbacks[1], "function");
    assert.equal(timeNodes.get("[data-time-score]").textContent, "10");
    assert.equal(timeNodes.get("[data-time-remaining]").textContent, "60");
  } finally {
    clearScheduledBoardRefresh();
    clearTimeAttackTimer();
    Date.now = originalDateNow;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("scheduled board refill renders clear state at target count", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const callbacks = [];
  const state = createGameState({ levelId: 1, seed: 11 });
  const root = { innerHTML: "" };

  globalThis.setTimeout = (callback) => {
    callbacks.push(callback);
    return callbacks.length;
  };
  globalThis.clearTimeout = () => {};

  try {
    scheduleBoardRefill(root, { ...state, correctCount: 5 }, [state.board[0][0]], 100);
    callbacks[0]();

    assert.match(root.innerHTML, /data-clear-panel/);
    assert.match(root.innerHTML, /5問できました/);
    assert.doesNotMatch(root.innerHTML, /data-game-board/);
  } finally {
    clearScheduledBoardRefresh();
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("scrolling a new stage uses the board bottom as the viewport anchor", () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalSetTimeout = globalThis.setTimeout;
  const originalScrollTo = globalThis.scrollTo;
  const originalInnerHeight = globalThis.innerHeight;
  const originalScrollY = globalThis.scrollY;
  const originalScrollX = globalThis.scrollX;
  const callbacks = [];
  const timeoutCallbacks = [];
  const scrollCalls = [];
  const boardElement = {
    getBoundingClientRect: () => ({ bottom: 900 })
  };
  const root = {
    innerHTML: "",
    querySelectorAll: () => [],
    querySelector: (selector) => (selector === "[data-game-board]" ? boardElement : null)
  };

  globalThis.requestAnimationFrame = (callback) => {
    callbacks.push(callback);
    return callbacks.length;
  };
  globalThis.setTimeout = (callback) => {
    timeoutCallbacks.push(callback);
    return timeoutCallbacks.length;
  };
  globalThis.scrollTo = (options) => {
    scrollCalls.push(options);
  };
  globalThis.innerHeight = 640;
  globalThis.scrollY = 100;
  globalThis.scrollX = 8;

  try {
    assert.equal(scrollBoardIntoView(root), true);

    assert.equal(callbacks.length, 1);

    callbacks[0]();
    assert.equal(callbacks.length, 2);
    callbacks[1]();

    assert.deepEqual(scrollCalls, [{
      top: 376,
      left: 8,
      behavior: "smooth"
    }]);
    assert.equal(timeoutCallbacks.length, 1);

    timeoutCallbacks[0]();
    assert.deepEqual(scrollCalls.at(-1), {
      top: 376,
      left: 8,
      behavior: "smooth"
    });
  } finally {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.scrollTo = originalScrollTo;
    globalThis.innerHeight = originalInnerHeight;
    globalThis.scrollY = originalScrollY;
    globalThis.scrollX = originalScrollX;
  }
});

test("scrolling the board into view is a no-op when the board is absent", () => {
  const root = {
    querySelector: () => null
  };

  assert.equal(scrollBoardIntoView(root), false);
});

test("hint stage marking uses distinct source, answer, and line classes", () => {
  const { boardRoot, cellMap, elements, answer } = createHintFixture();

  applyHintStage(boardRoot, cellMap, answer, 1);
  assert.equal(elements[0].classList.contains("is-hint-source"), true);
  assert.equal(elements[2].classList.contains("is-hint-answer"), false);

  applyHintStage(boardRoot, cellMap, answer, 2);
  assert.equal(elements[0].classList.contains("is-hint-source"), false);
  assert.equal(elements[2].classList.contains("is-hint-answer"), true);

  applyHintStage(boardRoot, cellMap, answer, 4);
  assert.equal(elements.every((element) => element.classList.contains("is-hint-line")), true);
});

test("hint controller advances, resets, and ignores stale callbacks", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const callbacks = [];
  const { boardRoot, cellMap, elements, answer } = createHintFixture();
  const expressionPreview = { textContent: "" };
  const statusText = { textContent: "" };
  let controller = null;

  globalThis.setTimeout = (callback) => {
    callbacks.push(callback);
    return callbacks.length;
  };
  globalThis.clearTimeout = () => {};

  try {
    controller = createHintController({
      boardRoot,
      cellMap,
      answer,
      expressionPreview,
      statusText,
      delays: [10, 20, 30, 40]
    });

    callbacks[0]();
    assert.equal(elements[0].classList.contains("is-hint-source"), true);
    assert.equal(statusText.textContent, "ヒントが光っています");

    callbacks[3]();
    assert.equal(expressionPreview.textContent, "ヒント: 5 + 7 = 12");
    assert.equal(elements.every((element) => element.classList.contains("is-hint-line")), true);

    controller.reset();
    assert.equal(elements.some((element) => element.classList.contains("is-hint-line")), false);

    callbacks[1]();
    assert.equal(elements[2].classList.contains("is-hint-answer"), false);

    callbacks[4]();
    assert.equal(elements[0].classList.contains("is-hint-source"), true);
  } finally {
    controller?.destroy();
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});
