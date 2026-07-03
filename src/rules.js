(function defineGameRules(global) {
  const config = global.MathBlockPuzzleConfig;

  if (!config) {
    throw new Error("MathBlockPuzzleConfig must be loaded before rules.js");
  }

  const {
    OPERATIONS,
    getLevelConfig,
    isEquationAllowed,
    isOperationAllowed,
    isValidationDirection
  } = config;

  const L_SHAPE_DIRECTION_ID = "l-shape";

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

  function getCellKey(cell) {
    return `${cell.row}:${cell.col}`;
  }

  function getSelectionPath(cells, level) {
    const seenCellKeys = new Set();
    const steps = [];

    for (const cell of cells) {
      const cellKey = getCellKey(cell);

      if (seenCellKeys.has(cellKey)) {
        return invalid("duplicate_cell");
      }

      seenCellKeys.add(cellKey);
    }

    for (let index = 1; index < cells.length; index += 1) {
      const previous = cells[index - 1];
      const current = cells[index];
      const rowStep = current.row - previous.row;
      const colStep = current.col - previous.col;
      const directionId = getDirectionIdForStep(rowStep, colStep);

      if (!directionId) {
        return invalid(index === 1 ? "not_straight" : "not_consecutive");
      }

      steps.push({ rowStep, colStep, directionId });
    }

    const firstStep = steps[0];
    const isStraight = steps.every((step) => (
      step.rowStep === firstStep.rowStep && step.colStep === firstStep.colStep
    ));

    if (isStraight) {
      if (!isValidationDirection(level, firstStep.directionId)) {
        return invalid("direction_not_allowed", { directionId: firstStep.directionId });
      }

      return {
        valid: true,
        directionId: firstStep.directionId
      };
    }

    const turnsOnce = steps.length === 2 && (
      (steps[0].rowStep === 0 && steps[1].colStep === 0) ||
      (steps[0].colStep === 0 && steps[1].rowStep === 0)
    );

    if (!turnsOnce) {
      return invalid("not_consecutive", { directionId: firstStep.directionId });
    }

    return {
      valid: true,
      directionId: L_SHAPE_DIRECTION_ID
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

    const path = getSelectionPath(cells, level);

    if (!path.valid) {
      return path;
    }

    const { directionId } = path;
    const values = cells.map((cell) => cell.value);
    const matched = evaluateEquation(values, level.operations)
      .filter((result) => (
        isOperationAllowed(level, result.operation) &&
        isEquationAllowed(level, values, result.operation)
      ));

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
    L_SHAPE_DIRECTION_ID,
    formatExpression,
    evaluateEquation,
    getDirectionIdForStep,
    getSelectionPath,
    validateSelection
  });
})(globalThis);
