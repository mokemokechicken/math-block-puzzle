(function defineGameConfig(global) {
  const NUMBER_RANGE = Object.freeze({
    min: 1,
    max: 18,
    includesZero: false
  });

  const OPERATIONS = Object.freeze({
    add: "add",
    subtract: "subtract"
  });

  const DIRECTIONS = Object.freeze({
    leftToRight: Object.freeze({
      id: "left-to-right",
      label: "左から右",
      rowStep: 0,
      colStep: 1
    }),
    rightToLeft: Object.freeze({
      id: "right-to-left",
      label: "右から左",
      rowStep: 0,
      colStep: -1
    }),
    topToBottom: Object.freeze({
      id: "top-to-bottom",
      label: "上から下",
      rowStep: 1,
      colStep: 0
    }),
    bottomToTop: Object.freeze({
      id: "bottom-to-top",
      label: "下から上",
      rowStep: -1,
      colStep: 0
    })
  });

  const ALL_DIRECTION_IDS = Object.freeze(Object.values(DIRECTIONS).map((direction) => direction.id));

  const LEVELS = Object.freeze([
    Object.freeze({
      id: 1,
      name: "レベル 1",
      board: Object.freeze({ width: 4, height: 4 }),
      selectionLength: 3,
      operations: Object.freeze([OPERATIONS.add]),
      validationDirections: ALL_DIRECTION_IDS,
      guaranteedDirections: Object.freeze([DIRECTIONS.leftToRight.id, DIRECTIONS.topToBottom.id]),
      guaranteedAnswerCount: 4,
      numberRange: NUMBER_RANGE
    }),
    Object.freeze({
      id: 2,
      name: "レベル 2",
      board: Object.freeze({ width: 5, height: 5 }),
      selectionLength: 3,
      operations: Object.freeze([OPERATIONS.add, OPERATIONS.subtract]),
      validationDirections: ALL_DIRECTION_IDS,
      guaranteedDirections: Object.freeze([DIRECTIONS.leftToRight.id, DIRECTIONS.topToBottom.id]),
      guaranteedAnswerCount: 4,
      numberRange: NUMBER_RANGE
    }),
    Object.freeze({
      id: 3,
      name: "レベル 3",
      board: Object.freeze({ width: 5, height: 5 }),
      selectionLength: 3,
      operations: Object.freeze([OPERATIONS.add, OPERATIONS.subtract]),
      validationDirections: ALL_DIRECTION_IDS,
      guaranteedDirections: ALL_DIRECTION_IDS,
      guaranteedAnswerCount: 3,
      numberRange: NUMBER_RANGE
    }),
    Object.freeze({
      id: 4,
      name: "レベル 4",
      board: Object.freeze({ width: 5, height: 5 }),
      selectionLength: 3,
      operations: Object.freeze([OPERATIONS.add, OPERATIONS.subtract]),
      validationDirections: ALL_DIRECTION_IDS,
      guaranteedDirections: ALL_DIRECTION_IDS,
      guaranteedAnswerCount: 2,
      numberRange: NUMBER_RANGE
    })
  ]);

  function getLevelConfig(levelId) {
    const numericLevelId = Number(levelId);
    const level = LEVELS.find((candidate) => candidate.id === numericLevelId);

    if (!level) {
      throw new Error(`Unknown level: ${levelId}`);
    }

    return level;
  }

  function getDirection(directionId) {
    const direction = Object.values(DIRECTIONS).find((candidate) => candidate.id === directionId);

    if (!direction) {
      throw new Error(`Unknown direction: ${directionId}`);
    }

    return direction;
  }

  function isOperationAllowed(level, operation) {
    return level.operations.includes(operation);
  }

  function isValidationDirection(level, directionId) {
    return level.validationDirections.includes(directionId);
  }

  function isGuaranteedDirection(level, directionId) {
    return level.guaranteedDirections.includes(directionId);
  }

  global.MathBlockPuzzleConfig = Object.freeze({
    NUMBER_RANGE,
    OPERATIONS,
    DIRECTIONS,
    ALL_DIRECTION_IDS,
    LEVELS,
    getLevelConfig,
    getDirection,
    isOperationAllowed,
    isValidationDirection,
    isGuaranteedDirection
  });
})(globalThis);
