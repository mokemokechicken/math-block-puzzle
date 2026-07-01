(function initializeApp(global) {
  function createInitialMarkup() {
    return `
      <section class="status-panel" aria-label="ゲーム状態">
        <div>
          <p class="status-label">準備中</p>
          <p class="status-text">数字ブロックの盤面をここに表示します。</p>
        </div>
      </section>
      <section class="board-placeholder" aria-label="盤面プレビュー">
        ${Array.from({ length: 9 }, (_, index) => `<div class="placeholder-block">${index + 1}</div>`).join("")}
      </section>
    `;
  }

  function renderInitialScreen(root) {
    if (!root) {
      throw new Error("Missing #game-root mount point");
    }

    root.innerHTML = createInitialMarkup();
  }

  global.MathBlockPuzzleApp = {
    createInitialMarkup,
    renderInitialScreen
  };

  if (global.document) {
    renderInitialScreen(global.document.querySelector("#game-root"));
  }
})(globalThis);
