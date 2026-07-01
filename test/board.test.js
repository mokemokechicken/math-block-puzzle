import test from "node:test";
import assert from "node:assert/strict";
import "../src/config.js";
import "../src/rules.js";
import "../src/board.js";

const { getLevelConfig } = globalThis.MathBlockPuzzleConfig;
const {
  createEmptyBoard,
  createSeededRandom,
  generateBoard,
  listLinePlacements,
  refillCells,
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
  assert.equal(values.every((value) => value >= 1 && value <= 5), true);
  assert.equal(values.includes(0), false);
  assert.equal(result.guaranteedAnswers.length >= 4, true);
  assert.equal(
    result.guaranteedAnswers.every((answer) => (
      answer.directionId === "left-to-right" || answer.directionId === "top-to-bottom"
    )),
    true
  );
});

test("master level board guarantees readable answers", () => {
  const level = getLevelConfig(9);
  const result = generateBoard(level, { seed: 900 });
  const directionSet = new Set(result.guaranteedAnswers.map((answer) => answer.directionId));

  assert.equal(result.guaranteedAnswers.length >= level.guaranteedAnswerCount, true);
  assert.equal([...directionSet].every((directionId) => (
    directionId === "left-to-right" || directionId === "top-to-bottom"
  )), true);
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

  const answers = scanBoardForAnswers(board, getLevelConfig(9), ["left-to-right"]);

  assert.deepEqual(
    answers.map((answer) => answer.expression),
    ["5 + 7 = 12", "9 - 4 = 5"]
  );
});

test("answer scanner filters equations outside the level target", () => {
  const board = createEmptyBoard(3, 1);
  board[0][0].value = 5;
  board[0][1].value = 7;
  board[0][2].value = 12;

  assert.deepEqual(scanBoardForAnswers(board, getLevelConfig(2), ["left-to-right"]), []);
  assert.equal(scanBoardForAnswers(board, getLevelConfig(5), ["left-to-right"]).length, 1);
});

test("refill cells preserves the readable guarantee count", () => {
  const generated = generateBoard(2, { seed: 200 });
  const before = generated.board.map((row) => row.map((cell) => cell.value));
  const cells = [
    generated.board[0][0],
    generated.board[0][1],
    generated.board[0][2]
  ];
  const refilled = refillCells(generated.board, cells, generated.level, { seed: 201 });
  const after = refilled.board.map((row) => row.map((cell) => cell.value));

  assert.notDeepEqual(after[0].slice(0, 3), before[0].slice(0, 3));
  assert.equal(refilled.board.flat().every((cell) => cell.value >= 1 && cell.value <= 10), true);
  assert.equal(refilled.guaranteedAnswers.length >= generated.level.guaranteedAnswerCount, true);
  assert.equal(refilled.allAnswers.length >= refilled.guaranteedAnswers.length, true);
});

test("refill cells restores guarantees without breaking existing disjoint answers", () => {
  const baseLevel = getLevelConfig(1);
  const level = { ...baseLevel, guaranteedAnswerCount: 2 };
  const board = createEmptyBoard(4, 4);

  for (const row of board) {
    for (const boardCell of row) {
      boardCell.value = 5;
    }
  }

  board[3][0].value = 1;
  board[3][1].value = 1;
  board[3][2].value = 2;

  const refilled = refillCells(board, [board[0][0]], level, { random: () => 0.99 });
  const preservedAnswer = refilled.allAnswers.find((answer) => (
    answer.directionId === "left-to-right" &&
    answer.expression === "1 + 1 = 2" &&
    answer.cells.map((cell) => cell.id).join(",") === "3:0,3:1,3:2"
  ));

  assert.equal(refilled.guaranteedAnswers.length >= level.guaranteedAnswerCount, true);
  assert.ok(preservedAnswer);
  assert.deepEqual(refilled.board[3].slice(0, 3).map((cell) => cell.value), [1, 1, 2]);
  assert.equal(refilled.board.flat().some((cell) => (
    cell.id !== "0:0" &&
    cell.id !== "3:0" &&
    cell.id !== "3:1" &&
    cell.id !== "3:2" &&
    cell.value !== 5
  )), true);
});

test("seeded random produces repeatable values", () => {
  const first = createSeededRandom(7);
  const second = createSeededRandom(7);

  assert.equal(first(), second());
  assert.equal(first(), second());
});
