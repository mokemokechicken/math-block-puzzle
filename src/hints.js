(function defineHints(global) {
  const HINT_STAGES = Object.freeze({
    none: 0,
    source: 1,
    answer: 2,
    line: 3,
    expression: 4
  });

  const HINT_STAGE_DELAYS = Object.freeze([30000, 35000, 40000, 45000]);

  function chooseHintAnswer(answers) {
    if (!Array.isArray(answers) || answers.length === 0) {
      return null;
    }

    return answers[0];
  }

  function clampHintStage(stage) {
    const numericStage = Number(stage);

    if (!Number.isFinite(numericStage)) {
      return HINT_STAGES.none;
    }

    return Math.max(HINT_STAGES.none, Math.min(HINT_STAGES.expression, numericStage));
  }

  function getHintCellIds(answer, stageInput) {
    if (!answer || !Array.isArray(answer.cells) || answer.cells.length === 0) {
      return [];
    }

    const stage = clampHintStage(stageInput);

    if (stage === HINT_STAGES.source) {
      return [answer.cells[0].id];
    }

    if (stage === HINT_STAGES.answer) {
      return [answer.cells[answer.cells.length - 1].id];
    }

    if (stage >= HINT_STAGES.line) {
      return answer.cells.map((cell) => cell.id);
    }

    return [];
  }

  function getHintExpression(answer, stageInput) {
    const stage = clampHintStage(stageInput);

    if (stage < HINT_STAGES.expression || !answer?.expression) {
      return "";
    }

    return answer.expression;
  }

  function getHintClassName(stageInput) {
    const stage = clampHintStage(stageInput);

    if (stage === HINT_STAGES.source) {
      return "is-hint-source";
    }

    if (stage === HINT_STAGES.answer) {
      return "is-hint-answer";
    }

    if (stage >= HINT_STAGES.line) {
      return "is-hint-line";
    }

    return "";
  }

  global.MathBlockPuzzleHints = Object.freeze({
    HINT_STAGES,
    HINT_STAGE_DELAYS,
    chooseHintAnswer,
    clampHintStage,
    getHintCellIds,
    getHintExpression,
    getHintClassName
  });
})(globalThis);
