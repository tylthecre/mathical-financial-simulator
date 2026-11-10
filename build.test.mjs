import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

function fixture(t) {
  const source = fileURLToPath(new URL("./", import.meta.url));
  const parent = realpathSync(tmpdir());
  const directory = mkdtempSync(join(parent, "mathical-build-"));
  const files = readdirSync(source).filter(
    (name) =>
      /\.(html|js|ttf)$/.test(name) ||
      ["build.mjs", "Onest-LICENSE.txt", "js", "css"].includes(name),
  );
  for (const file of files)
    cpSync(join(source, file), join(directory, file), { recursive: true });
  t.after(() => {
    assert.equal(dirname(realpathSync(directory)), parent);
    rmSync(directory, { recursive: true, force: true });
  });
  return directory;
}

test("Сборка не меняет исходники и даёт одинаковый результат при повторном запуске", (t) => {
  const root = fixture(t),
    names = readdirSync(root).filter((name) => name.endsWith(".html"));
  const before = names.map((name) => readFileSync(join(root, name), "utf8"));
  execFileSync(process.execPath, ["build.mjs"], { cwd: root });
  const output = names.map((name) =>
    readFileSync(join(root, "dist", name), "utf8"),
  );
  assert.deepEqual(
    names.map((name) => readFileSync(join(root, name), "utf8")),
    before,
  );
  execFileSync(process.execPath, ["build.mjs"], { cwd: root });
  assert.deepEqual(
    names.map((name) => readFileSync(join(root, "dist", name), "utf8")),
    output,
  );
});

test("Все ресурсы собранных страниц существуют, а хеши соответствуют их содержимому", (t) => {
  const root = fixture(t);
  execFileSync(process.execPath, ["build.mjs"], { cwd: root });
  const names = readdirSync(root).filter((name) => name.endsWith(".html"));
  assert.equal(names.length, 7);
  for (const name of names) {
    const html = readFileSync(join(root, "dist", name), "utf8");
    const links = [...html.matchAll(/(?:src|href)="([^"?]+)\?v=([a-f0-9]+)"/g)];
    assert.ok(links.length >= 4, name);
    for (const [, file, hash] of links) {
      const bytes = readFileSync(join(root, "dist", file));
      assert.equal(
        createHash("sha256").update(bytes).digest("hex").slice(0, 12),
        hash,
      );
    }
  }
  assert.ok(readFileSync(join(root, "dist", "Onest.ttf")).length > 0);
  assert.equal(readFileSync(join(root, "dist", ".nojekyll"), "utf8"), "");
});
