import test from "node:test";
import assert from "node:assert/strict";
import "../src/config.js";
import "../src/rules.js";
import "../src/board.js";
import "../src/input.js";
import "../src/hints.js";
import "../src/audio.js";
import "../src/main.js";

const {
  createGameState,
  createBoardMarkup,
  createGamePanelMarkup,
  formatSelectionPreview,
  getFloatingEquationPoint,
  getFloatingEquationViewportPoint,
  getBoardRefillDelay,
  getSuccessAnimationDurations,
  playSuccessAnimation,
  nextBoardSeed,
  clearScheduledBoardRefresh,
  scheduleBoardRefresh,
  scheduleBoardRefill,
  scrollBoardIntoView,
  installAudioUnlockHandlers,
  applyHintStage,
  createHintController
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
