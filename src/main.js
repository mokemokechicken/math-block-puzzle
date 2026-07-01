(function initializeApp(global) {
  function createPreviewCells() {
    return Array.from({ length: 9 }, (_item, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const value = index + 1;

      return { row, col, value, id: `${row}:${col}` };
    });
  }

  function createInitialMarkup() {
    const cells = createPreviewCells();

    return `
      <section class="status-panel" aria-label="ゲーム状態">
        <div>
          <p class="status-label">準備中</p>
          <p class="status-text" data-status-text>数字ブロックを縦か横に 3 個なぞれます。</p>
        </div>
      </section>
      <section class="board-placeholder" aria-label="盤面プレビュー" data-board-preview>
        ${cells.map((cell) => `
          <button
            class="placeholder-block"
            type="button"
            data-cell-id="${cell.id}"
            data-row="${cell.row}"
            data-col="${cell.col}"
            data-value="${cell.value}"
          >${cell.value}</button>
        `).join("")}
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

  function setupInputPreview(root) {
    if (typeof root.querySelector !== "function") {
      return null;
    }

    const input = global.MathBlockPuzzleInput;
    const boardRoot = root.querySelector("[data-board-preview]");
    const statusText = root.querySelector("[data-status-text]");

    if (!input || !boardRoot) {
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

        if (statusText) {
          statusText.textContent = `${selection.length} 個選択中`;
        }
      },
      onSelectionComplete: (selection) => {
        markSelectedCells(boardRoot, []);

        if (statusText) {
          statusText.textContent = `${selection.length} 個のブロックを選びました`;
        }
      },
      onSelectionCancel: () => {
        markSelectedCells(boardRoot, []);

        if (statusText) {
          statusText.textContent = "選択をキャンセルしました";
        }
      }
    });
  }

  function renderInitialScreen(root) {
    if (!root) {
      throw new Error("Missing #game-root mount point");
    }

    root.innerHTML = createInitialMarkup();
    setupInputPreview(root);
  }

  global.MathBlockPuzzleApp = {
    createPreviewCells,
    createInitialMarkup,
    createCellMap,
    markSelectedCells,
    setupInputPreview,
    renderInitialScreen
  };

  if (global.document) {
    renderInitialScreen(global.document.querySelector("#game-root"));
  }
})(globalThis);
