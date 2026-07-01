(function definePointerInput(global) {
  function getCellKey(cell) {
    return cell ? `${cell.row}:${cell.col}` : "";
  }

  function getStepBetweenCells(fromCell, toCell) {
    return {
      rowStep: toCell.row - fromCell.row,
      colStep: toCell.col - fromCell.col
    };
  }

  function getDirectionFromStep(step) {
    if (step.rowStep === 0 && step.colStep === 1) {
      return "left-to-right";
    }

    if (step.rowStep === 0 && step.colStep === -1) {
      return "right-to-left";
    }

    if (step.rowStep === 1 && step.colStep === 0) {
      return "top-to-bottom";
    }

    if (step.rowStep === -1 && step.colStep === 0) {
      return "bottom-to-top";
    }

    return null;
  }

  function isAdjacentStraightStep(step) {
    return getDirectionFromStep(step) !== null;
  }

  function isSameCell(first, second) {
    return getCellKey(first) === getCellKey(second);
  }

  function extendSelection(selection, nextCell, options = {}) {
    const maxLength = options.maxLength ?? 3;

    if (!nextCell) {
      return selection;
    }

    const selected = [...selection];
    const last = selected[selected.length - 1];

    if (!last || isSameCell(last, nextCell)) {
      return selected;
    }

    if (selected.length >= 2 && isSameCell(selected[selected.length - 2], nextCell)) {
      selected.pop();
      return selected;
    }

    if (selected.length >= maxLength) {
      return selected;
    }

    const step = getStepBetweenCells(last, nextCell);

    if (!isAdjacentStraightStep(step)) {
      return selected;
    }

    if (selected.length >= 2) {
      const lockedStep = getStepBetweenCells(selected[0], selected[1]);

      if (lockedStep.rowStep !== step.rowStep || lockedStep.colStep !== step.colStep) {
        return selected;
      }
    }

    selected.push(nextCell);
    return selected;
  }

  function reconcileSelectionWithRelease(selection, releaseCell, options = {}) {
    if (!releaseCell) {
      return [...selection];
    }

    const existingIndex = selection.findIndex((cell) => isSameCell(cell, releaseCell));

    if (existingIndex >= 0) {
      return selection.slice(0, existingIndex + 1);
    }

    return extendSelection(selection, releaseCell, options);
  }

  function createElementCellResolver(options) {
    const {
      root,
      getCellById,
      cellSelector = "[data-cell-id]",
      documentRef = global.document
    } = options;

    if (typeof getCellById !== "function") {
      throw new Error("Element cell resolver requires getCellById");
    }

    return function getCellFromEvent(event) {
      const pointElement = (
        documentRef &&
        typeof documentRef.elementFromPoint === "function" &&
        typeof event.clientX === "number" &&
        typeof event.clientY === "number"
      )
        ? documentRef.elementFromPoint(event.clientX, event.clientY)
        : event.target;

      const cellElement = pointElement?.closest?.(cellSelector);

      if (!cellElement) {
        return null;
      }

      if (root && typeof root.contains === "function" && !root.contains(cellElement)) {
        return null;
      }

      return getCellById(cellElement.dataset.cellId);
    };
  }

  function createPointerDragController(options) {
    const {
      root,
      getCellFromEvent,
      maxSelectionLength = 3,
      onInteractionStart = () => {},
      onSelectionChange = () => {},
      onSelectionComplete = () => {},
      onSelectionCancel = () => {}
    } = options;

    if (!root) {
      throw new Error("Pointer drag controller requires root");
    }

    if (typeof getCellFromEvent !== "function") {
      throw new Error("Pointer drag controller requires getCellFromEvent");
    }

    let activePointerId = null;
    let selection = [];
    const previousTouchAction = root.style?.touchAction ?? "";
    const previousUserSelect = root.style?.userSelect ?? "";

    if (root.style) {
      root.style.touchAction = "none";
      root.style.userSelect = "none";
    }

    function emitChange() {
      onSelectionChange([...selection]);
    }

    function reset() {
      activePointerId = null;
      selection = [];
    }

    function handlePointerDown(event) {
      if (activePointerId !== null) {
        return;
      }

      const cell = getCellFromEvent(event);

      if (!cell) {
        return;
      }

      event.preventDefault();
      activePointerId = event.pointerId;
      selection = [cell];
      onInteractionStart(cell, event);

      if (event.currentTarget && typeof event.currentTarget.setPointerCapture === "function") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      emitChange();
    }

    function handlePointerMove(event) {
      if (activePointerId !== event.pointerId) {
        return;
      }

      const cell = getCellFromEvent(event);
      const nextSelection = extendSelection(selection, cell, { maxLength: maxSelectionLength });

      if (nextSelection.length !== selection.length || getCellKey(nextSelection.at(-1)) !== getCellKey(selection.at(-1))) {
        selection = nextSelection;
        emitChange();
      }
    }

    function handlePointerUp(event) {
      if (activePointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();

      selection = reconcileSelectionWithRelease(selection, getCellFromEvent(event), { maxLength: maxSelectionLength });
      const completedSelection = [...selection];
      reset();
      onSelectionComplete(completedSelection);
    }

    function handlePointerCancel(event) {
      if (activePointerId !== event.pointerId) {
        return;
      }

      reset();
      onSelectionCancel();
    }

    root.addEventListener("pointerdown", handlePointerDown);
    root.addEventListener("pointermove", handlePointerMove);
    root.addEventListener("pointerup", handlePointerUp);
    root.addEventListener("pointercancel", handlePointerCancel);
    root.addEventListener("lostpointercapture", handlePointerCancel);

    return {
      destroy() {
        const pointerIdToRelease = activePointerId;

        root.removeEventListener("pointerdown", handlePointerDown);
        root.removeEventListener("pointermove", handlePointerMove);
        root.removeEventListener("pointerup", handlePointerUp);
        root.removeEventListener("pointercancel", handlePointerCancel);
        root.removeEventListener("lostpointercapture", handlePointerCancel);

        if (pointerIdToRelease !== null && typeof root.releasePointerCapture === "function") {
          try {
            root.releasePointerCapture(pointerIdToRelease);
          } catch (_error) {
            // Pointer capture may already be gone; destroy should stay idempotent.
          }
        }

        if (root.style) {
          root.style.touchAction = previousTouchAction;
          root.style.userSelect = previousUserSelect;
        }

        reset();
      },
      getSelection() {
        return [...selection];
      }
    };
  }

  global.MathBlockPuzzleInput = Object.freeze({
    getCellKey,
    getStepBetweenCells,
    getDirectionFromStep,
    extendSelection,
    reconcileSelectionWithRelease,
    createElementCellResolver,
    createPointerDragController
  });
})(globalThis);
