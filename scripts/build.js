import { accessSync, constants, readFileSync } from "node:fs";
import { join } from "node:path";

const requiredFiles = [
  "index.html",
  "src/main.js",
  "src/styles.css",
  "assets"
];

for (const file of requiredFiles) {
  accessSync(join(process.cwd(), file), constants.R_OK);
}

const html = readFileSync(join(process.cwd(), "index.html"), "utf8");

for (const asset of ["./src/styles.css", "./src/config.js", "./src/main.js"]) {
  if (!html.includes(asset)) {
    throw new Error(`index.html does not reference ${asset}`);
  }
}

if (!html.includes('id="game-root"')) {
  throw new Error("index.html does not define #game-root");
}

console.log("build ok: static assets are ready for GitHub Pages");
