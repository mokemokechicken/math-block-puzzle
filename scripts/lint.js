import { readFileSync } from "node:fs";
import { join } from "node:path";

const files = [
  "index.html",
  "src/main.js",
  "src/styles.css",
  "scripts/lint.js",
  "scripts/build.js",
  "test/app-foundation.test.js"
];

const failures = [];

for (const file of files) {
  const source = readFileSync(join(process.cwd(), file), "utf8");

  if (source.includes("\t")) {
    failures.push(`${file}: タブ文字を使わずスペースで整形してください`);
  }

  if (/[ \t]+$/mu.test(source)) {
    failures.push(`${file}: 行末空白があります`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`lint ok (${files.length} files)`);
