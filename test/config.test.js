import test from "node:test";
import assert from "node:assert/strict";
import "../src/config.js";

const {
  NUMBER_RANGE,
  OPERATIONS,
  ALL_DIRECTION_IDS,
  LEVELS,
  getLevelConfig,
  isEquationAllowed,
  isEquationTarget,
  isOperationAllowed,
  isValidationDirection,
  isGuaranteedDirection
} = globalThis.MathBlockPuzzleConfig;

test("global number range uses 1 to 20 and excludes zero", () => {
  assert.deepEqual(NUMBER_RANGE, {
    min: 1,
    max: 20,
    includesZero: false
  });
});

test("approved curriculum levels are configured", () => {
  assert.equal(LEVELS.length, 9);
  assert.deepEqual(
    LEVELS.map((level) => level.shortName),
    [
      "5までのたし算",
      "10までのたし算",
      "10までのひき算",
      "10までの加減",
      "20までのたし算",
      "20までのひき算",
      "くり上がり",
      "くり下がり",
      "加減マスター"
    ]
  );
  assert.equal(LEVELS.every((level) => level.clearAnswerCount === 5), true);
  assert.equal(LEVELS.every((level) => level.numberRange.min === 1), true);
});

test("low levels keep validation all-direction but guarantee placement readable", () => {
  const level = getLevelConfig(1);

  assert.equal(level.selectionLength, 3);
  assert.deepEqual(level.operations, [OPERATIONS.add]);
  assert.equal(level.guaranteedAnswerCount, 4);
  assert.equal(level.clearAnswerCount, 5);
  assert.deepEqual(level.validationDirections, ALL_DIRECTION_IDS);
  assert.equal(isValidationDirection(level, "right-to-left"), true);
  assert.equal(isValidationDirection(level, "bottom-to-top"), true);
  assert.equal(isGuaranteedDirection(level, "left-to-right"), true);
  assert.equal(isGuaranteedDirection(level, "top-to-bottom"), true);
  assert.equal(isGuaranteedDirection(level, "right-to-left"), false);
  assert.equal(isGuaranteedDirection(level, "bottom-to-top"), false);
});

test("mixed levels allow addition and subtraction", () => {
  const level = getLevelConfig(4);

  assert.equal(isOperationAllowed(level, OPERATIONS.add), true);
  assert.equal(isOperationAllowed(level, OPERATIONS.subtract), true);
  assert.equal(level.guaranteedAnswerCount, 4);
  assert.equal(isGuaranteedDirection(level, "right-to-left"), false);
});

test("all levels keep validation all-direction but guarantee placement readable", () => {
  for (const level of LEVELS) {
    assert.deepEqual(level.validationDirections, ALL_DIRECTION_IDS);
    assert.equal(isGuaranteedDirection(level, "left-to-right"), true);
    assert.equal(isGuaranteedDirection(level, "top-to-bottom"), true);
    assert.equal(isGuaranteedDirection(level, "right-to-left"), false);
    assert.equal(isGuaranteedDirection(level, "bottom-to-top"), false);
  }
});

test("equation constraints separate accepted answers from learning targets", () => {
  assert.equal(isEquationAllowed(getLevelConfig(1), [2, 3, 5], OPERATIONS.add), true);
  assert.equal(isEquationAllowed(getLevelConfig(1), [5, 7, 12], OPERATIONS.add), false);
  assert.equal(isEquationAllowed(getLevelConfig(7), [8, 6, 14], OPERATIONS.add), true);
  assert.equal(isEquationAllowed(getLevelConfig(7), [2, 3, 5], OPERATIONS.add), true);
  assert.equal(isEquationTarget(getLevelConfig(7), [8, 6, 14], OPERATIONS.add), true);
  assert.equal(isEquationTarget(getLevelConfig(7), [2, 3, 5], OPERATIONS.add), false);
  assert.equal(isEquationAllowed(getLevelConfig(8), [13, 9, 4], OPERATIONS.subtract), true);
  assert.equal(isEquationAllowed(getLevelConfig(8), [9, 4, 5], OPERATIONS.subtract), true);
  assert.equal(isEquationTarget(getLevelConfig(8), [13, 9, 4], OPERATIONS.subtract), true);
  assert.equal(isEquationTarget(getLevelConfig(8), [9, 4, 5], OPERATIONS.subtract), false);
});

test("unknown level and direction fail loudly", () => {
  const { getDirection } = globalThis.MathBlockPuzzleConfig;

  assert.throws(() => getLevelConfig(999), /Unknown level/);
  assert.throws(() => getDirection("diagonal"), /Unknown direction/);
});
