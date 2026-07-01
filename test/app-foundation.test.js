import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../src/main.js";

const { renderInitialScreen } = globalThis.MathBlockPuzzleApp;

test("index.html loads the initial app assets", () => {
  const html = readFileSync("index.html", "utf8");

  assert.match(html, /id="app"/);
  assert.match(html, /\.\/src\/styles\.css/);
  assert.match(html, /\.\/src\/main\.js/);
  assert.doesNotMatch(html, /type="module"/);
});

test("main script renders the initial placeholder copy", () => {
  const source = readFileSync("src/main.js", "utf8");

  assert.match(source, /数字ブロックを縦か横/);
  assert.match(source, /board-placeholder/);
});

test("initial renderer mounts visible app markup into #game-root", () => {
  const root = { innerHTML: "" };

  renderInitialScreen(root);

  assert.match(root.innerHTML, /status-panel/);
  assert.match(root.innerHTML, /board-placeholder/);
  assert.match(root.innerHTML, /数字ブロックを縦か横/);
  assert.match(root.innerHTML, /data-cell-id="0:0"/);
});

test("initial renderer fails loudly when the mount point is missing", () => {
  assert.throws(() => renderInitialScreen(null), /Missing #game-root/);
});
