import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const lintExtensions = new Set([".css", ".html", ".js", ".json", ".md"]);
const ignoredDirectories = new Set([".git", "node_modules"]);

function collectFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) {
      continue;
    }

    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...collectFiles(path));
    } else if (lintExtensions.has(path.slice(path.lastIndexOf(".")))) {
      files.push(path);
    }
  }

  return files;
}

const files = collectFiles(process.cwd());

const failures = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");

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
