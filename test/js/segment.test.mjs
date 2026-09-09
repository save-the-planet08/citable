import test from "node:test";
import assert from "node:assert/strict";
import { segment } from "../../lib/citable/segment.mjs";

test("splits at blank lines, not at sentences", () => {
  assert.deepEqual(segment("Erster Absatz. Zweiter Satz.\n\nZweiter Absatz."), [
    "Erster Absatz. Zweiter Satz.",
    "Zweiter Absatz.",
  ]);
});

test("trims the edges of every segment", () => {
  assert.deepEqual(segment("  A  \n\n\t B \n"), ["A", "B"]);
});

test("drops empty segments", () => {
  assert.deepEqual(segment("A\n\n\n\nB\n\n   \n\nC"), ["A", "B", "C"]);
});

test("keeps single newlines inside a segment", () => {
  assert.deepEqual(segment("Zeile eins\nZeile zwei\n\nZweiter"), ["Zeile eins\nZeile zwei", "Zweiter"]);
});

test("keeps UTF-8 and emoji byte for byte", () => {
  const text = "Die Grundzüge — ÄÖÜ ß, 你好\n\nZitat ohne Kontext 🤡";
  assert.deepEqual(segment(text), ["Die Grundzüge — ÄÖÜ ß, 你好", "Zitat ohne Kontext 🤡"]);
});

test("does not normalise: composed and decomposed stay different", () => {
  // U+00C4 against A + U+0308 — same glyph, different bytes, different leaf.
  assert.notEqual(segment("\u00C4")[0], segment("A\u0308")[0]);
});

test("CRLF blank lines do not split — the rule is literal", () => {
  assert.deepEqual(segment("A\r\n\r\nB"), ["A\r\n\r\nB".trim()]);
});

test("text without any blank line is one segment", () => {
  assert.deepEqual(segment("Nur ein Absatz."), ["Nur ein Absatz."]);
});

test("whitespace-only text has no segments", () => {
  assert.deepEqual(segment("   \n\n  \n\n "), []);
});
