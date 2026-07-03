import test from "node:test";
import assert from "node:assert/strict";
import "../src/config.js";
import "../src/rules.js";

const { getLevelConfig, OPERATIONS } = globalThis.MathBlockPuzzleConfig;
const {
  L_SHAPE_DIRECTION_ID,
  evaluateEquation,
  formatExpression,
  getDirectionIdForStep,
  validateSelection
} = globalThis.MathBlockPuzzleRules;

function cell(row, col, value) {
  return { id: `${row}:${col}`, row, col, value };
}

test("addition selection is valid when the last block is the answer", () => {
  const result = validateSelection([
    cell(0, 0, 5),
    cell(0, 1, 7),
    cell(0, 2, 12)
  ], getLevelConfig(5));

  assert.equal(result.valid, true);
  assert.equal(result.operation, OPERATIONS.add);
  assert.equal(result.directionId, "left-to-right");
  assert.equal(result.expression, "5 + 7 = 12");
});

test("all four drag directions can be valid when the equation matches the level", () => {
  const level = getLevelConfig(5);
  const selections = [
    [cell(0, 0, 5), cell(0, 1, 7), cell(0, 2, 12)],
    [cell(0, 2, 5), cell(0, 1, 7), cell(0, 0, 12)],
    [cell(0, 0, 5), cell(1, 0, 7), cell(2, 0, 12)],
    [cell(2, 0, 5), cell(1, 0, 7), cell(0, 0, 12)]
  ];

  assert.deepEqual(
    selections.map((selection) => validateSelection(selection, level).directionId),
    ["left-to-right", "right-to-left", "top-to-bottom", "bottom-to-top"]
  );
  assert.equal(selections.every((selection) => validateSelection(selection, level).valid), true);
});

test("subtraction respects selection order", () => {
  const level = getLevelConfig(4);

  assert.equal(validateSelection([
    cell(0, 0, 9),
    cell(0, 1, 4),
    cell(0, 2, 5)
  ], level).valid, true);

  assert.deepEqual(validateSelection([
    cell(0, 0, 4),
    cell(0, 1, 9),
    cell(0, 2, 5)
  ], level), {
    valid: false,
    reason: "equation_not_satisfied",
    directionId: "left-to-right",
    values: [4, 9, 5]
  });
});

test("L-shaped addition and subtraction selections are valid", () => {
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
  assert.equal(addition.directionId, L_SHAPE_DIRECTION_ID);
  assert.equal(addition.expression, "5 + 4 = 9");
  assert.equal(subtraction.valid, true);
  assert.equal(subtraction.directionId, L_SHAPE_DIRECTION_ID);
  assert.equal(subtraction.expression, "9 - 4 = 5");
});

test("L-shaped selections still require the equation to match", () => {
  const result = validateSelection([
    cell(0, 0, 4),
    cell(0, 1, 9),
    cell(1, 1, 5)
  ], getLevelConfig(4));

  assert.deepEqual(result, {
    valid: false,
    reason: "equation_not_satisfied",
    directionId: L_SHAPE_DIRECTION_ID,
    values: [4, 9, 5]
  });
});

test("carry and borrowing levels accept visible arithmetic outside the learning target", () => {
  const level7Result = validateSelection([
    cell(0, 0, 1),
    cell(0, 1, 6),
    cell(0, 2, 7)
  ], getLevelConfig(7));

  assert.equal(level7Result.valid, true);
  assert.equal(level7Result.operation, OPERATIONS.add);
  assert.equal(level7Result.expression, "1 + 6 = 7");

  const level8Result = validateSelection([
    cell(1, 0, 9),
    cell(1, 1, 4),
    cell(1, 2, 5)
  ], getLevelConfig(8));

  assert.equal(level8Result.valid, true);
  assert.equal(level8Result.operation, OPERATIONS.subtract);
  assert.equal(level8Result.expression, "9 - 4 = 5");
});

test("level 1 does not accept subtraction", () => {
  const result = validateSelection([
    cell(0, 0, 9),
    cell(0, 1, 4),
    cell(0, 2, 5)
  ], getLevelConfig(1));

  assert.equal(result.valid, false);
  assert.equal(result.reason, "equation_not_satisfied");
});

test("invalid selections fail with specific reasons", () => {
  const level = getLevelConfig(2);

  assert.equal(validateSelection([cell(0, 0, 1), cell(0, 1, 2)], level).reason, "selection_length");
  assert.equal(validateSelection([cell(0, 0, 1), cell(1, 1, 2), cell(2, 2, 3)], level).reason, "not_straight");
  assert.equal(validateSelection([cell(0, 0, 1), cell(0, 1, 2), cell(0, 3, 3)], level).reason, "not_consecutive");
  assert.equal(validateSelection([cell(0, 0, 1), cell(0, 1, 2), cell(0, 0, 1)], level).reason, "duplicate_cell");
  assert.equal(validateSelection([cell(0, 0, 1), { row: 0, col: 1 }, cell(0, 2, 3)], level).reason, "missing_value");
});

test("formatting and low-level equation helpers are deterministic", () => {
  assert.equal(formatExpression([5, 7, 12], OPERATIONS.add), "5 + 7 = 12");
  assert.equal(formatExpression([9, 4, 5], OPERATIONS.subtract), "9 - 4 = 5");
  assert.deepEqual(evaluateEquation([5, 7, 12], [OPERATIONS.add]), [
    { operation: OPERATIONS.add, expression: "5 + 7 = 12" }
  ]);
  assert.equal(getDirectionIdForStep(0, -1), "right-to-left");
});
