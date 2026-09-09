import test from "node:test";
import assert from "node:assert/strict";
import { leafOf } from "../../lib/citable/leaf.mjs";

// The parity with src/Leaf.sol is proven by forge test (test/Leaf.t.sol) over FFI.
// These tests cover the properties the Solidity side cannot observe.

test("is deterministic", () => {
  assert.equal(leafOf(3, "Wurden die Zahlen manipuliert?"), leafOf(3, "Wurden die Zahlen manipuliert?"));
});

test("returns 32 bytes as hex", () => {
  assert.match(leafOf(0, "A"), /^0x[0-9a-f]{64}$/);
});

test("the position is part of the hash", () => {
  const s = "Wurden die Zahlen manipuliert?";
  assert.notEqual(leafOf(3, s), leafOf(4, s));
});

test("accepts an empty segment", () => {
  assert.match(leafOf(1, ""), /^0x[0-9a-f]{64}$/);
});

test("accepts number and bigint indices alike", () => {
  assert.equal(leafOf(7, "A"), leafOf(7n, "A"));
});
