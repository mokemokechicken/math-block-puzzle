import test from "node:test";
import assert from "node:assert/strict";
import "../src/config.js";
import "../src/rules.js";
import "../src/board.js";
import "../src/input.js";
import "../src/hints.js";
import "../src/main.js";

const {
  createGameState,
  createBoardMarkup,
  formatSelectionPreview,
  getFloatingEquationPoint,
  getSuccessAnimationDurations,
  nextBoardSeed,
  clearScheduledBoardRefresh,
  scheduleBoardRefresh,
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
  const state = createGameState({ levelId: 2, seed: 2 });

  assert.equal(state.level.id, 2);
  assert.equal(state.board.length, 5);
  assert.equal(state.board[0].length, 5);
  assert.equal(state.allAnswers.length >= state.guaranteedAnswers.length, true);
});

test("board markup exposes cell ids and values for input wiring", () => {
  const state = createGameState({ levelId: 2, seed: 2 });
  const markup = createBoardMarkup(state);

  assert.match(markup, /data-game-board/);
  assert.match(markup, /data-cell-id="0:0"/);
  assert.match(markup, /data-value="/);
  assert.match(markup, /--board-size: 5/);
});

test("selection preview shows empty, partial, and complete expressions", () => {
  const level = getLevelConfig(2);

  assert.equal(formatSelectionPreview([], level), "ブロックをなぞって式を作ろう");
  assert.equal(formatSelectionPreview([cell(0, 0, 5)], level), "5");
  assert.equal(formatSelectionPreview([cell(0, 0, 5), cell(0, 1, 7)], level), "5 ± 7 = ?");
  assert.equal(formatSelectionPreview([
    cell(0, 0, 5),
    cell(0, 1, 7),
    cell(0, 2, 12)
  ], level), "5 + 7 = 12");
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

test("success animation durations follow reduced motion preference", () => {
  const originalMatchMedia = globalThis.matchMedia;

  globalThis.matchMedia = () => ({ matches: true });
  assert.deepEqual(getSuccessAnimationDurations(), { highlight: 180, floating: 240 });

  globalThis.matchMedia = () => ({ matches: false });
  assert.deepEqual(getSuccessAnimationDurations(), { highlight: 520, floating: 1200 });

  globalThis.matchMedia = originalMatchMedia;
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
