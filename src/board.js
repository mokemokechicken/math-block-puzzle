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
    NUMBER_RANGE,
    OPERATIONS,
    getDirection,
    getLevelConfig
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

  function createEquation(level, random) {
    const operation = level.operations[randomInt(random, 0, level.operations.length - 1)];

    if (operation === OPERATIONS.add) {
      const left = randomInt(random, NUMBER_RANGE.min, NUMBER_RANGE.max - 1);
      const right = randomInt(random, NUMBER_RANGE.min, NUMBER_RANGE.max - left);
      return { operation, values: [left, right, left + right] };
    }

    if (operation === OPERATIONS.subtract) {
      const answer = randomInt(random, NUMBER_RANGE.min, NUMBER_RANGE.max - 1);
      const right = randomInt(random, NUMBER_RANGE.min, NUMBER_RANGE.max - answer);
      return { operation, values: [answer + right, right, answer] };
    }

    throw new Error(`Unsupported operation: ${operation}`);
  }

  function fillLine(cells, values) {
    cells.forEach((cell, index) => {
      cell.value = values[index];
    });
  }

  function fillRandomNumbers(board, random) {
    for (const row of board) {
      for (const cell of row) {
        if (cell.value === null) {
          cell.value = randomInt(random, NUMBER_RANGE.min, NUMBER_RANGE.max);
        }
      }
    }
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

      fillRandomNumbers(board, baseRandom);

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
    scanBoardForAnswers,
    generateBoard
  });
})(globalThis);
