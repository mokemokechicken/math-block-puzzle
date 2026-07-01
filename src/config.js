(function defineGameConfig(global) {
  const NUMBER_RANGE = Object.freeze({
    min: 1,
    max: 20,
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
  const READABLE_DIRECTION_IDS = Object.freeze([DIRECTIONS.leftToRight.id, DIRECTIONS.topToBottom.id]);

  function range(min, max) {
    return Object.freeze({ min, max });
  }

  function equationConstraints(constraints) {
    return Object.freeze(Object.fromEntries(
      Object.entries(constraints).map(([operation, roles]) => [
        operation,
        Object.freeze({
          left: roles.left ?? NUMBER_RANGE,
          right: roles.right ?? NUMBER_RANGE,
          answer: roles.answer ?? NUMBER_RANGE
        })
      ])
    ));
  }

  const LEVELS = Object.freeze([
    Object.freeze({
      id: 1,
      name: "レベル 1: 5までのたし算",
      shortName: "5までのたし算",
      board: Object.freeze({ width: 4, height: 4 }),
      selectionLength: 3,
      operations: Object.freeze([OPERATIONS.add]),
      validationDirections: ALL_DIRECTION_IDS,
      guaranteedDirections: READABLE_DIRECTION_IDS,
      guaranteedAnswerCount: 4,
      clearAnswerCount: 5,
      numberRange: range(1, 5),
      equationConstraints: equationConstraints({
        [OPERATIONS.add]: {
          left: range(1, 4),
          right: range(1, 4),
          answer: range(2, 5)
        }
      })
    }),
    Object.freeze({
      id: 2,
      name: "レベル 2: 10までのたし算",
      shortName: "10までのたし算",
      board: Object.freeze({ width: 4, height: 4 }),
      selectionLength: 3,
      operations: Object.freeze([OPERATIONS.add]),
      validationDirections: ALL_DIRECTION_IDS,
      guaranteedDirections: READABLE_DIRECTION_IDS,
      guaranteedAnswerCount: 4,
      clearAnswerCount: 5,
      numberRange: range(1, 10),
      equationConstraints: equationConstraints({
        [OPERATIONS.add]: {
          left: range(1, 9),
          right: range(1, 9),
          answer: range(2, 10)
        }
      })
    }),
    Object.freeze({
      id: 3,
      name: "レベル 3: 10までのひき算",
      shortName: "10までのひき算",
      board: Object.freeze({ width: 4, height: 4 }),
      selectionLength: 3,
      operations: Object.freeze([OPERATIONS.subtract]),
      validationDirections: ALL_DIRECTION_IDS,
      guaranteedDirections: READABLE_DIRECTION_IDS,
      guaranteedAnswerCount: 4,
      clearAnswerCount: 5,
      numberRange: range(1, 10),
      equationConstraints: equationConstraints({
        [OPERATIONS.subtract]: {
          left: range(2, 10),
          right: range(1, 9),
          answer: range(1, 9)
        }
      })
    }),
    Object.freeze({
      id: 4,
      name: "レベル 4: 10までのたし算・ひき算",
      shortName: "10までの加減",
      board: Object.freeze({ width: 4, height: 4 }),
      selectionLength: 3,
      operations: Object.freeze([OPERATIONS.add, OPERATIONS.subtract]),
      validationDirections: ALL_DIRECTION_IDS,
      guaranteedDirections: READABLE_DIRECTION_IDS,
      guaranteedAnswerCount: 4,
      clearAnswerCount: 5,
      numberRange: range(1, 10),
      equationConstraints: equationConstraints({
        [OPERATIONS.add]: {
          left: range(1, 9),
          right: range(1, 9),
          answer: range(2, 10)
        },
        [OPERATIONS.subtract]: {
          left: range(2, 10),
          right: range(1, 9),
          answer: range(1, 9)
        }
      })
    }),
    Object.freeze({
      id: 5,
      name: "レベル 5: 20までのたし算",
      shortName: "20までのたし算",
      board: Object.freeze({ width: 5, height: 5 }),
      selectionLength: 3,
      operations: Object.freeze([OPERATIONS.add]),
      validationDirections: ALL_DIRECTION_IDS,
      guaranteedDirections: READABLE_DIRECTION_IDS,
      guaranteedAnswerCount: 4,
      clearAnswerCount: 5,
      numberRange: range(1, 20),
      equationConstraints: equationConstraints({
        [OPERATIONS.add]: {
          left: range(1, 19),
          right: range(1, 19),
          answer: range(2, 20)
        }
      })
    }),
    Object.freeze({
      id: 6,
      name: "レベル 6: 20までのひき算",
      shortName: "20までのひき算",
      board: Object.freeze({ width: 5, height: 5 }),
      selectionLength: 3,
      operations: Object.freeze([OPERATIONS.subtract]),
      validationDirections: ALL_DIRECTION_IDS,
      guaranteedDirections: READABLE_DIRECTION_IDS,
      guaranteedAnswerCount: 4,
      clearAnswerCount: 5,
      numberRange: range(1, 20),
      equationConstraints: equationConstraints({
        [OPERATIONS.subtract]: {
          left: range(2, 20),
          right: range(1, 19),
          answer: range(1, 19)
        }
      })
    }),
    Object.freeze({
      id: 7,
      name: "レベル 7: くり上がりのたし算",
      shortName: "くり上がり",
      board: Object.freeze({ width: 5, height: 5 }),
      selectionLength: 3,
      operations: Object.freeze([OPERATIONS.add]),
      validationDirections: ALL_DIRECTION_IDS,
      guaranteedDirections: READABLE_DIRECTION_IDS,
      guaranteedAnswerCount: 4,
      clearAnswerCount: 5,
      numberRange: range(1, 18),
      equationConstraints: equationConstraints({
        [OPERATIONS.add]: {
          left: range(1, 9),
          right: range(1, 9),
          answer: range(11, 18)
        }
      })
    }),
    Object.freeze({
      id: 8,
      name: "レベル 8: くり下がりのひき算",
      shortName: "くり下がり",
      board: Object.freeze({ width: 5, height: 5 }),
      selectionLength: 3,
      operations: Object.freeze([OPERATIONS.subtract]),
      validationDirections: ALL_DIRECTION_IDS,
      guaranteedDirections: READABLE_DIRECTION_IDS,
      guaranteedAnswerCount: 4,
      clearAnswerCount: 5,
      numberRange: range(1, 18),
      equationConstraints: equationConstraints({
        [OPERATIONS.subtract]: {
          left: range(11, 18),
          right: range(1, 9),
          answer: range(1, 9)
        }
      })
    }),
    Object.freeze({
      id: 9,
      name: "レベル 9: たし算・ひき算マスター",
      shortName: "加減マスター",
      board: Object.freeze({ width: 5, height: 5 }),
      selectionLength: 3,
      operations: Object.freeze([OPERATIONS.add, OPERATIONS.subtract]),
      validationDirections: ALL_DIRECTION_IDS,
      guaranteedDirections: ALL_DIRECTION_IDS,
      guaranteedAnswerCount: 4,
      clearAnswerCount: 5,
      numberRange: NUMBER_RANGE,
      equationConstraints: equationConstraints({
        [OPERATIONS.add]: {
          left: range(1, 19),
          right: range(1, 19),
          answer: range(2, 20)
        },
        [OPERATIONS.subtract]: {
          left: range(2, 20),
          right: range(1, 19),
          answer: range(1, 19)
        }
      })
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

  function isValueInRange(value, valueRange) {
    return value >= valueRange.min && value <= valueRange.max;
  }

  function getEquationConstraint(level, operation) {
    return level.equationConstraints?.[operation] ?? null;
  }

  function isEquationAllowed(level, values, operation) {
    const constraint = getEquationConstraint(level, operation);

    if (!isOperationAllowed(level, operation) || !constraint) {
      return false;
    }

    return (
      isValueInRange(values[0], constraint.left) &&
      isValueInRange(values[1], constraint.right) &&
      isValueInRange(values[2], constraint.answer)
    );
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
    READABLE_DIRECTION_IDS,
    LEVELS,
    getLevelConfig,
    getDirection,
    getEquationConstraint,
    isEquationAllowed,
    isOperationAllowed,
    isValidationDirection,
    isGuaranteedDirection
  });
})(globalThis);
