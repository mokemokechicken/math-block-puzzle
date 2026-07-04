import test from "node:test";
import assert from "node:assert/strict";
import "../src/config.js";
import "../src/rules.js";
import "../src/board.js";

const {
  LEVELS,
  NUMBER_RANGE,
  OPERATIONS,
  getLevelConfig
} = globalThis.MathBlockPuzzleConfig;
const { generateBoard } = globalThis.MathBlockPuzzleBoard;
const { validateSelection } = globalThis.MathBlockPuzzleRules;

function cell(row, col, value) {
  return { id: `${row}:${col}`, row, col, value };
}

test("QA contract: addition and subtraction selections are accepted", () => {
  const level = getLevelConfig(4);

  const addition = validateSelection([
    cell(0, 0, 5),
    cell(0, 1, 4),
    cell(0, 2, 9)
  ], level);

  assert.equal(addition.valid, true);
  assert.equal(addition.operation, OPERATIONS.add);
  assert.equal(addition.expression, "5 + 4 = 9");

  const subtraction = validateSelection([
    cell(1, 0, 9),
    cell(1, 1, 4),
    cell(1, 2, 5)
  ], level);

  assert.equal(subtraction.valid, true);
  assert.equal(subtraction.operation, OPERATIONS.subtract);
  assert.equal(subtraction.expression, "9 - 4 = 5");
});

test("QA contract: reverse horizontal and upward selections are accepted", () => {
  const level = getLevelConfig(4);

  const rightToLeft = validateSelection([
    cell(0, 2, 9),
    cell(0, 1, 4),
    cell(0, 0, 5)
  ], level);

  assert.equal(rightToLeft.valid, true);
  assert.equal(rightToLeft.directionId, "right-to-left");
  assert.equal(rightToLeft.expression, "9 - 4 = 5");

  const bottomToTop = validateSelection([
    cell(2, 0, 5),
    cell(1, 0, 4),
    cell(0, 0, 9)
  ], level);

  assert.equal(bottomToTop.valid, true);
  assert.equal(bottomToTop.directionId, "bottom-to-top");
  assert.equal(bottomToTop.expression, "5 + 4 = 9");
});

test("QA contract: L-shaped selections are accepted", () => {
  const level = getLevelConfig(4);
  const addition = validateSelection([
    cell(0, 0, 5),
    cell(0, 1, 4),
    cell(1, 1, 9)
  ], level);
  const subtraction = validateSelection([
    cell(0, 0, 9),
    cell(1, 0, 4),
    cell(1, 1, 5)
  ], level);

  assert.equal(addition.valid, true);
  assert.equal(addition.directionId, "l-shape");
  assert.equal(addition.expression, "5 + 4 = 9");
  assert.equal(subtraction.valid, true);
  assert.equal(subtraction.directionId, "l-shape");
  assert.equal(subtraction.expression, "9 - 4 = 5");
});

test("QA contract: level 7 accepts non-carry addition when it is visible arithmetic", () => {
  const result = validateSelection([
    cell(0, 0, 1),
    cell(0, 1, 6),
    cell(0, 2, 7)
  ], getLevelConfig(7));

  assert.equal(result.valid, true);
  assert.equal(result.expression, "1 + 6 = 7");
});

test("QA contract: level 1 guarantees readable left-to-right or top-to-bottom answers", () => {
  const generated = generateBoard(1, { seed: 20260701 });
  const readableDirections = new Set(["left-to-right", "top-to-bottom"]);

  assert.equal(generated.guaranteedAnswers.length >= 4, true);
  assert.equal(generated.placed.length, getLevelConfig(1).guaranteedAnswerCount);
  assert.equal(generated.placed.every((answer) => readableDirections.has(answer.directionId)), true);
});

test("QA contract: generated boards never include zero", () => {
  for (const level of LEVELS) {
    const generated = generateBoard(level, { seed: 1000 + level.id });
    const values = generated.board.flat().map((boardCell) => boardCell.value);

    assert.equal(values.includes(0), false);
    assert.equal(values.every((value) => value >= level.numberRange.min && value <= level.numberRange.max), true);
    assert.equal(values.every((value) => value >= NUMBER_RANGE.min && value <= NUMBER_RANGE.max), true);
  }
});
