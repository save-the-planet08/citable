// Second risk probe: can an NLI model tell a distorted quote from a faithful one,
// where embedding similarity could not? Run: node script/js/nli-probe.mjs
import { pipeline } from "@xenova/transformers";

// Tried in order — the first that loads wins. Multilingual first, English fallbacks after.
const CANDIDATES = [
  "Xenova/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7",
  "Xenova/nli-deberta-v3-small",
  "Xenova/distilbert-base-uncased-mnli",
];

const premise = "Wurden die Zahlen manipuliert? Diese Frage stellt sich seit Monaten.";

const claims = [
  ["identisch", "Wurden die Zahlen manipuliert? Diese Frage stellt sich seit Monaten.", "gedeckt"],
  ["uebersetzt", "Were the figures manipulated? That question has been open for months.", "gedeckt"],
  ["umformuliert", "Seit Monaten steht der Verdacht im Raum, man habe die Zahlen frisiert.", "gedeckt"],
  ["FALSCHZITAT", "Roth hat zugegeben, dass die Zahlen manipuliert wurden.", "NICHT gedeckt"],
  ["unverwandt", "Der Zug nach Kopenhagen faellt heute wegen Bauarbeiten aus.", "nicht gedeckt"],
];

let classifier = null;
let model = null;

for (const candidate of CANDIDATES) {
  try {
    process.stderr.write(`trying ${candidate} … `);
    classifier = await pipeline("zero-shot-classification", candidate);
    model = candidate;
    process.stderr.write("ok\n");
    break;
  } catch (err) {
    process.stderr.write(`failed (${err.message.split("\n")[0]})\n`);
  }
}

if (!classifier) {
  console.error("\nNo NLI model could be loaded. Layer 3 needs a different approach.");
  process.exit(1);
}

console.log(`\nmodel:   ${model}`);
console.log(`premise: "${premise}"\n`);
console.log("case          entailment   expected");
console.log("─".repeat(50));

for (const [label, claim, expected] of claims) {
  // hypothesis_template "{}" feeds the claim in verbatim as the NLI hypothesis.
  const out = await classifier(premise, [claim], { hypothesis_template: "{}" });
  console.log(`${label.padEnd(13)} ${out.scores[0].toFixed(4)}       ${expected}`);
}

console.log(
  "\nWhat matters: FALSCHZITAT must land clearly below uebersetzt.\n" +
    "If it does, the percentage is back — measuring coverage instead of topic.\n",
);
