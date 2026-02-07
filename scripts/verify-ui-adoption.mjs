import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_DIR = "src";
const UI_DIR = join(SRC_DIR, "components", "ui");

const walk = (dir) => {
  const result = [];
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const st = statSync(full);
    if (st.isDirectory()) {
      result.push(...walk(full));
      continue;
    }
    result.push(full);
  }
  return result;
};

const allSrcFiles = walk(SRC_DIR).filter((file) => /\.(ts|tsx)$/.test(file));
const uiFiles = new Set(
  walk(UI_DIR)
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .map((file) => file.split("/").at(-1).replace(/\.(ts|tsx)$/, "")),
);

const directRadixOutsideUi = [];
const namespaceRadixImports = [];
const missingUiImports = [];

for (const file of allSrcFiles) {
  const rel = relative(process.cwd(), file);
  const content = readFileSync(file, "utf8");

  if (!file.includes("/components/ui/")) {
    if (/from\s+["']@radix-ui\//.test(content)) {
      directRadixOutsideUi.push(rel);
    }
  }

  if (/import\s+\*\s+as\s+\w+\s+from\s+["']@radix-ui\//.test(content)) {
    namespaceRadixImports.push(rel);
  }

  const regex = /from\s+["']@\/components\/ui\/([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const importedUi = match[1];
    if (!uiFiles.has(importedUi)) {
      missingUiImports.push(`${rel} -> @/components/ui/${importedUi}`);
    }
  }
}

if (directRadixOutsideUi.length || namespaceRadixImports.length || missingUiImports.length) {
  if (directRadixOutsideUi.length) {
    console.error("\n[verify-ui-adoption] Direct @radix-ui imports outside src/components/ui:");
    for (const file of directRadixOutsideUi) console.error(` - ${file}`);
  }

  if (namespaceRadixImports.length) {
    console.error("\n[verify-ui-adoption] Namespace Radix imports found:");
    for (const file of namespaceRadixImports) console.error(` - ${file}`);
  }

  if (missingUiImports.length) {
    console.error("\n[verify-ui-adoption] Invalid @/components/ui/* imports:");
    for (const issue of missingUiImports) console.error(` - ${issue}`);
  }

  process.exit(1);
}

console.log("[verify-ui-adoption] OK: pages/components are aligned with shadcn ui wrappers.");
