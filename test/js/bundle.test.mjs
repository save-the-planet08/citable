import test from "node:test";
import assert from "node:assert/strict";
import { buildBundle, verifyBundle, BUNDLE_VERSION } from "../../lib/citable/bundle.mjs";
import { buildTree } from "../../lib/citable/tree.mjs";
import { segment } from "../../lib/citable/segment.mjs";

const TEXT = [
  "Wurden die Zahlen manipuliert? Diese Frage stellt sich seit Monaten.",
  "Der Vorstand weist die Vorwürfe zurück.",
  "Im vergangenen Quartal stieg der Umsatz um vier Prozent.",
  "Eine Prüfung ist für Oktober angekündigt.",
].join("\n\n");

const rootOf = (text) => buildTree(segment(text)).root;

test("without vectors: segments carry no vector field", () => {
  const bundle = buildBundle(TEXT);
  assert.equal(bundle.version, BUNDLE_VERSION);
  assert.equal(bundle.model, null);
  assert.equal(bundle.dim, 0);
  assert.equal(bundle.segments.length, 4);
  assert.deepEqual(bundle.segments[0], { index: 0, text: segment(TEXT)[0] });
});

test("with vectors: model is kept and dim derived", () => {
  const vectors = segment(TEXT).map((_, i) => [i, i + 1, i + 2]);
  const bundle = buildBundle(TEXT, vectors, "multilingual-e5-small");
  assert.equal(bundle.model, "multilingual-e5-small");
  assert.equal(bundle.dim, 3);
  assert.deepEqual(bundle.segments[2].vector, [2, 3, 4]);
});

test("vectors without a model are refused — a percentage would not be reproducible", () => {
  assert.throws(() => buildBundle(TEXT, [[1], [2], [3], [4]]), /model identifier/);
});

test("refuses a vector count that does not match the segments", () => {
  assert.throws(() => buildBundle(TEXT, [[1], [2]], "m"), /2 vectors for 4 segments/);
});

test("refuses vectors of differing length", () => {
  assert.throws(() => buildBundle(TEXT, [[1], [2, 3], [4], [5]], "m"), /differing length/);
});

test("refuses a text without segments", () => {
  assert.throws(() => buildBundle("   \n\n  "), /no segments/);
});

test("verifies against the root of its own tree", () => {
  assert.ok(verifyBundle(buildBundle(TEXT), rootOf(TEXT)));
});

test("verifies regardless of the array order — the index field is what counts", () => {
  const bundle = buildBundle(TEXT);
  bundle.segments.reverse();
  assert.ok(verifyBundle(bundle, rootOf(TEXT)));
});

test("a changed character breaks the anchor", () => {
  const bundle = buildBundle(TEXT);
  bundle.segments[2].text = bundle.segments[2].text.replace("vier", "vierzig");
  assert.equal(verifyBundle(bundle, rootOf(TEXT)), false);
});

test("a swapped position breaks the anchor", () => {
  const bundle = buildBundle(TEXT);
  const a = bundle.segments[0].text;
  bundle.segments[0].text = bundle.segments[1].text;
  bundle.segments[1].text = a;
  assert.equal(verifyBundle(bundle, rootOf(TEXT)), false);
});

test("a dropped segment breaks the anchor", () => {
  const bundle = buildBundle(TEXT);
  bundle.segments.pop();
  assert.equal(verifyBundle(bundle, rootOf(TEXT)), false);
});

test("rejects a duplicate index", () => {
  const bundle = buildBundle(TEXT);
  bundle.segments[1].index = 0;
  assert.equal(verifyBundle(bundle, rootOf(TEXT)), false);
});

test("rejects an index outside the range", () => {
  const bundle = buildBundle(TEXT);
  bundle.segments[1].index = 9;
  assert.equal(verifyBundle(bundle, rootOf(TEXT)), false);
});

test("rejects an unknown bundle version", () => {
  const bundle = buildBundle(TEXT);
  bundle.version = 2;
  assert.equal(verifyBundle(bundle, rootOf(TEXT)), false);
});

test("rejects a wrong root and malformed input", () => {
  const bundle = buildBundle(TEXT);
  assert.equal(verifyBundle(bundle, `0x${"11".repeat(32)}`), false);
  assert.equal(verifyBundle(null, rootOf(TEXT)), false);
  assert.equal(verifyBundle({ version: 1, segments: [] }, rootOf(TEXT)), false);
});

test("compares the root case-insensitively", () => {
  assert.ok(verifyBundle(buildBundle(TEXT), rootOf(TEXT).toUpperCase().replace("0X", "0x")));
});

test("survives UTF-8 and emoji", () => {
  const text = "Die Grundzüge — ÄÖÜ ß\n\n你好\n\nZitat ohne Kontext 🤡";
  assert.ok(verifyBundle(buildBundle(text), rootOf(text)));
});
