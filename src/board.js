(function defineBoardGeneration(global) {
  const config = global.MathBlockPuzzleConfig;
  const rules = global.MathBlockPuzzleRules;

  if (!config) {
    throw new Error("MathBlockPuzzleConfig must be loaded before board.js");
  }

  if (!rules) {
    throw new Error("MathBlockPuzzleRules must be loaded before board.js");
  }

  const {
    OPERATIONS,
    getEquationConstraint,
    getDirection,
    getLevelConfig,
    isEquationAllowed
  } = config;

  const { evaluateEquation } = rules;

  function createSeededRandom(seed = Date.now()) {
    let state = Number(seed) >>> 0;

    return function random() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }

  function randomInt(random, min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
  }

  function createCell(row, col, value = null) {
    return {
      id: `${row}:${col}`,
      row,
      col,
      value
    };
  }

  function getCellKey(cell) {
    return `${cell.row}:${cell.col}`;
  }

  function createEmptyBoard(width, height) {
    return Array.from({ length: height }, (_, row) => (
      Array.from({ length: width }, (_cell, col) => createCell(row, col))
    ));
  }

  function cloneBoard(board) {
    return board.map((row) => row.map((cell) => ({ ...cell })));
  }

  function isWithinBoard(board, row, col) {
    return row >= 0 && row < board.length && col >= 0 && col < board[0].length;
  }

  function getLineCells(board, startRow, startCol, directionId, length) {
    const direction = getDirection(directionId);
    const cells = [];

    for (let index = 0; index < length; index += 1) {
      const row = startRow + direction.rowStep * index;
      const col = startCol + direction.colStep * index;

      if (!isWithinBoard(board, row, col)) {
        return null;
      }

      cells.push(board[row][col]);
    }

    return cells;
  }

  function listLinePlacements(board, directionIds, length) {
    const placements = [];

    for (const directionId of directionIds) {
      for (let row = 0; row < board.length; row += 1) {
        for (let col = 0; col < board[0].length; col += 1) {
          const cells = getLineCells(board, row, col, directionId, length);

          if (cells) {
            placements.push({ directionId, cells });
          }
        }
      }
    }

    return placements;
  }

  function hasEmptyCells(cells) {
    return cells.every((cell) => cell.value === null);
  }

  function randomInRange(random, valueRange) {
    return randomInt(random, valueRange.min, valueRange.max);
  }

  function createEquation(level, random) {
    const operation = level.operations[randomInt(random, 0, level.operations.length - 1)];
    const constraint = getEquationConstraint(level, operation);

    if (!constraint) {
      throw new Error(`Missing equation constraint: ${operation}`);
    }

    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (operation === OPERATIONS.add) {
        const left = randomInRange(random, constraint.left);
        const right = randomInRange(random, constraint.right);
        const values = [left, right, left + right];

        if (isEquationAllowed(level, values, operation)) {
          return { operation, values };
        }
      }

      if (operation === OPERATIONS.subtract) {
        const left = randomInRange(random, constraint.left);
        const right = randomInRange(random, constraint.right);
        const values = [left, right, left - right];

        if (isEquationAllowed(level, values, operation)) {
          return { operation, values };
        }
      }
    }

    throw new Error(`Could not create equation for level ${level.id}`);
  }

  function fillLine(cells, values) {
    cells.forEach((cell, index) => {
      cell.value = values[index];
    });
  }

  function fillRandomNumbers(board, level, random) {
    for (const row of board) {
      for (const cell of row) {
        if (cell.value === null) {
          cell.value = randomInRange(random, level.numberRange);
        }
      }
    }
  }

  function listEquationCandidates(level) {
    const candidates = [];

    for (const operation of level.operations) {
      const constraint = getEquationConstraint(level, operation);

      if (!constraint) {
        continue;
      }

      for (let left = constraint.left.min; left <= constraint.left.max; left += 1) {
        for (let right = constraint.right.min; right <= constraint.right.max; right += 1) {
          const answer = operation === OPERATIONS.add ? left + right : left - right;
          const values = [left, right, answer];

          if (isEquationAllowed(level, values, operation)) {
            candidates.push({ operation, values });
          }
        }
      }
    }

    return candidates;
  }

  function collectPreservedAnswerCellKeys(board, level, refillCellKeys) {
    const preservedCellKeys = new Set();

    for (const answer of scanBoardForAnswers(board, level)) {
      if (answer.cells.some((cell) => refillCellKeys.has(getCellKey(cell)))) {
        continue;
      }

      for (const cell of answer.cells) {
        preservedCellKeys.add(getCellKey(cell));
      }
    }

    return preservedCellKeys;
  }

  function addAnswerCellKeys(cellKeys, answers) {
    for (const answer of answers) {
      for (const cell of answer.cells) {
        cellKeys.add(getCellKey(cell));
      }
    }
  }

  function createGuaranteePlan(placement, equation, protectedCellKeys, refillCellKeys) {
    const changes = [];
    let outsideRefillChangeCount = 0;

    for (let index = 0; index < placement.cells.length; index += 1) {
      const cell = placement.cells[index];
      const nextValue = equation.values[index];

      if (cell.value === nextValue) {
        continue;
      }

      const cellKey = getCellKey(cell);

      if (protectedCellKeys.has(cellKey)) {
        return null;
      }

      if (!refillCellKeys.has(cellKey)) {
        outsideRefillChangeCount += 1;
      }

      changes.push({ cell, value: nextValue });
    }

    if (changes.length === 0) {
      return null;
    }

    return {
      placement,
      equation,
      changes,
      outsideRefillChangeCount
    };
  }

  function isBetterGuaranteePlan(candidate, current) {
    if (!current) {
      return true;
    }

    if (candidate.changes.length !== current.changes.length) {
      return candidate.changes.length < current.changes.length;
    }

    return candidate.outsideRefillChangeCount < current.outsideRefillChangeCount;
  }

  function findGuaranteePlan(board, level, protectedCellKeys, refillCellKeys) {
    const placements = listLinePlacements(board, level.guaranteedDirections, level.selectionLength);
    const equations = listEquationCandidates(level);
    let bestPlan = null;

    for (const placement of placements) {
      for (const equation of equations) {
        const plan = createGuaranteePlan(placement, equation, protectedCellKeys, refillCellKeys);

        if (plan && isBetterGuaranteePlan(plan, bestPlan)) {
          bestPlan = plan;
        }
      }
    }

    return bestPlan;
  }

  function restoreGuaranteedAnswers(board, level, protectedCellKeys, refillCellKeys) {
    let guaranteedAnswers = scanBoardForAnswers(board, level, level.guaranteedDirections);

    while (guaranteedAnswers.length < level.guaranteedAnswerCount) {
      const previousCount = guaranteedAnswers.length;
      addAnswerCellKeys(protectedCellKeys, guaranteedAnswers);

      const plan = findGuaranteePlan(board, level, protectedCellKeys, refillCellKeys);

      if (!plan) {
        break;
      }

      for (const change of plan.changes) {
        change.cell.value = change.value;
      }

      for (const cell of plan.placement.cells) {
        protectedCellKeys.add(getCellKey(cell));
      }

      guaranteedAnswers = scanBoardForAnswers(board, level, level.guaranteedDirections);

      if (guaranteedAnswers.length <= previousCount) {
        break;
      }
    }

    return guaranteedAnswers;
  }

  function refillCells(board, cells, levelInput, options = {}) {
    const level = typeof levelInput === "number" ? getLevelConfig(levelInput) : levelInput;
    const random = options.random ?? createSeededRandom(options.seed);
    const nextBoard = cloneBoard(board);
    const refillCellKeys = new Set(cells.map(getCellKey));
    const protectedCellKeys = collectPreservedAnswerCellKeys(board, level, refillCellKeys);

    for (const cell of cells) {
      if (!isWithinBoard(nextBoard, cell.row, cell.col)) {
        throw new Error(`Cell is outside board: ${cell.row}:${cell.col}`);
      }

      nextBoard[cell.row][cell.col].value = randomInRange(random, level.numberRange);
    }

    const guaranteedAnswers = restoreGuaranteedAnswers(nextBoard, level, protectedCellKeys, refillCellKeys);

    return {
      board: nextBoard,
      level,
      guaranteedAnswers,
      allAnswers: scanBoardForAnswers(nextBoard, level)
    };
  }

  function scanBoardForAnswers(board, levelInput, directionIds = null) {
    const level = typeof levelInput === "number" ? getLevelConfig(levelInput) : levelInput;
    const scanDirectionIds = directionIds ?? level.validationDirections;
    const placements = listLinePlacements(board, scanDirectionIds, level.selectionLength);
    const answers = [];

    for (const placement of placements) {
      const values = placement.cells.map((cell) => cell.value);

      if (values.some((value) => value === null)) {
        continue;
      }

      for (const result of evaluateEquation(values, level.operations)) {
        if (!isEquationAllowed(level, values, result.operation)) {
          continue;
        }

        answers.push({
          directionId: placement.directionId,
          cells: placement.cells,
          values,
          operation: result.operation,
          expression: result.expression
        });
      }
    }

    return answers;
  }

  function placeGuaranteedAnswers(board, level, random) {
    const placed = [];

    for (let count = 0; count < level.guaranteedAnswerCount; count += 1) {
      const availablePlacements = listLinePlacements(
        board,
        level.guaranteedDirections,
        level.selectionLength
      ).filter((placement) => hasEmptyCells(placement.cells));

      if (availablePlacements.length === 0) {
        return null;
      }

      const placement = availablePlacements[randomInt(random, 0, availablePlacements.length - 1)];
      const equation = createEquation(level, random);

      fillLine(placement.cells, equation.values);
      placed.push({
        directionId: placement.directionId,
        cells: placement.cells,
        values: equation.values,
        operation: equation.operation
      });
    }

    return placed;
  }

  function generateBoard(levelInput = 1, options = {}) {
    const level = typeof levelInput === "number" ? getLevelConfig(levelInput) : levelInput;
    const maxAttempts = options.maxAttempts ?? 200;
    const baseRandom = options.random ?? createSeededRandom(options.seed);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const board = createEmptyBoard(level.board.width, level.board.height);
      const placed = placeGuaranteedAnswers(board, level, baseRandom);

      if (!placed) {
        continue;
      }

      fillRandomNumbers(board, level, baseRandom);

      const guaranteedAnswers = scanBoardForAnswers(board, level, level.guaranteedDirections);

      if (guaranteedAnswers.length >= level.guaranteedAnswerCount) {
        return {
          board,
          level,
          placed,
          guaranteedAnswers,
          allAnswers: scanBoardForAnswers(board, level)
        };
      }
    }

    throw new Error(`Could not generate board for level ${level.id}`);
  }

  global.MathBlockPuzzleBoard = Object.freeze({
    createSeededRandom,
    createEmptyBoard,
    cloneBoard,
    getLineCells,
    listLinePlacements,
    restoreGuaranteedAnswers,
    refillCells,
    scanBoardForAnswers,
    generateBoard
  });
})(globalThis);
