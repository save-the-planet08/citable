// The gate in front of the pinning endpoint.
//
// api/pin.mjs holds a key that a browser never sees, so what it agrees to upload has to be
// narrow. checkBundle is that narrowing, and these cases are the ones that would otherwise
// turn it into a free file host or — worse — let it pin bytes that do not belong to the
// root the author is about to put on chain.
//
// No network here. Pinata is never called; the upload itself is lib/citable/pinata.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBundle, ROOT_HEADER } from "../../api/pin.mjs";
import { buildBundle } from "../../lib/citable/bundle.mjs";
import { buildTree } from "../../lib/citable/tree.mjs";
import { bundleBytes, bundleCid, MAX_RAW_BLOCK } from "../../lib/citable/cid.mjs";

const TEXT = "Erster Absatz.\n\nZweiter Absatz.\n\nDritter Absatz.";

function fixture(text = TEXT) {
  const bundle = buildBundle(text);
  const { root } = buildTree(bundle.segments.map((s) => s.text));
  return { bundle, root, bytes: bundleBytes(bundle) };
}

test("accepts a bundle and names the CID the browser named", () => {
  const { bundle, root, bytes } = fixture();
  const result = checkBundle(bytes, root);
  assert.equal(result.ok, true);
  assert.equal(result.cid, bundleCid(bundle));
});

test("the header name is the one the client is told to use", () => {
  assert.equal(ROOT_HEADER, "x-citable-root");
});

test("refuses a bundle that does not rebuild the stated root", () => {
  const { bytes } = fixture();
  const other = fixture("Ein ganz anderer Text.\n\nMit anderen Absätzen.");
  const result = checkBundle(bytes, other.root);
  assert.equal(result.ok, false);
  assert.match(result.reason, /do not rebuild the root/);
});

// The reason the index sits inside the leaf. Sorted pairs would hide a sibling swap, so a
// bundle whose paragraphs moved has to fail here rather than be pinned under the old root.
test("refuses a bundle whose segments were swapped", () => {
  const { bundle, root } = fixture();
  const swapped = {
    ...bundle,
    segments: [
      { index: 0, text: bundle.segments[1].text },
      { index: 1, text: bundle.segments[0].text },
      bundle.segments[2],
    ],
  };
  const result = checkBundle(bundleBytes(swapped), root);
  assert.equal(result.ok, false);
  assert.match(result.reason, /do not rebuild the root/);
});

test("refuses bytes that are not a bundle at all", () => {
  const { root } = fixture();
  for (const body of ["not json at all", "[]", '{"version":2,"segments":[]}', "null"]) {
    const result = checkBundle(new TextEncoder().encode(body), root);
    assert.equal(result.ok, false, `should have refused: ${body}`);
  }
});

test("refuses invalid UTF-8 rather than decoding it lossily", () => {
  const { root } = fixture();
  const result = checkBundle(new Uint8Array([0xff, 0xfe, 0xfd]), root);
  assert.equal(result.ok, false);
  assert.match(result.reason, /UTF-8/);
});

test("refuses anything that is not a 32-byte hex root", () => {
  const { bytes } = fixture();
  for (const root of [undefined, "", "0xabc", "not a root", "a".repeat(64)]) {
    const result = checkBundle(bytes, root);
    assert.equal(result.ok, false, `should have refused root: ${root}`);
    assert.match(result.reason, /32-byte hex root/);
  }
});

// Past the chunk size the single-raw-block formula is wrong, and a CID that looks right
// and points nowhere is worse than a refusal.
test("refuses a body past the chunk size instead of guessing a CID", () => {
  const { root } = fixture();
  const result = checkBundle(new Uint8Array(MAX_RAW_BLOCK + 1), root);
  assert.equal(result.ok, false);
  assert.match(result.reason, /chunk size/);
});
