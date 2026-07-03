import test from "node:test";
import assert from "node:assert/strict";
import "../src/input.js";

const {
  createElementCellResolver,
  createPointerDragController,
  extendSelection,
  getDirectionFromStep,
  reconcileSelectionWithRelease,
  getStepBetweenCells
} = globalThis.MathBlockPuzzleInput;

function cell(row, col) {
  return { id: `${row}:${col}`, row, col, value: row * 10 + col };
}

function createFakeRoot() {
  const listeners = new Map();

  return {
    style: {},
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    },
    dispatch(type, event) {
      listeners.get(type)?.({
        currentTarget: this,
        pointerId: 1,
        preventDefault() {},
        ...event
      });
    },
    listenerCount() {
      return listeners.size;
    },
    setPointerCapture() {},
    releasePointerCapture(pointerId) {
      this.dispatch("lostpointercapture", { pointerId });
    }
  };
}

test("direction helpers map adjacent steps to drag directions", () => {
  assert.equal(getDirectionFromStep({ rowStep: 0, colStep: 1 }), "left-to-right");
  assert.equal(getDirectionFromStep({ rowStep: 0, colStep: -1 }), "right-to-left");
  assert.equal(getDirectionFromStep({ rowStep: 1, colStep: 0 }), "top-to-bottom");
  assert.equal(getDirectionFromStep({ rowStep: -1, colStep: 0 }), "bottom-to-top");
  assert.equal(getDirectionFromStep({ rowStep: 1, colStep: 1 }), null);
  assert.deepEqual(getStepBetweenCells(cell(2, 1), cell(2, 0)), { rowStep: 0, colStep: -1 });
});

test("extendSelection accepts straight adjacent cells up to max length", () => {
  const selection = [cell(0, 0)];
  const two = extendSelection(selection, cell(0, 1), { maxLength: 3 });
  const three = extendSelection(two, cell(0, 2), { maxLength: 3 });
  const capped = extendSelection(three, cell(0, 3), { maxLength: 3 });

  assert.deepEqual(two.map((item) => item.id), ["0:0", "0:1"]);
  assert.deepEqual(three.map((item) => item.id), ["0:0", "0:1", "0:2"]);
  assert.deepEqual(capped.map((item) => item.id), ["0:0", "0:1", "0:2"]);
});

test("extendSelection accepts one L-shaped turn at the third cell", () => {
  const selection = [cell(0, 0)];
  const two = extendSelection(selection, cell(0, 1), { maxLength: 3 });
  const three = extendSelection(two, cell(1, 1), { maxLength: 3 });

  assert.deepEqual(three.map((item) => item.id), ["0:0", "0:1", "1:1"]);
});

test("extendSelection ignores diagonal and skipped movement", () => {
  assert.deepEqual(
    extendSelection([cell(0, 0)], cell(1, 1), { maxLength: 3 }).map((item) => item.id),
    ["0:0"]
  );
  assert.deepEqual(
    extendSelection([cell(0, 0)], cell(0, 2), { maxLength: 3 }).map((item) => item.id),
    ["0:0"]
  );
});

test("extendSelection supports backing up to the previous cell", () => {
  const selection = [cell(0, 0), cell(0, 1), cell(0, 2)];
  const backedUp = extendSelection(selection, cell(0, 1), { maxLength: 3 });

  assert.deepEqual(backedUp.map((item) => item.id), ["0:0", "0:1"]);
});

test("release reconciliation trims to any existing selected cell", () => {
  const selection = [cell(0, 0), cell(0, 1), cell(0, 2)];

  assert.deepEqual(
    reconcileSelectionWithRelease(selection, cell(0, 0), { maxLength: 3 }).map((item) => item.id),
    ["0:0"]
  );
  assert.deepEqual(
    reconcileSelectionWithRelease(selection, cell(0, 1), { maxLength: 3 }).map((item) => item.id),
    ["0:0", "0:1"]
  );
});

test("element cell resolver uses coordinates so pointer capture retargeting is safe", () => {
  const resolvedCell = cell(1, 2);
  const cellElement = {
    dataset: { cellId: resolvedCell.id },
    closest: () => cellElement
  };
  const root = {
    contains: (element) => element === cellElement
  };
  const documentRef = {
    elementFromPoint: (x, y) => {
      assert.equal(x, 120);
      assert.equal(y, 80);
      return cellElement;
    }
  };
  const resolver = createElementCellResolver({
    root,
    documentRef,
    getCellById: (cellId) => (cellId === resolvedCell.id ? resolvedCell : null)
  });

  assert.equal(resolver({ clientX: 120, clientY: 80, target: root }), resolvedCell);
});

