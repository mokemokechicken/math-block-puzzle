import test from "node:test";
import assert from "node:assert/strict";
import "../src/config.js";
import "../src/board.js";

const { getLevelConfig } = globalThis.MathBlockPuzzleConfig;
const {
  createEmptyBoard,
  createSeededRandom,
  generateBoard,
  listLinePlacements,
  scanBoardForAnswers
} = globalThis.MathBlockPuzzleBoard;

test("empty board creates stable cell coordinates", () => {
  const board = createEmptyBoard(2, 3);

  assert.equal(board.length, 3);
  assert.equal(board[0].length, 2);
  assert.deepEqual(board[2][1], {
    id: "2:1",
    row: 2,
    col: 1,
    value: null
  });
});

test("line placements include only in-bounds horizontal and vertical lines", () => {
  const board = createEmptyBoard(4, 4);
  const placements = listLinePlacements(board, ["left-to-right", "top-to-bottom"], 3);

  assert.equal(placements.length, 16);
  assert.equal(placements.every((placement) => placement.cells.length === 3), true);
});

test("level 1 board guarantees at least four readable answers", () => {
  const result = generateBoard(1, { seed: 100 });
  const values = result.board.flat().map((cell) => cell.value);

  assert.equal(result.board.length, 4);
  assert.equal(result.board[0].length, 4);
  assert.equal(values.every((value) => value >= 1 && value <= 18), true);
  assert.equal(values.includes(0), false);
  assert.equal(result.guaranteedAnswers.length >= 4, true);
  assert.equal(
    result.guaranteedAnswers.every((answer) => (
      answer.directionId === "left-to-right" || answer.directionId === "top-to-bottom"
    )),
    true
  );
});

test("level 3 board can guarantee answers in all directions", () => {
  const level = getLevelConfig(3);
  const result = generateBoard(level, { seed: 300 });
  const directionSet = new Set(result.guaranteedAnswers.map((answer) => answer.directionId));

  assert.equal(result.guaranteedAnswers.length >= level.guaranteedAnswerCount, true);
  assert.equal([...directionSet].every((directionId) => level.guaranteedDirections.includes(directionId)), true);
});

test("board generation is deterministic with the same seed", () => {
  const first = generateBoard(2, { seed: 42 });
  const second = generateBoard(2, { seed: 42 });

  assert.deepEqual(
    first.board.map((row) => row.map((cell) => cell.value)),
    second.board.map((row) => row.map((cell) => cell.value))
  );
});

test("answer scanner finds known addition and subtraction lines", () => {
  const board = createEmptyBoard(3, 2);
  board[0][0].value = 5;
  board[0][1].value = 7;
  board[0][2].value = 12;
  board[1][0].value = 9;
  board[1][1].value = 4;
  board[1][2].value = 5;

  const answers = scanBoardForAnswers(board, getLevelConfig(2), ["left-to-right"]);

  assert.deepEqual(
    answers.map((answer) => answer.expression),
    ["5 + 7 = 12", "9 - 4 = 5"]
  );
});

test("seeded random produces repeatable values", () => {
  const first = createSeededRandom(7);
  const second = createSeededRandom(7);

  assert.equal(first(), second());
  assert.equal(first(), second());
});
