(function defineGameRules(global) {
  const config = global.MathBlockPuzzleConfig;

  if (!config) {
    throw new Error("MathBlockPuzzleConfig must be loaded before rules.js");
  }

  const {
    OPERATIONS,
    getLevelConfig,
    isOperationAllowed,
    isValidationDirection
  } = config;

  function formatExpression(values, operation) {
    const [left, right, answer] = values;

    if (operation === OPERATIONS.add) {
      return `${left} + ${right} = ${answer}`;
    }

    if (operation === OPERATIONS.subtract) {
      return `${left} - ${right} = ${answer}`;
    }

    throw new Error(`Unsupported operation: ${operation}`);
  }

  function evaluateEquation(values, operations) {
    const [left, right, answer] = values;
    const results = [];

    if (operations.includes(OPERATIONS.add) && left + right === answer) {
      results.push({ operation: OPERATIONS.add, expression: formatExpression(values, OPERATIONS.add) });
    }

    if (operations.includes(OPERATIONS.subtract) && left - right === answer) {
      results.push({ operation: OPERATIONS.subtract, expression: formatExpression(values, OPERATIONS.subtract) });
    }

    return results;
  }

  function getDirectionIdForStep(rowStep, colStep) {
    if (rowStep === 0 && colStep === 1) {
      return "left-to-right";
    }

    if (rowStep === 0 && colStep === -1) {
      return "right-to-left";
    }

    if (rowStep === 1 && colStep === 0) {
      return "top-to-bottom";
    }

    if (rowStep === -1 && colStep === 0) {
      return "bottom-to-top";
    }

    return null;
  }

  function invalid(reason, details = {}) {
    return {
      valid: false,
      reason,
      ...details
    };
  }

  function validateSelection(cells, levelInput) {
    const level = typeof levelInput === "number" ? getLevelConfig(levelInput) : levelInput;

    if (!Array.isArray(cells) || cells.length !== level.selectionLength) {
      return invalid("selection_length", { expectedLength: level.selectionLength });
    }

    if (cells.some((cell) => !cell || typeof cell.row !== "number" || typeof cell.col !== "number")) {
      return invalid("invalid_cell");
    }

    if (cells.some((cell) => typeof cell.value !== "number")) {
      return invalid("missing_value");
    }

    const rowStep = cells[1].row - cells[0].row;
    const colStep = cells[1].col - cells[0].col;
    const directionId = getDirectionIdForStep(rowStep, colStep);

    if (!directionId) {
      return invalid("not_straight");
    }

    if (!isValidationDirection(level, directionId)) {
      return invalid("direction_not_allowed", { directionId });
    }

    for (let index = 2; index < cells.length; index += 1) {
      const previous = cells[index - 1];
      const current = cells[index];

      if (current.row - previous.row !== rowStep || current.col - previous.col !== colStep) {
        return invalid("not_consecutive", { directionId });
      }
    }

    const values = cells.map((cell) => cell.value);
    const matched = evaluateEquation(values, level.operations)
      .filter((result) => isOperationAllowed(level, result.operation));

    if (matched.length === 0) {
      return invalid("equation_not_satisfied", { directionId, values });
    }

    return {
      valid: true,
      directionId,
      cells,
      values,
      operation: matched[0].operation,
      expression: matched[0].expression
    };
  }

  global.MathBlockPuzzleRules = Object.freeze({
    formatExpression,
    evaluateEquation,
    getDirectionIdForStep,
    validateSelection
  });
})(globalThis);
