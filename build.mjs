// Создаёт сайт в dist/, не изменяя исходники. Внешних зависимостей нет.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("./", import.meta.url);
const read = (file) => readFileSync(new URL(file, root), "utf8");
const versioned = (file) =>
  file +
  "?v=" +
  createHash("sha256")
    .update(readFileSync(new URL(file, root)))
    .digest("hex")
    .slice(0, 12);
const pages = [
  "index",
  "plan",
  "results",
  "compare",
  "inflation",
  "method",
  "settings",
];
const assets = new Set(["Onest.ttf", "Onest-LICENSE.txt"]);
mkdirSync(new URL("dist/", root), { recursive: true });

for (const name of pages) {
  const html = read(name + ".html").replace(
    /\b(href|src)="((?:css\/|js\/)[^"?]+|engine\.js|format\.js|chart\.js)(?:\?[^" ]*)?"/g,
    (_, attribute, file) => {
      assets.add(file);
      return `${attribute}="${versioned(file)}"`;
    },
  );
  writeFileSync(new URL(`dist/${name}.html`, root), html, "utf8");
}
for (const file of assets) {
  const destination = new URL("dist/" + file, root);
  mkdirSync(new URL("./", destination), { recursive: true });
  copyFileSync(new URL(file, root), destination);
}
writeFileSync(new URL("dist/.nojekyll", root), "");
console.log(
  `Built ${pages.length} pages and ${assets.size} assets in dist/. Sources unchanged.`,
);
