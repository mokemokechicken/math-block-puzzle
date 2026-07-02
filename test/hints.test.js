import test from "node:test";
import assert from "node:assert/strict";
import "../src/hints.js";

const {
  HINT_STAGE_DELAYS,
  HINT_STAGES,
  chooseHintAnswer,
  clampHintStage,
  getHintCellIds,
  getHintExpression,
  getHintClassName
} = globalThis.MathBlockPuzzleHints;

const answer = {
  cells: [
    { id: "0:0", value: 5 },
    { id: "0:1", value: 7 },
    { id: "0:2", value: 12 }
  ],
  expression: "5 + 7 = 12"
};

test("hint answer selection uses the first available current-board answer", () => {
  const secondAnswer = { ...answer, expression: "9 + 3 = 12" };

  assert.equal(chooseHintAnswer([answer, secondAnswer]), answer);
  assert.equal(chooseHintAnswer([]), null);
  assert.equal(chooseHintAnswer(null), null);
});

test("hint stage delays start after 30 seconds and advance every 5 seconds", () => {
  assert.deepEqual(HINT_STAGE_DELAYS, [30000, 35000, 40000, 45000]);
});

test("hint stages map to source, answer, line, and expression", () => {
  assert.deepEqual(getHintCellIds(answer, HINT_STAGES.none), []);
  assert.deepEqual(getHintCellIds(answer, HINT_STAGES.source), ["0:0"]);
  assert.deepEqual(getHintCellIds(answer, HINT_STAGES.answer), ["0:2"]);
  assert.deepEqual(getHintCellIds(answer, HINT_STAGES.line), ["0:0", "0:1", "0:2"]);
  assert.deepEqual(getHintCellIds(answer, HINT_STAGES.expression), ["0:0", "0:1", "0:2"]);

  assert.equal(getHintExpression(answer, HINT_STAGES.line), "");
  assert.equal(getHintExpression(answer, HINT_STAGES.expression), "5 + 7 = 12");
});

test("hint stages clamp and expose stable class names", () => {
  assert.equal(clampHintStage(-1), HINT_STAGES.none);
  assert.equal(clampHintStage(99), HINT_STAGES.expression);
  assert.equal(clampHintStage("x"), HINT_STAGES.none);

  assert.equal(getHintClassName(HINT_STAGES.none), "");
  assert.equal(getHintClassName(HINT_STAGES.source), "is-hint-source");
  assert.equal(getHintClassName(HINT_STAGES.answer), "is-hint-answer");
  assert.equal(getHintClassName(HINT_STAGES.line), "is-hint-line");
  assert.equal(getHintClassName(HINT_STAGES.expression), "is-hint-line");
});
