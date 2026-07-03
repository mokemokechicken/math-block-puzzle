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
    isEquationAllowed,
    isEquationTarget
  } = config;

  const { L_SHAPE_DIRECTION_ID, evaluateEquation } = rules;

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

  function getCellSetKey(cells) {
    return cells.map(getCellKey).sort().join("|");
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

  function isLShapeTurn(firstDirection, secondDirection) {
    return (
      (firstDirection.rowStep === 0 && secondDirection.colStep === 0) ||
      (firstDirection.colStep === 0 && secondDirection.rowStep === 0)
    );
  }

  function listLShapePlacements(board, length) {
    if (length !== 3) {
      return [];
    }

    const placements = [];
    const directions = Object.values(config.DIRECTIONS);

    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board[0].length; col += 1) {
        for (const firstDirection of directions) {
          const middleRow = row + firstDirection.rowStep;
          const middleCol = col + firstDirection.colStep;

          if (!isWithinBoard(board, middleRow, middleCol)) {
            continue;
          }

          for (const secondDirection of directions) {
            if (!isLShapeTurn(firstDirection, secondDirection)) {
              continue;
            }

            const endRow = middleRow + secondDirection.rowStep;
            const endCol = middleCol + secondDirection.colStep;

            if (!isWithinBoard(board, endRow, endCol)) {
              continue;
            }

            placements.push({
              directionId: L_SHAPE_DIRECTION_ID,
              cells: [
                board[row][col],
                board[middleRow][middleCol],
                board[endRow][endCol]
              ]
            });
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

  function listRangeValues(valueRange) {
    const values = [];

    for (let value = valueRange.min; value <= valueRange.max; value += 1) {
      values.push(value);
    }

    return values;
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

          if (isEquationTarget(level, values, operation)) {
            candidates.push({ operation, values });
          }
        }
      }
    }

    return candidates;
  }

  function collectPreservedAnswerCellKeys(board, level, refillCellKeys) {
    const preservedCellKeys = new Set();

    for (const answer of scanBoardForAnswers(board, level, level.guaranteedDirections, { targetOnly: true })) {
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

  function answerUsesBlockedCellSet(answer, blockedAnswerCellSetKeys) {
    return blockedAnswerCellSetKeys.has(getCellSetKey(answer.cells));
  }

  function isPlacementBlocked(placement, blockedAnswerCellSetKeys) {
    return blockedAnswerCellSetKeys.has(getCellSetKey(placement.cells));
  }

  function createBlockedAnswerCellSetKeys(cells, level) {
    if (cells.length !== level.selectionLength) {
      return new Set();
    }

    return new Set([getCellSetKey(cells)]);
  }

  function scanBoardForAllowedAnswers(board, level, directionIds, blockedAnswerCellSetKeys) {
    return scanBoardForAnswers(board, level, directionIds, { targetOnly: true })
      .filter((answer) => !answerUsesBlockedCellSet(answer, blockedAnswerCellSetKeys));
  }

  function scanBoardForBlockedAnswers(board, level, blockedAnswerCellSetKeys) {
    if (blockedAnswerCellSetKeys.size === 0) {
      return [];
    }

    return scanBoardForAnswers(board, level)
      .filter((answer) => answerUsesBlockedCellSet(answer, blockedAnswerCellSetKeys));
  }

  function doesPlanCreateBlockedAnswer(board, level, plan, blockedAnswerCellSetKeys) {
    if (blockedAnswerCellSetKeys.size === 0) {
      return false;
    }

    const previousValues = plan.changes.map((change) => ({
      cell: change.cell,
      value: change.cell.value
    }));

    for (const change of plan.changes) {
      change.cell.value = change.value;
    }

    const createsBlockedAnswer = scanBoardForBlockedAnswers(board, level, blockedAnswerCellSetKeys).length > 0;

    for (const previous of previousValues) {
      previous.cell.value = previous.value;
    }

    return createsBlockedAnswer;
  }

  function createGuaranteePlan(placement, equation, protectedCellKeys, refillCellKeys, blockedAnswerCellSetKeys) {
    if (isPlacementBlocked(placement, blockedAnswerCellSetKeys)) {
      return null;
    }

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

  function findGuaranteePlan(board, level, protectedCellKeys, refillCellKeys, blockedAnswerCellSetKeys) {
    const placements = listLinePlacements(board, level.guaranteedDirections, level.selectionLength);
    const equations = listEquationCandidates(level);
    let bestPlan = null;

    for (const placement of placements) {
      for (const equation of equations) {
        const plan = createGuaranteePlan(
          placement,
          equation,
          protectedCellKeys,
          refillCellKeys,
          blockedAnswerCellSetKeys
        );

        if (
          plan &&
          !doesPlanCreateBlockedAnswer(board, level, plan, blockedAnswerCellSetKeys) &&
          isBetterGuaranteePlan(plan, bestPlan)
        ) {
          bestPlan = plan;
        }
      }
    }

    return bestPlan;
  }

  function restoreGuaranteedAnswers(
    board,
    level,
    protectedCellKeys,
    refillCellKeys,
    blockedAnswerCellSetKeys = new Set()
  ) {
    let guaranteedAnswers = scanBoardForAllowedAnswers(
      board,
      level,
      level.guaranteedDirections,
      blockedAnswerCellSetKeys
    );

    while (guaranteedAnswers.length < level.guaranteedAnswerCount) {
      const previousCount = guaranteedAnswers.length;
      addAnswerCellKeys(protectedCellKeys, guaranteedAnswers);

      const plan = findGuaranteePlan(
        board,
        level,
        protectedCellKeys,
        refillCellKeys,
        blockedAnswerCellSetKeys
      );

      if (!plan) {
        break;
      }

      for (const change of plan.changes) {
        change.cell.value = change.value;
      }

      for (const cell of plan.placement.cells) {
        protectedCellKeys.add(getCellKey(cell));
      }

      guaranteedAnswers = scanBoardForAllowedAnswers(
        board,
        level,
        level.guaranteedDirections,
        blockedAnswerCellSetKeys
      );

      if (guaranteedAnswers.length <= previousCount) {
        break;
      }
    }

    return guaranteedAnswers;
  }

  function breakBlockedAnswers(board, level, refillCellKeys, protectedCellKeys, blockedAnswerCellSetKeys) {
    const rangeValues = listRangeValues(level.numberRange);

    while (true) {
      const blockedAnswers = scanBoardForBlockedAnswers(board, level, blockedAnswerCellSetKeys);

      if (blockedAnswers.length === 0) {
        return true;
      }

      const editableCells = [];
      const seenCellKeys = new Set();

      for (const answer of blockedAnswers) {
        for (const cell of answer.cells) {
          const cellKey = getCellKey(cell);

          if (!refillCellKeys.has(cellKey) || seenCellKeys.has(cellKey)) {
            continue;
          }

          seenCellKeys.add(cellKey);
          editableCells.push(cell);
        }
      }

      editableCells.sort((left, right) => {
        const leftProtected = protectedCellKeys.has(getCellKey(left)) ? 1 : 0;
        const rightProtected = protectedCellKeys.has(getCellKey(right)) ? 1 : 0;
        return leftProtected - rightProtected;
      });

      let changed = false;

      for (const cell of editableCells) {
        const previousValue = cell.value;

        for (const value of rangeValues) {
          if (value === previousValue) {
            continue;
          }

          cell.value = value;

          if (scanBoardForBlockedAnswers(board, level, blockedAnswerCellSetKeys).length === 0) {
            changed = true;
            break;
          }
        }

        if (changed) {
          break;
        }

        cell.value = previousValue;
      }

      if (!changed) {
        return false;
      }
    }
  }

  function restoreRefillConstraints(board, level, protectedCellKeys, refillCellKeys, blockedAnswerCellSetKeys) {
    let guaranteedAnswers = scanBoardForAllowedAnswers(
      board,
      level,
      level.guaranteedDirections,
      blockedAnswerCellSetKeys
    );

    for (let attempt = 0; attempt < 12; attempt += 1) {
      breakBlockedAnswers(board, level, refillCellKeys, protectedCellKeys, blockedAnswerCellSetKeys);
      guaranteedAnswers = restoreGuaranteedAnswers(
        board,
        level,
        protectedCellKeys,
        refillCellKeys,
        blockedAnswerCellSetKeys
      );
      breakBlockedAnswers(board, level, refillCellKeys, protectedCellKeys, blockedAnswerCellSetKeys);
      guaranteedAnswers = scanBoardForAllowedAnswers(
        board,
        level,
        level.guaranteedDirections,
        blockedAnswerCellSetKeys
      );

      if (
        guaranteedAnswers.length >= level.guaranteedAnswerCount &&
        scanBoardForBlockedAnswers(board, level, blockedAnswerCellSetKeys).length === 0
      ) {
        return guaranteedAnswers;
      }
    }

    return guaranteedAnswers;
  }

  function refillCells(board, cells, levelInput, options = {}) {
    const level = typeof levelInput === "number" ? getLevelConfig(levelInput) : levelInput;
    const random = options.random ?? createSeededRandom(options.seed);
    const nextBoard = cloneBoard(board);
    const refillCellKeys = new Set(cells.map(getCellKey));
    const refillCellsOnBoard = cells.map((cell) => {
      if (!isWithinBoard(nextBoard, cell.row, cell.col)) {
        throw new Error(`Cell is outside board: ${cell.row}:${cell.col}`);
      }

      return nextBoard[cell.row][cell.col];
    });
    const blockedAnswerCellSetKeys = createBlockedAnswerCellSetKeys(refillCellsOnBoard, level);
    const protectedCellKeys = collectPreservedAnswerCellKeys(board, level, refillCellKeys);

    for (const cell of refillCellsOnBoard) {
      cell.value = randomInRange(random, level.numberRange);
    }

    const guaranteedAnswers = restoreRefillConstraints(
      nextBoard,
      level,
      protectedCellKeys,
      refillCellKeys,
      blockedAnswerCellSetKeys
    );

    return {
      board: nextBoard,
      level,
      guaranteedAnswers,
      allAnswers: scanBoardForAnswers(nextBoard, level)
    };
  }

  function scanBoardForAnswers(board, levelInput, directionIds = null, options = {}) {
    const level = typeof levelInput === "number" ? getLevelConfig(levelInput) : levelInput;
    const scanDirectionIds = directionIds ?? level.validationDirections;
    const lineDirectionIds = scanDirectionIds.filter((directionId) => directionId !== L_SHAPE_DIRECTION_ID);
    const shouldScanLShapes = directionIds === null || scanDirectionIds.includes(L_SHAPE_DIRECTION_ID);
    const placements = [
      ...listLinePlacements(board, lineDirectionIds, level.selectionLength),
      ...(shouldScanLShapes ? listLShapePlacements(board, level.selectionLength) : [])
    ];
    const acceptsEquation = options.targetOnly ? isEquationTarget : isEquationAllowed;
    const answers = [];

    for (const placement of placements) {
      const values = placement.cells.map((cell) => cell.value);

      if (values.some((value) => value === null)) {
        continue;
      }

      for (const result of evaluateEquation(values, level.operations)) {
        if (!acceptsEquation(level, values, result.operation)) {
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

      const guaranteedAnswers = scanBoardForAnswers(board, level, level.guaranteedDirections, {
        targetOnly: true
      });

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
    listLShapePlacements,
    listLinePlacements,
    restoreGuaranteedAnswers,
    refillCells,
    scanBoardForAnswers,
    generateBoard
  });
})(globalThis);
