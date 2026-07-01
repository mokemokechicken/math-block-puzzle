import test from "node:test";
import assert from "node:assert/strict";
import "../src/config.js";
import "../src/rules.js";

const { getLevelConfig, OPERATIONS } = globalThis.MathBlockPuzzleConfig;
const { evaluateEquation, formatExpression, getDirectionIdForStep, validateSelection } = globalThis.MathBlockPuzzleRules;

function cell(row, col, value) {
  return { id: `${row}:${col}`, row, col, value };
}

test("addition selection is valid when the last block is the answer", () => {
  const result = validateSelection([
    cell(0, 0, 5),
    cell(0, 1, 7),
    cell(0, 2, 12)
  ], getLevelConfig(1));

  assert.equal(result.valid, true);
  assert.equal(result.operation, OPERATIONS.add);
  assert.equal(result.directionId, "left-to-right");
  assert.equal(result.expression, "5 + 7 = 12");
});

test("all four drag directions can be valid from level 1", () => {
  const level = getLevelConfig(1);
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
  const level = getLevelConfig(2);

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
