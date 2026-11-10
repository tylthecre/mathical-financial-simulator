import { mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const base = new URL(".", import.meta.url);
const pages = [
  "index",
  "plan",
  "results",
  "compare",
  "inflation",
  "method",
  "settings",
];
const read = (file) => readFile(new URL(file, base), "utf8");
const font = await readFile(new URL("Onest.ttf", base), "base64");
const css = (await read("css/site.css")).replace(
  'url("../Onest.ttf")',
  () => "url(data:font/ttf;base64," + font + ")",
);

await mkdir(new URL("dist/", base), { recursive: true });
for (const page of pages) {
  const html = await read(page + ".html");
  const moduleTag = /<script type="module" src="([^"]+)"><\/script>/;
  const [, entry] = html.match(moduleTag);
  const bundle = await build({
    entryPoints: [entry],
    bundle: true,
    format: "iife",
    write: false,
    target: "es2022",
  });
  const standalone = html
    .replace(
      /<link rel="stylesheet" href="css\/site\.css"\s*\/?>/,
      () => "<style>" + css + "</style>",
    )
    .replace(
      moduleTag,
      () => "<script>" + bundle.outputFiles[0].text + "</script>",
    );
  await writeFile(new URL("dist/" + page + ".html", base), standalone);
}
