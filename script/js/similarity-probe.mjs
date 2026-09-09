// Risk probe for layer 2: does semantic similarity actually separate the cases we care about?
// Run once before building anything on top of it: node script/js/similarity-probe.mjs
import { pipeline } from "@xenova/transformers";

const MODEL = "Xenova/multilingual-e5-small";

// A tiny article, standing in for a registered statement.
const paragraphs = [
  "Wurden die Zahlen manipuliert? Diese Frage stellt sich seit Monaten.",
  "Der Vorstand weist die Vorwürfe zurück und verweist auf die Prüfberichte.",
  "Im vergangenen Quartal stieg der Umsatz um vier Prozent.",
  "Das Wetter in Hamburg war den ganzen Juli über ungewöhnlich mild.",
];

// What people might type into the verify screen, and what we hope to see.
const probes = [
  ["identisch", "Wurden die Zahlen manipuliert? Diese Frage stellt sich seit Monaten.", "sehr hoch"],
  ["uebersetzt", "Were the figures manipulated? That question has been open for months.", "hoch"],
  ["umformuliert", "Seit Monaten steht der Verdacht im Raum, man habe die Zahlen frisiert.", "hoch"],
  ["FALSCHZITAT", "Roth hat zugegeben, dass die Zahlen manipuliert wurden.", "MUSS niedrig sein"],
  ["unverwandt", "Der Zug nach Kopenhagen faellt heute wegen Bauarbeiten aus.", "niedrig"],
];

const extractor = await pipeline("feature-extraction", MODEL);

// e5 models expect these prefixes; without them the numbers get noticeably worse.
const embed = async (text, prefix) =>
  (await extractor(`${prefix}: ${text}`, { pooling: "mean", normalize: true })).data;

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

const paraVecs = await Promise.all(paragraphs.map((p) => embed(p, "passage")));

// Baseline: how similar are unrelated paragraphs of this article to each other?
// Anything a probe scores must be read against this floor, not against zero.
const pairs = [];
for (let i = 0; i < paraVecs.length; i++) {
  for (let j = i + 1; j < paraVecs.length; j++) pairs.push(dot(paraVecs[i], paraVecs[j]));
}
const baseline = pairs.reduce((a, b) => a + b, 0) / pairs.length;

console.log(`\nmodel:    ${MODEL}`);
console.log(`baseline: ${baseline.toFixed(4)}  (mean similarity between unrelated paragraphs)\n`);
console.log("case          best   para  spread   expected");
console.log("─".repeat(60));

for (const [label, text, expected] of probes) {
  const v = await embed(text, "query");
  const scores = paraVecs.map((p) => dot(v, p));
  const best = Math.max(...scores);
  const idx = scores.indexOf(best);
  const spread = best - baseline;
  console.log(
    `${label.padEnd(13)} ${best.toFixed(4)}  [${idx}]  ${spread >= 0 ? "+" : ""}${spread.toFixed(4)}  ${expected}`,
  );
}

console.log(
  "\nspread = how far above the noise floor. That is the number the UI should show,\n" +
    "not the raw similarity — raw values sit high for everything.\n",
);
