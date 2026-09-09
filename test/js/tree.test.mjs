import test from "node:test";
import assert from "node:assert/strict";
import { buildTree } from "../../lib/citable/tree.mjs";
import { leafOf } from "../../lib/citable/leaf.mjs";
import { keccak256, encodePacked } from "viem";

const SEGMENTS = [
  "Wurden die Zahlen manipuliert? Diese Frage stellt sich seit Monaten.",
  "Der Vorstand weist die Vorwürfe zurück.",
  "Im vergangenen Quartal stieg der Umsatz um vier Prozent.",
  "Eine Prüfung ist für Oktober angekündigt.",
];

/// OpenZeppelin's MerkleProof hashes sibling pairs in ascending order.
const hashPair = (a, b) =>
  a.toLowerCase() < b.toLowerCase()
    ? keccak256(encodePacked(["bytes32", "bytes32"], [a, b]))
    : keccak256(encodePacked(["bytes32", "bytes32"], [b, a]));

/// The verification CitableRegistry.verifySegment performs, in JS.
const verify = (proof, root, leaf) => proof.reduce(hashPair, leaf) === root;

test("root matches a tree computed by hand", () => {
  const { root } = buildTree(SEGMENTS);
  const l = SEGMENTS.map((s, i) => leafOf(i, s));
  assert.equal(root, hashPair(hashPair(l[0], l[1]), hashPair(l[2], l[3])));
});

test("leaves are in segment order", () => {
  const { leaves } = buildTree(SEGMENTS);
  assert.deepEqual(leaves, SEGMENTS.map((s, i) => leafOf(i, s)));
});

test("every proof verifies against its own leaf", () => {
  const { root, leaves, proofFor } = buildTree(SEGMENTS);
  for (let i = 0; i < SEGMENTS.length; i++) {
    assert.ok(verify(proofFor(i), root, leaves[i]), `proof ${i} failed`);
  }
});

test("a proof does not verify at another position", () => {
  const { root, proofFor } = buildTree(SEGMENTS);
  assert.equal(verify(proofFor(1), root, leafOf(2, SEGMENTS[1])), false);
});

test("handles an odd number of segments", () => {
  const odd = SEGMENTS.slice(0, 3);
  const { root, leaves, proofFor } = buildTree(odd);
  for (let i = 0; i < odd.length; i++) assert.ok(verify(proofFor(i), root, leaves[i]));
});

test("a single segment is its own root, proof is empty", () => {
  const { root, leaves, proofFor } = buildTree(["Nur ein Absatz."]);
  assert.equal(root, leaves[0]);
  assert.deepEqual(proofFor(0), []);
});

test("survives UTF-8 and emoji", () => {
  const texts = ["Die Grundzüge — ÄÖÜ ß", "你好", "Zitat ohne Kontext 🤡", "çà"];
  const { root, leaves, proofFor } = buildTree(texts);
  for (let i = 0; i < texts.length; i++) assert.ok(verify(proofFor(i), root, leaves[i]));
});

test("identical texts at different positions get different leaves", () => {
  const { root, leaves, proofFor } = buildTree(["gleich", "gleich", "gleich"]);
  assert.equal(new Set(leaves).size, 3);
  for (let i = 0; i < 3; i++) assert.ok(verify(proofFor(i), root, leaves[i]));
});

test("refuses an empty statement", () => {
  assert.throws(() => buildTree([]), /at least one segment/);
});

test("refuses an out-of-range index", () => {
  const { proofFor } = buildTree(SEGMENTS);
  assert.throws(() => proofFor(4), /out of range/);
  assert.throws(() => proofFor(-1), /out of range/);
});