test("element cell resolver ignores cells outside the root", () => {
  const cellElement = {
    dataset: { cellId: "0:0" },
    closest: () => cellElement
  };
  const resolver = createElementCellResolver({
    root: { contains: () => false },
    documentRef: { elementFromPoint: () => cellElement },
    getCellById: () => cell(0, 0)
  });

  assert.equal(resolver({ clientX: 1, clientY: 1 }), null);
});

test("pointer controller emits selection changes and completion", () => {
  const root = createFakeRoot();
  const changes = [];
  let completed = null;
  let currentCell = null;
  const controller = createPointerDragController({
    root,
    getCellFromEvent: () => currentCell,
    onSelectionChange: (selection) => changes.push(selection.map((item) => item.id)),
    onSelectionComplete: (selection) => {
      completed = selection.map((item) => item.id);
    }
  });

  currentCell = cell(0, 0);
  root.dispatch("pointerdown");
  currentCell = cell(0, 1);
  root.dispatch("pointermove");
  currentCell = cell(0, 2);
  root.dispatch("pointermove");
  root.dispatch("pointerup");

  assert.deepEqual(changes, [["0:0"], ["0:0", "0:1"], ["0:0", "0:1", "0:2"]]);
  assert.deepEqual(completed, ["0:0", "0:1", "0:2"]);
  assert.deepEqual(controller.getSelection(), []);
  controller.destroy();
  assert.equal(root.listenerCount(), 0);
});

test("pointer controller emits L-shaped selection changes and completion", () => {
  const root = createFakeRoot();
  const changes = [];
  let completed = null;
  let currentCell = null;
  const controller = createPointerDragController({
    root,
    getCellFromEvent: () => currentCell,
    onSelectionChange: (selection) => changes.push(selection.map((item) => item.id)),
    onSelectionComplete: (selection) => {
      completed = selection.map((item) => item.id);
    }
  });

  currentCell = cell(0, 0);
  root.dispatch("pointerdown");
  currentCell = cell(0, 1);
  root.dispatch("pointermove");
  currentCell = cell(1, 1);
  root.dispatch("pointermove");
  root.dispatch("pointerup");

  assert.deepEqual(changes, [["0:0"], ["0:0", "0:1"], ["0:0", "0:1", "1:1"]]);
  assert.deepEqual(completed, ["0:0", "0:1", "1:1"]);
  controller.destroy();
});

test("pointer controller emits interaction start on accepted pointerdown", () => {
  const root = createFakeRoot();
  const starts = [];
  let currentCell = null;
  const controller = createPointerDragController({
    root,
    getCellFromEvent: () => currentCell,
    onInteractionStart: (selectedCell, event) => {
      starts.push({ id: selectedCell.id, pointerId: event.pointerId });
    }
  });

  currentCell = null;
  root.dispatch("pointerdown", { pointerId: 1 });
  currentCell = cell(0, 0);
  root.dispatch("pointerdown", { pointerId: 2 });
  currentCell = cell(0, 1);
  root.dispatch("pointerdown", { pointerId: 3 });

  assert.deepEqual(starts, [{ id: "0:0", pointerId: 2 }]);

  controller.destroy();
});

test("pointer controller includes the release cell when the last move was skipped", () => {
  const root = createFakeRoot();
  let completed = null;
  let currentCell = null;
  createPointerDragController({
    root,
    getCellFromEvent: () => currentCell,
    onSelectionComplete: (selection) => {
      completed = selection.map((item) => item.id);
    }
  });

  currentCell = cell(0, 0);
  root.dispatch("pointerdown", { pointerId: 1 });
  currentCell = cell(0, 1);
  root.dispatch("pointermove", { pointerId: 1 });
  currentCell = cell(0, 2);
  root.dispatch("pointerup", { pointerId: 1 });

  assert.deepEqual(completed, ["0:0", "0:1", "0:2"]);
});

