import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../src/config.js";
import "../src/rules.js";
import "../src/board.js";
import "../src/input.js";
import "../src/hints.js";
import "../src/main.js";

const { renderInitialScreen } = globalThis.MathBlockPuzzleApp;

test("index.html loads the initial app assets", () => {
  const html = readFileSync("index.html", "utf8");

  assert.match(html, /id="app"/);
  assert.match(html, /\.\/src\/styles\.css/);
  assert.match(html, /\.\/src\/hints\.js/);
  assert.match(html, /\.\/src\/audio\.js/);
  assert.match(html, /\.\/src\/main\.js/);
  assert.match(html, /viewport-fit=cover/);
  assert.doesNotMatch(html, /type="module"/);
});

test("main script renders the initial placeholder copy", () => {
  const source = readFileSync("src/main.js", "utf8");

  assert.match(source, /縦か横に 3 個/);
  assert.match(source, /data-game-board/);
});

test("dynamic message regions reserve multiline height to avoid layout shift", () => {
  const css = readFileSync("src/styles.css", "utf8");

  assert.match(css, /\.status-text\s*{[^}]*min-height: 3\.1em;/s);
  assert.match(css, /\.equation-preview\s*{[^}]*min-height: 5\.15rem;/s);
});

test("mobile layout reserves bottom space for browser controls", () => {
  const css = readFileSync("src/styles.css", "utf8");

  assert.match(css, /--mobile-browser-controls-space: 96px;/);
  assert.match(css, /padding: 18px 18px calc\(var\(--mobile-browser-controls-space\) \+ env\(safe-area-inset-bottom\)\);/);
  assert.match(css, /min-height: 100svh;/);
});

test("mobile layout lets the progress meter use the full toolbar width", () => {
  const css = readFileSync("src/styles.css", "utf8");

  assert.match(css, /\.progress-meter\s*{[^}]*min-width: 170px;/s);
  assert.match(css, /@media \(max-width: 520px\)\s*{[\s\S]*\.game-counters,\s*\.progress-meter\s*{[^}]*width: 100%;/s);
});

test("initial renderer mounts visible app markup into #game-root", () => {
  const root = { innerHTML: "" };

  renderInitialScreen(root);

  assert.match(root.innerHTML, /game-toolbar/);
  assert.match(root.innerHTML, /game-board/);
  assert.match(root.innerHTML, /縦か横に 3 個/);
  assert.match(root.innerHTML, /data-cell-id="0:0"/);
});

test("initial renderer fails loudly when the mount point is missing", () => {
  assert.throws(() => renderInitialScreen(null), /Missing #game-root/);
});
