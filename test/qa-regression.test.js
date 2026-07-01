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
  const level = getLevelConfig(2);

  const addition = validateSelection([
    cell(0, 0, 5),
    cell(0, 1, 7),
    cell(0, 2, 12)
  ], level);

  assert.equal(addition.valid, true);
  assert.equal(addition.operation, OPERATIONS.add);
  assert.equal(addition.expression, "5 + 7 = 12");

  const subtraction = validateSelection([
    cell(1, 0, 12),
    cell(1, 1, 7),
    cell(1, 2, 5)
  ], level);

  assert.equal(subtraction.valid, true);
  assert.equal(subtraction.operation, OPERATIONS.subtract);
  assert.equal(subtraction.expression, "12 - 7 = 5");
});

test("QA contract: reverse horizontal and upward selections are accepted", () => {
  const level = getLevelConfig(2);

  const rightToLeft = validateSelection([
    cell(0, 2, 12),
    cell(0, 1, 7),
    cell(0, 0, 5)
  ], level);

  assert.equal(rightToLeft.valid, true);
  assert.equal(rightToLeft.directionId, "right-to-left");
  assert.equal(rightToLeft.expression, "12 - 7 = 5");

  const bottomToTop = validateSelection([
    cell(2, 0, 5),
    cell(1, 0, 7),
    cell(0, 0, 12)
  ], level);

  assert.equal(bottomToTop.valid, true);
  assert.equal(bottomToTop.directionId, "bottom-to-top");
  assert.equal(bottomToTop.expression, "5 + 7 = 12");
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
    assert.equal(values.every((value) => value >= NUMBER_RANGE.min && value <= NUMBER_RANGE.max), true);
  }
});
