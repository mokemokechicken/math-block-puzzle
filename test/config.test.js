import test from "node:test";
import assert from "node:assert/strict";
import "../src/config.js";

const {
  NUMBER_RANGE,
  OPERATIONS,
  ALL_DIRECTION_IDS,
  getLevelConfig,
  isOperationAllowed,
  isValidationDirection,
  isGuaranteedDirection
} = globalThis.MathBlockPuzzleConfig;

test("number range uses 1 to 18 and excludes zero", () => {
  assert.deepEqual(NUMBER_RANGE, {
    min: 1,
    max: 18,
    includesZero: false
  });
});

test("level 1 keeps validation all-direction but guarantee placement readable", () => {
  const level = getLevelConfig(1);

  assert.equal(level.selectionLength, 3);
  assert.deepEqual(level.operations, [OPERATIONS.add]);
  assert.equal(level.guaranteedAnswerCount, 4);
  assert.deepEqual(level.validationDirections, ALL_DIRECTION_IDS);
  assert.equal(isValidationDirection(level, "right-to-left"), true);
  assert.equal(isValidationDirection(level, "bottom-to-top"), true);
  assert.equal(isGuaranteedDirection(level, "left-to-right"), true);
  assert.equal(isGuaranteedDirection(level, "top-to-bottom"), true);
  assert.equal(isGuaranteedDirection(level, "right-to-left"), false);
  assert.equal(isGuaranteedDirection(level, "bottom-to-top"), false);
});

test("level 2 adds subtraction while preserving readable guarantees", () => {
  const level = getLevelConfig(2);

  assert.equal(isOperationAllowed(level, OPERATIONS.add), true);
  assert.equal(isOperationAllowed(level, OPERATIONS.subtract), true);
  assert.equal(level.guaranteedAnswerCount, 4);
  assert.equal(isGuaranteedDirection(level, "right-to-left"), false);
});

test("higher levels reduce guaranteed answers and allow all guarantee directions", () => {
  const level3 = getLevelConfig(3);
  const level4 = getLevelConfig(4);

  assert.equal(level3.guaranteedAnswerCount, 3);
  assert.equal(level4.guaranteedAnswerCount, 2);

  for (const directionId of ALL_DIRECTION_IDS) {
    assert.equal(isGuaranteedDirection(level3, directionId), true);
    assert.equal(isGuaranteedDirection(level4, directionId), true);
  }
});

test("unknown level and direction fail loudly", () => {
  const { getDirection } = globalThis.MathBlockPuzzleConfig;

  assert.throws(() => getLevelConfig(999), /Unknown level/);
  assert.throws(() => getDirection("diagonal"), /Unknown direction/);
});
