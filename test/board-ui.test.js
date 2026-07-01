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
  getSuccessAnimationDurations
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
