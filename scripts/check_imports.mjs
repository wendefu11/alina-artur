// Pseudo-loader: walks every src/**/*.js file, regex-extracts import specifiers,
// resolves each to a file path, and verifies the file exists. Catches typo
// imports that would fail in the browser.

import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "src");

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    const st = await stat(p);
    if (st.isDirectory()) out.push(...await walk(p));
    else if (name.endsWith(".js")) out.push(p);
  }
  return out;
}

const files = await walk(SRC);
let errs = 0;
const importRe = /^\s*import\s+(?:[\w*{},\s]+\s+from\s+)?["']([^"']+)["']\s*;?/gm;
const dynamicRe = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

for (const file of files) {
  const code = await readFile(file, "utf8");
  const specs = [];
  let m;
  while ((m = importRe.exec(code))) specs.push(m[1]);
  while ((m = dynamicRe.exec(code))) specs.push(m[1]);
  for (const spec of specs) {
    if (/^https?:/.test(spec)) continue;       // remote ESM (peerjs)
    if (!spec.startsWith(".") && !spec.startsWith("/")) continue; // bare
    let target = resolve(dirname(file), spec);
    try { await stat(target); }
    catch {
      // try adding .js
      try { await stat(target + ".js"); continue; } catch {}
      // try index.js
      try { await stat(join(target, "index.js")); continue; } catch {}
      console.error(`MISSING in ${relative(ROOT, file)} → ${spec}`);
      errs++;
    }
  }
}
console.log(errs === 0 ? `OK · ${files.length} files checked` : `FAIL · ${errs} broken imports`);
process.exit(errs === 0 ? 0 : 1);
