// The value check — the deterministic half of stage 3.
//
// Worth testing on its own because the safety of stage 3 leans on it. CONCEPT.md 3 puts a
// number on that: without this rule the strongest distorted claim scores 0.7278 against a
// threshold of 0.80, which is 0.072 of headroom. With it the strongest scores 0.5655. The
// model is not what keeps "vierzig Prozent" out of a paragraph that says "vier Prozent" —
// this is.
//
// The cases below are the ones from script/js/entailment-eval.mjs that the guard, and not
// the model, is responsible for.
import { test } from "node:test";
import assert from "node:assert/strict";
import { unsupportedTokens, isGuarded } from "../../lib/citable/guards.mjs";

const PARAGRAPHS = {
  umsatz: "Im vergangenen Quartal stieg der Umsatz um vier Prozent.",
  roth: "Frau Roth leitet das Unternehmen seit 2019.",
  vorstand: "Der Vorstand weist die Vorwürfe zurück und verweist auf die Prüfberichte.",
};

test("an inflated number is caught", () => {
  assert.deepEqual(
    unsupportedTokens(PARAGRAPHS.umsatz, "Im vergangenen Quartal stieg der Umsatz um vierzig Prozent."),
    ["n:40"],
  );
});

test("a swapped form of address is caught", () => {
  assert.deepEqual(unsupportedTokens(PARAGRAPHS.roth, "Herr Roth leitet das Unternehmen seit 2019."), [
    "t:m",
  ]);
});

// The whole reason values are normalised to a value rather than a spelling. Without it the
// rule would block exactly the translations stage 3 exists to find.
test("translations of the same number pass", () => {
  for (const claim of [
    "Revenue rose by four percent last quarter.",
    "Los ingresos aumentaron un cuatro por ciento el trimestre pasado.",
    "Der Umsatz legte im letzten Quartal um vier Prozent zu.",
  ]) {
    assert.deepEqual(unsupportedTokens(PARAGRAPHS.umsatz, claim), [], claim);
  }
});

test("4 and vier and cuatro are one token", () => {
  assert.deepEqual(unsupportedTokens("Es waren vier.", "There were 4."), []);
  assert.deepEqual(unsupportedTokens("Es waren 4.", "Eran cuatro."), []);
});

test("a decimal comma and a decimal point are the same value", () => {
  assert.deepEqual(unsupportedTokens("Der Anteil liegt bei 4,5 Prozent.", "The share is 4.5 percent."), []);
});

test("a claim that asserts no value is never guarded", () => {
  assert.equal(isGuarded(PARAGRAPHS.vorstand, "Der Vorstand hat die Vorwürfe eingeräumt."), false);
});

// The direction is deliberate: the claim may assert less than the paragraph, never more.
// A shortened quote is a legitimate quote; an added figure is not.
test("the paragraph may hold values the claim never mentions", () => {
  assert.deepEqual(unsupportedTokens(PARAGRAPHS.umsatz, "Der Umsatz stieg."), []);
  assert.deepEqual(unsupportedTokens(PARAGRAPHS.roth, "Frau Roth leitet das Unternehmen."), []);
});

test("several unsupported values are all reported", () => {
  const blocked = unsupportedTokens(PARAGRAPHS.roth, "Herr Roth leitet das Unternehmen seit 2020.");
  assert.deepEqual(blocked.sort(), ["n:2020", "t:m"]);
});

// Documented omissions in lib/citable/guards.mjs. They are omitted because a naive reading
// would mistranslate them, and a rule that blocks correct quotes is not a safe rule.
test("the indefinite article is not read as the number one", () => {
  assert.deepEqual(unsupportedTokens("Es gab eine Anhörung.", "There was a hearing."), []);
});

test("por ciento does not smuggle in a hundred", () => {
  assert.deepEqual(unsupportedTokens(PARAGRAPHS.umsatz, "Subió un cuatro por ciento."), []);
});
