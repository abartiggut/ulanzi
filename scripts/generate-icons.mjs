import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { taskDisplaySvg } from "../integration/com.ulanzi.codexmicro.ulanziPlugin/plugin/task-display.js";

// The Ulanzi D200 keypad uses 196 px artwork. Keep the icon source here so
// all states share the same geometry, contrast and text-safe lower area.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const icons = resolve(root, "integration/com.ulanzi.codexmicro.ulanziPlugin/assets/icons");
const mark = readFileSync(resolve(icons, "codex-mark.png")).toString("base64");
const WHITE = "#eef6fb";
const BLUE = "#61b3ff";
const GREEN = "#53dfab";
const AMBER = "#ffc66a";
const RED = "#ff7887";
const TEAL = "#73dfd5";

function tile(body, accent, { brand = false } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="196" height="196" viewBox="0 0 196 196">
  <defs>
    <linearGradient id="surface" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#1b2934"/><stop offset=".55" stop-color="#111b24"/><stop offset="1" stop-color="#0c131b"/></linearGradient>
    <radialGradient id="wash" cx=".5" cy=".29" r=".63"><stop stop-color="${accent}" stop-opacity=".20"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <linearGradient id="top" x1="0" x2="1"><stop stop-color="${accent}" stop-opacity=".22"/><stop offset=".5" stop-color="${accent}"/><stop offset="1" stop-color="${accent}" stop-opacity=".22"/></linearGradient>
  </defs>
  <rect width="196" height="196" rx="28" fill="#090f15"/>
  <rect x="6" y="6" width="184" height="184" rx="23" fill="url(#surface)" stroke="#324350" stroke-width="1.5"/>
  <rect x="8" y="8" width="180" height="180" rx="21" fill="url(#wash)"/>
  <path d="M32 20H164" stroke="url(#top)" stroke-width="3" stroke-linecap="round"/>
  <path d="M31 164H165" stroke="#d4e5ed" stroke-opacity=".08" stroke-width="1.5" stroke-linecap="round"/>
  ${brand ? `<circle cx="98" cy="91" r="59" fill="${accent}" fill-opacity=".10" stroke="${accent}" stroke-opacity=".45" stroke-width="2"/>` : ""}
  ${body}
  </svg>`;
}

const line = (body, color = WHITE, width = 8) => `<g fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;

const artwork = {
  "plugin.png": tile(`<image x="49" y="42" width="98" height="98" href="data:image/png;base64,${mark}" xlink:href="data:image/png;base64,${mark}"/>`, TEAL, { brand: true }),
  "task-idle.png": taskDisplaySvg("Codex Aufgabe", "idle", "de"),
  "task-working.png": taskDisplaySvg("Codex arbeitet", "working", "de"),
  "task-complete.png": taskDisplaySvg("Aufgabe fertig", "complete", "de"),
  "task-attention.png": taskDisplaySvg("Eingabe nötig", "attention", "de"),
  "task-error.png": taskDisplaySvg("Fehler prüfen", "error", "de"),
  "fast.png": tile(`<path d="m103 40-37 52h28l-5 47 43-61h-29z" fill="${AMBER}" fill-opacity=".16" stroke="${AMBER}" stroke-width="7" stroke-linejoin="round"/>`, AMBER),
  "pin.png": tile(`${line('<path d="M78 46h40l-7 31 16 17v7H69v-7l16-17z"/>', WHITE, 7)}${line('<path d="M98 102v36"/>', TEAL, 8)}`, TEAL),
  "new.png": tile(`${line('<path d="M49 55h77a17 17 0 0 1 17 17v44a17 17 0 0 1-17 17H84l-20 15v-15H49a17 17 0 0 1-17-17V72a17 17 0 0 1 17-17z"/>', WHITE, 7)}<circle cx="130" cy="56" r="24" fill="#152631" stroke="${GREEN}" stroke-width="5"/>${line('<path d="M130 44v24m-12-12h24"/>', GREEN, 6)}`, GREEN),
  "fork.png": tile(`${line('<path d="M66 51v44a30 30 0 0 0 30 30h20M66 83a30 30 0 0 1 30-30h20"/>', WHITE, 8)}<circle cx="66" cy="47" r="11" fill="${BLUE}"/><circle cx="125" cy="53" r="11" fill="${WHITE}"/><circle cx="125" cy="125" r="11" fill="${WHITE}"/>`, BLUE),
  "steer.png": tile(`${line('<path d="M49 64h61a26 26 0 0 1 26 26v22m0 0-16-16m16 16 16-16M49 103h30"/>', WHITE, 8)}<circle cx="51" cy="103" r="7" fill="${BLUE}"/>`, BLUE),
  "mic.png": tile(`<rect x="82" y="42" width="32" height="62" rx="16" fill="${RED}" fill-opacity=".17" stroke="${WHITE}" stroke-width="7"/>${line('<path d="M63 87a35 35 0 0 0 70 0M98 122v20m-22 0h44"/>', WHITE, 7)}<circle cx="144" cy="46" r="8" fill="${RED}"/>`, RED),
  "submit.png": tile(`<circle cx="98" cy="89" r="47" fill="${GREEN}" fill-opacity=".10" stroke="${GREEN}" stroke-width="5"/>${line('<path d="M64 91h60m-26-26 26 26-26 26"/>', WHITE, 8)}`, GREEN),
  "permissions.png": tile(`${line('<path d="M98 38 143 55v34c0 29-18 48-45 62-27-14-45-33-45-62V55z"/>', WHITE, 7)}${line('<path d="m77 94 14 14 27-30"/>', GREEN, 8)}`, GREEN),
  "model.png": tile(`${line('<rect x="51" y="48" width="94" height="86" rx="16"/><path d="M73 39v9m25-9v9m25-9v9M73 134v12m25-12v12m25-12v12M41 72h10m-10 24h10m-10 24h10m94-48h10m-10 24h10m-10 24h10"/>', WHITE, 6)}<circle cx="98" cy="91" r="18" fill="${TEAL}" fill-opacity=".18" stroke="${TEAL}" stroke-width="5"/>`, TEAL),
  "context.png": tile(`${line('<circle cx="98" cy="87" r="49"/><circle cx="98" cy="87" r="18"/><path d="M116 69v28c0 11 17 11 17 0V87"/>', WHITE, 7)}`, TEAL),
  "usage-base.png": tile(`<circle cx="98" cy="86" r="53" fill="#0a141a" stroke="#334954" stroke-width="2"/>`, TEAL),
  "usage.png": tile(`<circle cx="98" cy="86" r="53" fill="#0a141a" stroke="#314650" stroke-width="12"/><path d="M98 33a53 53 0 1 1-52 62" fill="none" stroke="${TEAL}" stroke-width="12" stroke-linecap="round"/>${line('<path d="m79 91 15 15 27-32"/>', WHITE, 7)}`, TEAL)
};

mkdirSync(icons, { recursive: true });
for (const [name, svg] of Object.entries(artwork)) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 196 } }).render().asPng();
  writeFileSync(resolve(icons, name), png);
  if (name === "model.png" || name === "context.png") {
    writeFileSync(resolve(icons, name.replace(/\.png$/, ".svg")), `${svg.replace(/^[ \t]+$/gm, "")}\n`);
  }
}
const previewOrder = [
  "plugin.png", "task-idle.png", "task-working.png", "task-complete.png", "task-attention.png", "task-error.png",
  "fast.png", "pin.png", "new.png", "fork.png", "steer.png", "mic.png",
  "submit.png", "permissions.png", "model.png", "context.png", "usage.png", "usage-base.png"
];
const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="1140" height="648" viewBox="0 0 1140 648">
  <rect width="1140" height="648" fill="#091017"/>
  <text x="34" y="36" fill="#eef6fb" font-family="Arial,sans-serif" font-size="22" font-weight="700">Codex Micro · D200 icons</text>
  ${previewOrder.map((name, index) => {
    const x = 30 + (index % 6) * 185;
    const y = 58 + Math.floor(index / 6) * 196;
    const png = readFileSync(resolve(icons, name)).toString("base64");
    return `<image x="${x}" y="${y}" width="154" height="154" href="data:image/png;base64,${png}"/><text x="${x + 77}" y="${y + 175}" fill="#a9bbc7" font-family="Arial,sans-serif" font-size="13" text-anchor="middle">${name.replace(/\.png$/, "")}</text>`;
  }).join("")}
</svg>`;
const previewPath = resolve(root, "docs/icon-set-preview.png");
mkdirSync(dirname(previewPath), { recursive: true });
writeFileSync(previewPath, new Resvg(preview).render().asPng());
console.log(`Generated ${Object.keys(artwork).length} D200 icons at 196 × 196 px`);
