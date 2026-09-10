// The CID formula against kubo.
//
// These four vectors were produced by `ipfs add -Q --cid-version 1` on kubo 0.43.0 and
// are checked in on purpose: the point of lib/citable/cid.mjs is that the browser can
// name a CID with no kubo present, so the test has to hold the reference rather than
// shell out to a binary that is not installed everywhere.
//
// The live cross-check is elsewhere and runs on every publish: script/js/publish.mjs
// compares this formula against what kubo really returned before anything goes on chain.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cidV1Raw, bundleBytes, bundleCid, MAX_RAW_BLOCK } from "../../lib/citable/cid.mjs";
import { buildBundle } from "../../lib/citable/bundle.mjs";

const utf8 = (s) => new TextEncoder().encode(s);

const VECTORS = [
  ["", "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku"],
  ["hello citable", "bafkreihfm5wbajksqqz5gj5jkc4ckija7yf3onk7fn2i67nz6ncebdjrby"],
  ['Absatz 3 von 87 — „Zahlen manipuliert?" 🧾', "bafkreicq4qpifw5vfoy2vxox4dmc55uzszvp3osfykfib6jsjimjklj45q"],
  [
    '{"version":1,"model":null,"dim":0,"segments":[{"index":0,"text":"Erster Absatz."},{"index":1,"text":"Zweiter Absatz."}]}',
    "bafkreifzgondch3xy3s2kmhhdqkwwdmeqb6l7gutlinmxdxpwcofbgeuoe",
  ],
];

test("matches kubo on every reference vector", () => {
  for (const [content, expected] of VECTORS) {
    assert.equal(cidV1Raw(utf8(content)), expected, `content: ${content.slice(0, 40)}`);
  }
});

test("a CIDv1 raw block is 59 characters and starts with bafkrei", () => {
  const cid = cidV1Raw(utf8("anything"));
  assert.equal(cid.length, 59);
  assert.match(cid, /^bafkrei[a-z2-7]{52}$/);
});

test("one byte of difference is a different CID", () => {
  assert.notEqual(cidV1Raw(utf8("a")), cidV1Raw(utf8("b")));
});

test("refuses a file past the chunk size instead of guessing", () => {
  assert.doesNotThrow(() => cidV1Raw(new Uint8Array(MAX_RAW_BLOCK)));
  assert.throws(() => cidV1Raw(new Uint8Array(MAX_RAW_BLOCK + 1)), /chunk size/);
});

test("refuses anything that is not bytes", () => {
  assert.throws(() => cidV1Raw("hello"), /Uint8Array/);
});

test("bundleBytes round-trips through JSON", () => {
  const bundle = buildBundle("Erster Absatz.\n\nZweiter Absatz.");
  const parsed = JSON.parse(new TextDecoder().decode(bundleBytes(bundle)));
  assert.deepEqual(parsed, bundle);
});

test("bundleCid is the CID of exactly those bytes", () => {
  const bundle = buildBundle("Erster Absatz.\n\nZweiter Absatz.");
  assert.equal(bundleCid(bundle), cidV1Raw(bundleBytes(bundle)));
  assert.equal(bundleCid(bundle), VECTORS[3][1]);
});
