import test from "node:test";
import assert from "node:assert/strict";
import "../src/timeAttack.js";

const timeAttack = globalThis.MathBlockPuzzleTimeAttack;

function assertNearlyEqual(actual, expected, epsilon = 0.000001) {
  assert.equal(Math.abs(actual - expected) < epsilon, true);
}

test("chain multiplier slopes linearly from 2x to 1x over one to ten seconds", () => {
  assert.equal(timeAttack.calculateChainMultiplier(0), 2);
  assert.equal(timeAttack.calculateChainMultiplier(1000), 2);
  assert.equal(timeAttack.calculateChainMultiplier(5500), 1.5);
  assert.equal(timeAttack.calculateChainMultiplier(10000), 1);
  assert.equal(timeAttack.calculateChainMultiplier(12000), 1);
});

test("time attack state starts with one minute and zero score", () => {
  const state = timeAttack.createTimeAttackState(1000);

  assert.equal(state.startedAt, 1000);
  assert.equal(state.endsAt, 61000);
  assert.equal(state.score, 0);
  assert.equal(state.cumulativeMultiplier, 1);
  assert.equal(state.lastCorrectAt, null);
});

test("first correct answer earns only the base score", () => {
  const initial = timeAttack.createTimeAttackState(1000);
  const state = timeAttack.applyCorrectAnswer(initial, 1500);

  assert.equal(state.score, 10);
  assert.equal(state.lastGain, 10);
  assert.equal(state.cumulativeMultiplier, 1);
  assert.equal(state.lastMultiplier, 1);
  assert.equal(state.lastCorrectAt, 1500);
});

test("consecutive answers accumulate multiplier bonuses and floor fractional score", () => {
  const first = timeAttack.applyCorrectAnswer(timeAttack.createTimeAttackState(0), 1000);
  const second = timeAttack.applyCorrectAnswer(first, 2000);
  const third = timeAttack.applyCorrectAnswer(second, 7500);
  const fourth = timeAttack.applyCorrectAnswer(third, 17500);

  assert.equal(second.lastMultiplier, 2);
  assert.equal(second.cumulativeMultiplier, 2);
  assert.equal(second.lastGain, 20);
  assert.equal(second.score, 30);

  assert.equal(third.lastMultiplier, 1.5);
  assert.equal(third.cumulativeMultiplier, 2.5);
  assert.equal(third.lastGain, 25);
  assert.equal(third.score, 55);

  assert.equal(fourth.lastMultiplier, 1);
  assert.equal(fourth.cumulativeMultiplier, 2.5);
  assert.equal(fourth.lastGain, 25);
  assert.equal(fourth.score, 80);
});

test("elapsed time over ten seconds resets the accumulated multiplier", () => {
  const first = timeAttack.applyCorrectAnswer(timeAttack.createTimeAttackState(0), 1000);
  const second = timeAttack.applyCorrectAnswer(first, 2000);
  const reset = timeAttack.applyCorrectAnswer(second, 12001);

  assert.equal(reset.cumulativeMultiplier, 1);
  assert.equal(reset.lastMultiplier, 1);
  assert.equal(reset.lastGain, 10);
  assert.equal(reset.score, 40);
});

test("fractional multiplier score is rounded down", () => {
  const first = timeAttack.applyCorrectAnswer(timeAttack.createTimeAttackState(0), 1000);
  const second = timeAttack.applyCorrectAnswer(first, 3000);

  assertNearlyEqual(second.lastMultiplier, 1.8888888888888888);
  assertNearlyEqual(second.cumulativeMultiplier, 1.8888888888888888);
  assert.equal(second.lastGain, 18);
  assert.equal(second.score, 28);
});

test("internal multiplier precision does not round across the score floor boundary", () => {
  const first = timeAttack.applyCorrectAnswer(timeAttack.createTimeAttackState(0), 0);
  const second = timeAttack.applyCorrectAnswer(first, 9104);

  assert.equal(timeAttack.formatMultiplier(second.lastMultiplier), "1.1x");
  assert.equal(second.lastGain, 10);
  assert.equal(second.score, 20);
});

test("remaining time helpers clamp at zero and format seconds", () => {
  const state = timeAttack.createTimeAttackState(1000);

  assert.equal(timeAttack.getRemainingMs(state, 1000), 60000);
  assert.equal(timeAttack.formatRemainingSeconds(60000), "60");
  assert.equal(timeAttack.getRemainingMs(state, 60501), 499);
  assert.equal(timeAttack.formatRemainingSeconds(499), "1");
  assert.equal(timeAttack.getRemainingMs(state, 62000), 0);
  assert.equal(timeAttack.isTimeUp(state, 61000), true);
});
