import test from "node:test";
import assert from "node:assert/strict";
import "../src/config.js";
import "../src/rules.js";
import "../src/board.js";
import "../src/input.js";
import "../src/main.js";

const {
  createGameState,
  createBoardMarkup,
  formatSelectionPreview,
  getFloatingEquationPoint,
  getSuccessAnimationDurations,
  nextBoardSeed,
  clearScheduledBoardRefresh,
  scheduleBoardRefresh
} = globalThis.MathBlockPuzzleApp;
const { getLevelConfig } = globalThis.MathBlockPuzzleConfig;

function cell(row, col, value) {
  return { id: `${row}:${col}`, row, col, value };
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