test("pointer controller includes an L-shaped release cell when the last move was skipped", () => {
  const root = createFakeRoot();
  let completed = null;
  let currentCell = null;
  createPointerDragController({
    root,
    getCellFromEvent: () => currentCell,
    onSelectionComplete: (selection) => {
      completed = selection.map((item) => item.id);
    }
  });

  currentCell = cell(0, 0);
  root.dispatch("pointerdown", { pointerId: 1 });
  currentCell = cell(0, 1);
  root.dispatch("pointermove", { pointerId: 1 });
  currentCell = cell(1, 1);
  root.dispatch("pointerup", { pointerId: 1 });

  assert.deepEqual(completed, ["0:0", "0:1", "1:1"]);
});

test("pointer controller reconciles skipped backtracking on release", () => {
  const root = createFakeRoot();
  let completed = null;
  let currentCell = null;
  createPointerDragController({
    root,
    getCellFromEvent: () => currentCell,
    onSelectionComplete: (selection) => {
      completed = selection.map((item) => item.id);
    }
  });

  currentCell = cell(0, 0);
  root.dispatch("pointerdown", { pointerId: 1 });
  currentCell = cell(0, 1);
  root.dispatch("pointermove", { pointerId: 1 });
  currentCell = cell(0, 2);
  root.dispatch("pointermove", { pointerId: 1 });
  currentCell = cell(0, 0);
  root.dispatch("pointerup", { pointerId: 1 });

  assert.deepEqual(completed, ["0:0"]);
});

test("pointer controller ignores a second pointer while dragging", () => {
  const root = createFakeRoot();
  const changes = [];
  let currentCell = null;
  const controller = createPointerDragController({
    root,
    getCellFromEvent: () => currentCell,
    onSelectionChange: (selection) => changes.push(selection.map((item) => item.id))
  });

  currentCell = cell(0, 0);
  root.dispatch("pointerdown", { pointerId: 1 });
  currentCell = cell(2, 2);
  root.dispatch("pointerdown", { pointerId: 2 });
  currentCell = cell(0, 1);
  root.dispatch("pointermove", { pointerId: 1 });

  assert.deepEqual(changes, [["0:0"], ["0:0", "0:1"]]);
  assert.deepEqual(controller.getSelection().map((item) => item.id), ["0:0", "0:1"]);
  controller.destroy();
});

test("pointer controller resets on cancel and restores touch styles on destroy", () => {
  const root = createFakeRoot();
  root.style.touchAction = "pan-y";
  root.style.userSelect = "text";
  let cancelled = false;
  let currentCell = null;
  const controller = createPointerDragController({
    root,
    getCellFromEvent: () => currentCell,
    onSelectionCancel: () => {
      cancelled = true;
    }
  });

  assert.equal(root.style.touchAction, "none");
  assert.equal(root.style.userSelect, "none");

  currentCell = cell(0, 0);
  root.dispatch("pointerdown", { pointerId: 1 });
  root.dispatch("pointercancel", { pointerId: 1 });

  assert.equal(cancelled, true);
  assert.deepEqual(controller.getSelection(), []);

  controller.destroy();
  assert.equal(root.style.touchAction, "pan-y");
  assert.equal(root.style.userSelect, "text");
});

test("pointer controller resets when pointer capture is lost", () => {
  const root = createFakeRoot();
  const changes = [];
  let cancelled = false;
  let currentCell = null;
  const controller = createPointerDragController({
    root,
    getCellFromEvent: () => currentCell,
    onSelectionChange: (selection) => changes.push(selection.map((item) => item.id)),
    onSelectionCancel: () => {
      cancelled = true;
    }
  });

  currentCell = cell(0, 0);
  root.dispatch("pointerdown", { pointerId: 1 });
  root.dispatch("lostpointercapture", { pointerId: 1 });
  currentCell = cell(1, 0);
  root.dispatch("pointerdown", { pointerId: 2 });

  assert.equal(cancelled, true);
  assert.deepEqual(changes, [["0:0"], ["1:0"]]);
  assert.deepEqual(controller.getSelection().map((item) => item.id), ["1:0"]);
  controller.destroy();
});

test("pointer controller destroy does not emit cancel while releasing capture", () => {
  const root = createFakeRoot();
  let cancelCount = 0;
  let currentCell = null;
  const controller = createPointerDragController({
    root,
    getCellFromEvent: () => currentCell,
    onSelectionCancel: () => {
      cancelCount += 1;
    }
  });

  currentCell = cell(0, 0);
  root.dispatch("pointerdown", { pointerId: 1 });
  controller.destroy();

  assert.equal(cancelCount, 0);
  assert.equal(root.listenerCount(), 0);
});
