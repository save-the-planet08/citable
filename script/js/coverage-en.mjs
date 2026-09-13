// The measurements behind the coverage section of the site, on the English statement.
//
//   node script/js/coverage-en.mjs
//
// The original corpus in entailment-eval.mjs is German, because the use case that started
// this project is a German article quoted in an English paper. The interface is English, so
// the statement the site demonstrates on is English too — and every figure the page prints
// has to come from a run against that exact text, not from the German one.
//
// Two questions, one run:
//   1. does entailment separate faithful quotations from distorted ones, here?
//   2. would plain similarity have done the same job? (it does not, and that is the point)
import { pipeline, AutoModelForSequenceClassification, AutoTokenizer } from "@xenova/transformers";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { unsupportedTokens } from "../../lib/citable/guards.mjs";
import { segment } from "../../lib/citable/segment.mjs";

const NLI = "Xenova/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7";
const EMB = "Xenova/multilingual-e5-small";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const paragraphs = segment(readFileSync(join(ROOT, "statements/citable/quarterly.txt"), "utf8"));

// [label, claim, expected] — COVERED must score high, DISTORTED must score low.
const cases = [
  ["identical", "Revenue rose by four percent in the last quarter.", "COVERED"],
  ["german", "Der Umsatz stieg im letzten Quartal um vier Prozent.", "COVERED"],
  ["spanish", "Los ingresos aumentaron un cuatro por ciento en el último trimestre.", "COVERED"],
  ["paraphrase", "Turnover was up four percent over the past quarter.", "COVERED"],
  ["shortened", "The board rejects the allegations.", "COVERED"],
  ["reordered", "Since 2019 the company has been led by Ms Roth.", "COVERED"],
  ["passive", "An independent audit for October has been announced.", "COVERED"],

  ["question-to-claim", "Roth has admitted that the figures were manipulated.", "DISTORTED"],
  ["negation-dropped", "The board has conceded the allegations.", "DISTORTED"],
  ["quote-in-quote", "The company confirms that the provisions are too low.", "DISTORTED"],
  ["number-inflated", "Revenue rose by forty percent in the last quarter.", "DISTORTED"],
  ["actor-swapped", "Mr Roth has led the company since 2019.", "DISTORTED"],
  ["time-shifted", "An independent audit was already carried out in October.", "DISTORTED"],
  ["hedge-dropped", "The provisions have been set too low.", "DISTORTED"],
  ["overreached", "Revenue has been rising steadily for years.", "DISTORTED"],
  ["unrelated", "The train to Copenhagen is cancelled today because of engineering work.", "DISTORTED"],
];

const tokenizer = await AutoTokenizer.from_pretrained(NLI);
const model = await AutoModelForSequenceClassification.from_pretrained(NLI);

const labels = model.config.id2label;
const entailIdx = Object.keys(labels).find((k) => labels[k].toLowerCase().startsWith("entail"));

const softmax = (xs) => {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
};

async function judge(premise, hypothesis) {
  const inputs = await tokenizer(premise, { text_pair: hypothesis, truncation: true });
  const { logits } = await model(inputs);
  return softmax(Array.from(logits.data))[entailIdx];
}

console.log(`\nstatement: statements/citable/quarterly.txt — ${paragraphs.length} paragraphs`);
console.log(`nli model: ${NLI}\n`);
console.log("case                entail  para  guarded  expected");
console.log("─".repeat(60));

const results = [];
for (const [label, claim, expected] of cases) {
  // The real screen does not know which paragraph is meant: take the best entailment over
  // every paragraph the value check has not already ruled out.
  let best = { entail: -1, idx: -1, guarded: false };
  for (let i = 0; i < paragraphs.length; i++) {
    if (unsupportedTokens(paragraphs[i], claim).length) continue;
    const entail = await judge(paragraphs[i], claim);
    if (entail > best.entail) best = { entail, idx: i, guarded: false };
  }
  if (best.idx === -1) best = { entail: 0, idx: -1, guarded: true };
  results.push({ label, expected, ...best });
  console.log(
    `${label.padEnd(19)} ${best.entail.toFixed(4)}  ${String(best.idx + 1).padStart(4)}  ` +
      `${best.guarded ? "  yes  " : "   no  "}  ${expected}`,
  );
}

const covered = results.filter((r) => r.expected === "COVERED");
const distorted = results.filter((r) => r.expected === "DISTORTED");
const weakestTrue = Math.min(...covered.map((r) => r.entail));
const strongestFalse = Math.max(...distorted.map((r) => r.entail));

console.log("\n" + "─".repeat(60));
console.log(`weakest faithful quotation:  ${weakestTrue.toFixed(4)}`);
console.log(`strongest distortion:        ${strongestFalse.toFixed(4)}`);
console.log(`gap:                         ${(weakestTrue - strongestFalse).toFixed(4)}`);
console.log(`at threshold 0.80 — false positives: ${distorted.filter((r) => r.entail >= 0.8).length}/${distorted.length}` +
  `, false negatives: ${covered.filter((r) => r.entail < 0.8).length}/${covered.length}`);

// ---------------------------------------------------------------------------
// The comparison that decided the design: would similarity have worked instead?
// ---------------------------------------------------------------------------
const extractor = await pipeline("feature-extraction", EMB);
const embed = async (t, prefix) =>
  (await extractor(`${prefix}: ${t}`, { pooling: "mean", normalize: true })).data;
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

// Both measured against the same paragraph — the question the forger turned into a
// confession. If similarity ranks the forgery at or above the honest translation, a
// percentage built on it would confirm the disinformation.
const premise = await embed(paragraphs[0], "passage");
const probes = [
  ["honest translation", "Wurden die Zahlen manipuliert? Diese Frage ist seit Monaten offen."],
  ["fabricated confession", "Roth has admitted that the figures were manipulated."],
  ["unrelated", "The train to Copenhagen is cancelled today because of engineering work."],
];

console.log(`\nsimilarity model: ${EMB}`);
console.log(`against paragraph 1: "${paragraphs[0]}"\n`);
for (const [label, text] of probes) {
  console.log(`${label.padEnd(24)} ${dot(await embed(text, "query"), premise).toFixed(4)}`);
}
console.log();
