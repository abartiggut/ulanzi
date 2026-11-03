import test from "node:test";
import assert from "node:assert/strict";
import { Resvg } from "@resvg/resvg-js";
import { taskDisplaySvg } from "../integration/com.ulanzi.codexmicro.ulanziPlugin/plugin/task-display.js";

test("task title and status render legibly inside a key image", () => {
  const svg = taskDisplaySvg("Ulanzi & Codex <Bridge> mit sehr langem Titel", "thinking", "de_DE");
  assert.match(svg, /Ulanzi &amp;/);
  assert.doesNotMatch(svg, /<Bridge>/);
  assert.match(svg, /ARBEITET/);
  assert.ok((svg.match(/<text x="27" y=/g) || []).length <= 3);
  const png = new Resvg(svg).render().asPng();
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
});
