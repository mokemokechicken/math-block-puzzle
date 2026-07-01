(function initializeApp(global) {
  let activeController = null;
  let successAnimationToken = 0;

  function getDependencies() {
    const { MathBlockPuzzleBoard, MathBlockPuzzleConfig, MathBlockPuzzleInput, MathBlockPuzzleRules } = global;

    if (!MathBlockPuzzleBoard || !MathBlockPuzzleConfig || !MathBlockPuzzleInput || !MathBlockPuzzleRules) {
      throw new Error("Math block puzzle dependencies are not loaded");
    }

    return {
      board: MathBlockPuzzleBoard,
      config: MathBlockPuzzleConfig,
      input: MathBlockPuzzleInput,
      rules: MathBlockPuzzleRules
    };
  }

  function createGameState(options = {}) {
    const { board, config } = getDependencies();
    const level = config.getLevelConfig(options.levelId ?? 2);
    const generated = board.generateBoard(level, { seed: options.seed ?? 20260701 });

    return {
      level,
      board: generated.board,
      guaranteedAnswers: generated.guaranteedAnswers,
      allAnswers: generated.allAnswers
    };
  }

  function formatSelectionPreview(selection, level) {
    const { rules, config } = getDependencies();

    if (selection.length === 0) {
      return "ブロックをなぞって式を作ろう";
    }

    const values = selection.map((cell) => cell.value);

    if (selection.length === 1) {
      return `${values[0]}`;
    }

    if (selection.length === 2) {
      const operator = level.operations.includes(config.OPERATIONS.subtract) ? "±" : "+";
      return `${values[0]} ${operator} ${values[1]} = ?`;
    }

    const result = rules.validateSelection(selection, level);

    if (result.valid) {
      return result.expression;
    }

    return `${values[0]} ? ${values[1]} = ${values[2]}`;
  }

  function createBoardMarkup(state) {
    return `
      <section class="game-board" aria-label="数字ブロック盤面" data-game-board style="--board-size: ${state.level.board.width}">
        ${state.board.flat().map((cell) => `
          <button
            class="number-block"
            type="button"
            data-cell-id="${cell.id}"
            data-row="${cell.row}"
            data-col="${cell.col}"
            data-value="${cell.value}"
            aria-label="${cell.value}"
          >${cell.value}</button>
        `).join("")}
      </section>
    `;
  }

  function createInitialMarkup(options = {}) {
    const state = createGameState(options);

    return `
      <section class="game-panel" data-game-panel>
        <div class="game-toolbar" aria-label="ゲーム状態">
          <div>
            <p class="status-label">${state.level.name}</p>
            <p class="status-text" data-status-text>縦か横に 3 個なぞってください</p>
          </div>
          <div class="answer-count" aria-label="盤面の正解候補数">
            <span>${state.allAnswers.length}</span>
            <small>こ見つかる</small>
          </div>
        </div>
        <div class="equation-preview" aria-live="polite" data-expression-preview>
          ブロックをなぞって式を作ろう
        </div>
        ${createBoardMarkup(state)}
      </section>
    `;
  }

  function createCellMap(root) {
    const cellMap = new Map();

    for (const element of root.querySelectorAll("[data-cell-id]")) {
      cellMap.set(element.dataset.cellId, {
        id: element.dataset.cellId,
        row: Number(element.dataset.row),
        col: Number(element.dataset.col),
        value: Number(element.dataset.value),
        element
      });
    }

    return cellMap;
  }

  function markSelectedCells(root, selectedCells) {
    const selectedIds = new Set(selectedCells.map((cell) => cell.id));

    for (const element of root.querySelectorAll("[data-cell-id]")) {
      element.classList.toggle("is-selected", selectedIds.has(element.dataset.cellId));
    }
  }

  function setText(element, text) {
    if (element) {
      element.textContent = text;
    }
  }

  function getFloatingEquationPoint(boardRoot, selectedCells) {
    const boardRect = boardRoot.getBoundingClientRect?.();
    const elements = selectedCells
      .map((cell) => cell.element)
      .filter((element) => element && typeof element.getBoundingClientRect === "function");

    if (!boardRect || elements.length === 0) {
      return { x: 50, y: 50 };
    }

    const centers = elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - boardRect.left,
        y: rect.top + rect.height / 2 - boardRect.top
      };
    });

    return {
      x: centers.reduce((sum, point) => sum + point.x, 0) / centers.length,
      y: centers.reduce((sum, point) => sum + point.y, 0) / centers.length
    };
  }

  function prefersReducedMotion() {
    return Boolean(global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  }

  function getSuccessAnimationDurations() {
    if (prefersReducedMotion()) {
      return {
        highlight: 180,
        floating: 240
      };
    }

    return {
      highlight: 520,
      floating: 1200
    };
  }

  function playSuccessAnimation(boardRoot, selectedCells, expression) {
    if (!boardRoot || !global.document) {
      return null;
    }

    const token = String(successAnimationToken += 1);
    const durations = getSuccessAnimationDurations();

    for (const cell of selectedCells) {
      cell.element?.classList.add("is-correct");

      if (cell.element?.dataset) {
        cell.element.dataset.correctToken = token;
      }
    }

    const point = getFloatingEquationPoint(boardRoot, selectedCells);
    const floating = global.document.createElement("div");
    floating.className = "floating-equation";
    floating.textContent = expression;
    floating.style.left = `${point.x}px`;
    floating.style.top = `${point.y}px`;
    boardRoot.append(floating);

    global.setTimeout?.(() => {
      floating.remove();
    }, durations.floating);

    global.setTimeout?.(() => {
      for (const cell of selectedCells) {
        if (!cell.element) {
          continue;
        }

        if (cell.element.dataset?.correctToken === token) {
          cell.element.classList.remove("is-correct");
          delete cell.element.dataset.correctToken;
        }
      }
    }, durations.highlight);

    return floating;
  }

  function setupBoardInput(root, state) {
    if (typeof root.querySelector !== "function") {
      return null;
    }

    const { input, rules } = getDependencies();
    const boardRoot = root.querySelector("[data-game-board]");
    const statusText = root.querySelector("[data-status-text]");
    const expressionPreview = root.querySelector("[data-expression-preview]");

    if (!boardRoot) {
      return null;
    }

    const cellMap = createCellMap(boardRoot);
    const getCellFromEvent = input.createElementCellResolver({
      root: boardRoot,
      getCellById: (cellId) => cellMap.get(cellId) ?? null
    });

    return input.createPointerDragController({
      root: boardRoot,
      getCellFromEvent,
      onSelectionChange: (selection) => {
        markSelectedCells(boardRoot, selection);
        setText(statusText, `${selection.length} 個選択中`);
        setText(expressionPreview, formatSelectionPreview(selection, state.level));
      },
      onSelectionComplete: (selection) => {
        const result = rules.validateSelection(selection, state.level);

        setText(expressionPreview, formatSelectionPreview(selection, state.level));
        setText(statusText, result.valid ? `正解: ${result.expression}` : "もう一度なぞってみよう");

        if (result.valid) {
          playSuccessAnimation(boardRoot, selection, result.expression);
        }

        markSelectedCells(boardRoot, []);
      },
      onSelectionCancel: () => {
        markSelectedCells(boardRoot, []);
        setText(statusText, "選択をキャンセルしました");
        setText(expressionPreview, "ブロックをなぞって式を作ろう");
      }
    });
  }

  function renderInitialScreen(root, options = {}) {
    if (!root) {
      throw new Error("Missing #game-root mount point");
    }

    if (activeController) {
      activeController.destroy();
      activeController = null;
    }

    const state = createGameState(options);
    root.innerHTML = `
      <section class="game-panel" data-game-panel>
        <div class="game-toolbar" aria-label="ゲーム状態">
          <div>
            <p class="status-label">${state.level.name}</p>
            <p class="status-text" data-status-text>縦か横に 3 個なぞってください</p>
          </div>
          <div class="answer-count" aria-label="盤面の正解候補数">
            <span>${state.allAnswers.length}</span>
            <small>こ見つかる</small>
          </div>
        </div>
        <div class="equation-preview" aria-live="polite" data-expression-preview>
          ブロックをなぞって式を作ろう
        </div>
        ${createBoardMarkup(state)}
      </section>
    `;
    activeController = setupBoardInput(root, state);
  }

  global.MathBlockPuzzleApp = {
    createGameState,
    formatSelectionPreview,
    createBoardMarkup,
    createInitialMarkup,
    createCellMap,
    markSelectedCells,
    getFloatingEquationPoint,
    prefersReducedMotion,
    getSuccessAnimationDurations,
    playSuccessAnimation,
    setupBoardInput,
    renderInitialScreen
  };

  if (global.document) {
    renderInitialScreen(global.document.querySelector("#game-root"));
  }
})(globalThis);
