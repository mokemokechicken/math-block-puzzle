(function initializeApp(global) {
  let activeController = null;
  let soundController = null;
  let successAnimationToken = 0;
  let boardSeed = 20260701;
  let boardRefreshTimer = null;
  let boardRefreshToken = 0;
  let audioUnlockHandlersInstalled = false;
  const DEFAULT_LEVEL_ID = 1;
  const DEFAULT_EXPRESSION_PREVIEW = "ブロックをなぞって式を作ろう";
  const HINT_CELL_CLASSES = ["is-hint-source", "is-hint-answer", "is-hint-line"];
  const AUDIO_UNLOCK_EVENTS = ["pointerdown", "touchstart", "mousedown", "click", "keydown"];

  function getSoundController() {
    if (!soundController && global.MathBlockPuzzleAudio?.createSoundController) {
      soundController = global.MathBlockPuzzleAudio.createSoundController();
    }

    return soundController;
  }

  function playSound(soundType) {
    getSoundController()?.play(soundType);
  }

  function unlockAudioFromUserGesture() {
    getSoundController()?.unlock?.();
  }

  function installAudioUnlockHandlers(target = global.document) {
    if (audioUnlockHandlersInstalled || !target || typeof target.addEventListener !== "function") {
      return false;
    }

    const options = {
      capture: true,
      passive: true
    };

    for (const eventName of AUDIO_UNLOCK_EVENTS) {
      target.addEventListener(eventName, unlockAudioFromUserGesture, options);
    }

    audioUnlockHandlersInstalled = true;
    return true;
  }

  function getDependencies() {
    const {
      MathBlockPuzzleBoard,
      MathBlockPuzzleConfig,
      MathBlockPuzzleHints,
      MathBlockPuzzleInput,
      MathBlockPuzzleRules
    } = global;

    if (
      !MathBlockPuzzleBoard ||
      !MathBlockPuzzleConfig ||
      !MathBlockPuzzleHints ||
      !MathBlockPuzzleInput ||
      !MathBlockPuzzleRules
    ) {
      throw new Error("Math block puzzle dependencies are not loaded");
    }

    return {
      board: MathBlockPuzzleBoard,
      config: MathBlockPuzzleConfig,
      hints: MathBlockPuzzleHints,
      input: MathBlockPuzzleInput,
      rules: MathBlockPuzzleRules
    };
  }

  function createGameState(options = {}) {
    const { board, config } = getDependencies();
    const level = config.getLevelConfig(options.levelId ?? DEFAULT_LEVEL_ID);
    const generated = options.board ? {
      board: options.board,
      guaranteedAnswers: board.scanBoardForAnswers(options.board, level, level.guaranteedDirections, {
        targetOnly: true
      }),
      allAnswers: board.scanBoardForAnswers(options.board, level)
    } : board.generateBoard(level, { seed: options.seed ?? 20260701 });

    return {
      level,
      board: generated.board,
      guaranteedAnswers: generated.guaranteedAnswers,
      allAnswers: generated.allAnswers,
      correctCount: options.correctCount ?? 0,
      completed: Boolean(options.completed),
      completionReason: options.completionReason ?? null
    };
  }

  function nextBoardSeed() {
    boardSeed += 1;
    return boardSeed;
  }

  function formatSelectionPreview(selection, level) {
    const { rules, config } = getDependencies();

    if (selection.length === 0) {
      return DEFAULT_EXPRESSION_PREVIEW;
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

  function createLevelSelectorMarkup(state) {
    const { config } = getDependencies();

    return `
      <nav class="level-selector" aria-label="レベル選択">
        ${config.LEVELS.map((level) => `
          <button
            class="level-button${level.id === state.level.id ? " is-active" : ""}"
            type="button"
            data-level-id="${level.id}"
            aria-pressed="${level.id === state.level.id ? "true" : "false"}"
          >
            <span>Lv ${level.id}</span>
            <small>${level.shortName}</small>
          </button>
        `).join("")}
      </nav>
    `;
  }

  function createAudioToggleMarkup() {
    const controller = getSoundController();
    const isMuted = Boolean(controller?.isMuted?.());

    return `
      <button class="audio-toggle" type="button" data-audio-toggle aria-pressed="${isMuted ? "true" : "false"}">
        ${isMuted ? "音オフ" : "音オン"}
      </button>
    `;
  }

  function getCompletionMessage(state) {
    if (state.completionReason === "no-answers") {
      return "候補をすべて見つけました";
    }

    return `${state.level.clearAnswerCount}問できました`;
  }

  function createClearMarkup(state) {
    const { config } = getDependencies();
    const hasNextLevel = state.level.id < config.LEVELS.length;

    return `
      <section class="clear-panel" data-clear-panel>
        <p class="status-label">クリア</p>
        <p class="clear-text">${getCompletionMessage(state)}</p>
        <div class="clear-actions">
          <button type="button" class="clear-action" data-retry-level>もう一回</button>
          ${hasNextLevel ? `
            <button type="button" class="clear-action is-primary" data-next-level="${state.level.id + 1}">
              次のレベル
            </button>
          ` : ""}
        </div>
      </section>
    `;
  }

  function createGamePanelMarkup(state) {
    return `
      <section class="game-panel" data-game-panel data-current-level-id="${state.level.id}">
        <div class="game-controls">
          ${createLevelSelectorMarkup(state)}
          ${createAudioToggleMarkup()}
        </div>
        <div class="game-toolbar" aria-label="ゲーム状態">
          <div>
            <p class="status-label">${state.level.name}</p>
            <p class="status-text" data-status-text>縦か横に 3 個なぞってください</p>
          </div>
          <div class="game-counters">
            <div class="progress-count" aria-label="正解数">
              <span>${state.correctCount} / ${state.level.clearAnswerCount}</span>
              <small>正解</small>
            </div>
            <div class="answer-count" aria-label="盤面の正解候補数">
              <span>${state.allAnswers.length}</span>
              <small>こ見つかる</small>
            </div>
          </div>
        </div>
        ${state.completed ? createClearMarkup(state) : `
          <div class="equation-preview" aria-live="polite" data-expression-preview>
            ${DEFAULT_EXPRESSION_PREVIEW}
          </div>
          ${createBoardMarkup(state)}
        `}
      </section>
    `;
  }

  function createInitialMarkup(options = {}) {
    const state = createGameState(options);

    return createGamePanelMarkup(state);
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

  function clearHintCellClasses(boardRoot) {
    if (!boardRoot || typeof boardRoot.querySelectorAll !== "function") {
      return;
    }

    for (const element of boardRoot.querySelectorAll("[data-cell-id]")) {
      for (const className of HINT_CELL_CLASSES) {
        element.classList.remove(className);
      }
    }
  }

  function applyHintStage(boardRoot, cellMap, answer, stage) {
    const { hints } = getDependencies();
    const className = hints.getHintClassName(stage);
    const cellIds = hints.getHintCellIds(answer, stage);

    clearHintCellClasses(boardRoot);

    if (!className) {
      return [];
    }

    const markedElements = [];

    for (const cellId of cellIds) {
      const element = cellMap.get(cellId)?.element;

      if (element) {
        element.classList.add(className);
        markedElements.push(element);
      }
    }

    return markedElements;
  }

  function createHintController(options) {
    const { hints } = getDependencies();
    const {
      boardRoot,
      cellMap,
      answer,
      expressionPreview,
      statusText,
      onStageChange = null,
      delays = hints.HINT_STAGE_DELAYS
    } = options;

    let destroyed = false;
    let currentStage = hints.HINT_STAGES.none;
    let hintToken = 0;
    let timers = [];

    function clearTimers() {
      hintToken += 1;

      for (const timer of timers) {
        global.clearTimeout?.(timer);
      }

      timers = [];
      return hintToken;
    }

    function showStage(stage) {
      if (destroyed || !answer) {
        return;
      }

      currentStage = hints.clampHintStage(stage);
      applyHintStage(boardRoot, cellMap, answer, currentStage);

      const expression = hints.getHintExpression(answer, currentStage);

      if (expression) {
        setText(expressionPreview, `ヒント: ${expression}`);
      }

      if (currentStage > hints.HINT_STAGES.none) {
        setText(statusText, "ヒントが光っています");
        onStageChange?.(currentStage);
      }
    }

    function schedule() {
      if (destroyed || !answer) {
        return;
      }

      const token = clearTimers();

      delays.forEach((delay, index) => {
        const stage = index + 1;
        const timer = global.setTimeout?.(() => {
          if (destroyed || token !== hintToken) {
            return;
          }

          showStage(stage);
        }, delay);

        if (timer !== undefined && timer !== null) {
          timers.push(timer);
        }
      });
    }

    function reset() {
      clearHintCellClasses(boardRoot);
      currentStage = hints.HINT_STAGES.none;
      schedule();
    }

    function stop() {
      clearTimers();
      clearHintCellClasses(boardRoot);
      currentStage = hints.HINT_STAGES.none;
    }

    function destroy() {
      destroyed = true;
      stop();
    }

    schedule();

    return {
      reset,
      stop,
      destroy,
      showStage,
      getStage: () => currentStage
    };
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

  function getFloatingEquationViewportPoint(selectedCells) {
    const elements = selectedCells
      .map((cell) => cell.element)
      .filter((element) => element && typeof element.getBoundingClientRect === "function");

    if (elements.length === 0) {
      return { x: 50, y: 50 };
    }

    const centers = elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
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

  function getBoardRefillDelay() {
    return prefersReducedMotion() ? 60 : 120;
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
    const detachedContainer = global.document.body;
    const isDetached = Boolean(detachedContainer?.append);

    for (const cell of selectedCells) {
      cell.element?.classList.add("is-correct");

      if (cell.element?.dataset) {
        cell.element.dataset.correctToken = token;
      }
    }

    const point = isDetached
      ? getFloatingEquationViewportPoint(selectedCells)
      : getFloatingEquationPoint(boardRoot, selectedCells);
    const floating = global.document.createElement("div");
    floating.className = isDetached ? "floating-equation floating-equation--detached" : "floating-equation";
    floating.textContent = expression;
    floating.style.left = `${point.x}px`;
    floating.style.top = `${point.y}px`;

    if (isDetached) {
      detachedContainer.append(floating);
    } else {
      boardRoot.append(floating);
    }

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

  function markClearingCells(selectedCells) {
    for (const cell of selectedCells) {
      cell.element?.classList.add("is-clearing");
    }
  }

  function clearScheduledBoardRefresh() {
    boardRefreshToken += 1;

    if (boardRefreshTimer !== null) {
      global.clearTimeout?.(boardRefreshTimer);
      boardRefreshTimer = null;
    }

    return boardRefreshToken;
  }

  function scheduleBoardRefresh(root, levelId, delay = 900) {
    const token = clearScheduledBoardRefresh();

    boardRefreshTimer = global.setTimeout?.(() => {
      if (token !== boardRefreshToken) {
        return;
      }

      boardRefreshTimer = null;
      renderInitialScreen(root, {
        levelId,
        seed: nextBoardSeed(),
        scrollToBoard: true
      });
    }, delay) ?? null;

    return boardRefreshTimer;
  }

  function completeState(state, completionReason) {
    return {
      ...state,
      completed: true,
      completionReason
    };
  }

  function scheduleBoardRefill(root, state, selectedCells, delay = 900) {
    const { board } = getDependencies();
    const token = clearScheduledBoardRefresh();
    const cellsToRefill = selectedCells.map((cell) => ({
      row: cell.row,
      col: cell.col
    }));

    boardRefreshTimer = global.setTimeout?.(() => {
      if (token !== boardRefreshToken) {
        return;
      }

      boardRefreshTimer = null;

      if (state.correctCount >= state.level.clearAnswerCount) {
        playSound(global.MathBlockPuzzleAudio?.SOUND_TYPES.clear);
        renderGameState(root, completeState(state, "target"));
        return;
      }

      const refilled = board.refillCells(state.board, cellsToRefill, state.level, {
        seed: nextBoardSeed()
      });
      const nextState = {
        ...state,
        board: refilled.board,
        guaranteedAnswers: refilled.guaranteedAnswers,
        allAnswers: refilled.allAnswers
      };

      if (nextState.allAnswers.length === 0) {
        playSound(global.MathBlockPuzzleAudio?.SOUND_TYPES.clear);
        renderGameState(root, completeState(nextState, "no-answers"));
        return;
      }

      renderGameState(root, nextState);
    }, delay) ?? null;

    return boardRefreshTimer;
  }

  function setupBoardInput(root, state) {
    if (typeof root.querySelector !== "function") {
      return null;
    }

    const { hints, input, rules } = getDependencies();
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

    const hintController = createHintController({
      boardRoot,
      cellMap,
      answer: hints.chooseHintAnswer(state.guaranteedAnswers),
      expressionPreview,
      statusText,
      onStageChange: () => playSound(global.MathBlockPuzzleAudio?.SOUND_TYPES.hint)
    });

    const pointerController = input.createPointerDragController({
      root: boardRoot,
      getCellFromEvent,
      onInteractionStart: () => {
        getSoundController()?.unlock?.();
      },
      onSelectionChange: (selection) => {
        getSoundController()?.unlock?.();
        hintController.reset();
        markSelectedCells(boardRoot, selection);
        setText(statusText, `${selection.length} 個選択中`);
        setText(expressionPreview, formatSelectionPreview(selection, state.level));
      },
      onSelectionComplete: (selection) => {
        const result = rules.validateSelection(selection, state.level);

        setText(expressionPreview, formatSelectionPreview(selection, state.level));
        setText(statusText, result.valid ? `正解: ${result.expression}` : "もう一度なぞってみよう");

        if (result.valid) {
          const nextState = {
            ...state,
            correctCount: state.correctCount + 1
          };

          playSound(global.MathBlockPuzzleAudio?.SOUND_TYPES.correct);
          hintController.stop();
          playSuccessAnimation(boardRoot, selection, result.expression);
          markClearingCells(selection);
          boardRoot.classList.add("is-resolving");
          scheduleBoardRefill(root, nextState, selection, getBoardRefillDelay());
        } else {
          playSound(global.MathBlockPuzzleAudio?.SOUND_TYPES.incorrect);
          hintController.reset();
        }

        markSelectedCells(boardRoot, []);
      },
      onSelectionCancel: () => {
        hintController.reset();
        markSelectedCells(boardRoot, []);
        setText(statusText, "選択をキャンセルしました");
        setText(expressionPreview, DEFAULT_EXPRESSION_PREVIEW);
      }
    });

    return {
      destroy() {
        pointerController.destroy();
        hintController.destroy();
      }
    };
  }

  function setupGameControls(root, state) {
    if (typeof root.querySelectorAll !== "function") {
      return;
    }

    for (const button of root.querySelectorAll("[data-level-id]")) {
      button.addEventListener?.("click", () => {
        renderInitialScreen(root, {
          levelId: Number(button.dataset.levelId),
          seed: nextBoardSeed(),
          scrollToBoard: true
        });
      });
    }

    const audioToggle = root.querySelector?.("[data-audio-toggle]");

    audioToggle?.addEventListener?.("click", () => {
      const controller = getSoundController();
      const isMuted = controller?.toggleMuted?.() ?? true;

      audioToggle.textContent = isMuted ? "音オフ" : "音オン";
      audioToggle.setAttribute?.("aria-pressed", isMuted ? "true" : "false");

      if (!isMuted) {
        controller?.unlock?.();
      }
    });

    root.querySelector?.("[data-retry-level]")?.addEventListener?.("click", () => {
      renderInitialScreen(root, {
        levelId: state.level.id,
        seed: nextBoardSeed(),
        scrollToBoard: true
      });
    });

    root.querySelector?.("[data-next-level]")?.addEventListener?.("click", (event) => {
      renderInitialScreen(root, {
        levelId: Number(event.currentTarget.dataset.nextLevel),
        seed: nextBoardSeed(),
        scrollToBoard: true
      });
    });
  }

  function scrollBoardIntoView(root) {
    const boardRoot = root?.querySelector?.("[data-game-board]");
    const canUseScrollTo = (
      typeof global.scrollTo === "function" &&
      typeof boardRoot?.getBoundingClientRect === "function"
    );
    const canUseScrollIntoView = typeof boardRoot?.scrollIntoView === "function";

    if (!boardRoot || (!canUseScrollTo && !canUseScrollIntoView)) {
      return false;
    }

    const scroll = () => {
      if (canUseScrollTo) {
        const rect = boardRoot.getBoundingClientRect();
        const viewportHeight = global.innerHeight ?? global.document?.documentElement?.clientHeight ?? 0;
        const scrollingElement = global.document?.scrollingElement ?? global.document?.documentElement;
        const currentTop = global.scrollY ?? global.pageYOffset ?? scrollingElement?.scrollTop ?? 0;
        const currentLeft = global.scrollX ?? global.pageXOffset ?? scrollingElement?.scrollLeft ?? 0;
        const targetTop = Math.max(0, currentTop + rect.bottom - viewportHeight + 16);

        global.scrollTo({
          top: targetTop,
          left: currentLeft,
          behavior: "smooth"
        });
        return;
      }

      boardRoot.scrollIntoView?.({
        block: "end",
        inline: "nearest",
        behavior: "smooth"
      });
    };

    const runScroll = () => {
      scroll();
      global.setTimeout?.(scroll, 120);
    };

    if (typeof global.requestAnimationFrame === "function") {
      global.requestAnimationFrame(() => {
        if (typeof global.requestAnimationFrame === "function") {
          global.requestAnimationFrame(runScroll);
        } else {
          runScroll();
        }
      });
    } else {
      runScroll();
    }

    return true;
  }

  function renderGameState(root, state) {
    clearScheduledBoardRefresh();

    if (activeController) {
      activeController.destroy();
      activeController = null;
    }

    root.innerHTML = createGamePanelMarkup(state);
    setupGameControls(root, state);

    if (!state.completed) {
      activeController = setupBoardInput(root, state);
    }
  }

  function renderInitialScreen(root, options = {}) {
    if (!root) {
      throw new Error("Missing #game-root mount point");
    }

    const state = createGameState(options);
    renderGameState(root, state);

    if (options.scrollToBoard) {
      scrollBoardIntoView(root);
    }
  }

  global.MathBlockPuzzleApp = {
    createGameState,
    nextBoardSeed,
    formatSelectionPreview,
    createBoardMarkup,
    createGamePanelMarkup,
    createLevelSelectorMarkup,
    createAudioToggleMarkup,
    createClearMarkup,
    createInitialMarkup,
    createCellMap,
    markSelectedCells,
    unlockAudioFromUserGesture,
    installAudioUnlockHandlers,
    clearHintCellClasses,
    applyHintStage,
    createHintController,
    getFloatingEquationPoint,
    getFloatingEquationViewportPoint,
    prefersReducedMotion,
    getBoardRefillDelay,
    getSuccessAnimationDurations,
    playSuccessAnimation,
    markClearingCells,
    clearScheduledBoardRefresh,
    scheduleBoardRefresh,
    scheduleBoardRefill,
    completeState,
    setupGameControls,
    scrollBoardIntoView,
    setupBoardInput,
    renderGameState,
    renderInitialScreen
  };

  if (global.document) {
    installAudioUnlockHandlers(global.document);
    renderInitialScreen(global.document.querySelector("#game-root"));
  }
})(globalThis);
