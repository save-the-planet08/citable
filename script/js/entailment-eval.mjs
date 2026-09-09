// Does entailment actually separate faithful quotes from distorted ones?
// Not a smoke test: every claim is scored against EVERY paragraph, the way the real
// verify screen has to work, and the run reports whether a usable threshold exists.
//
//   node script/js/entailment-eval.mjs
import { AutoModelForSequenceClassification, AutoTokenizer } from "@xenova/transformers";
import { unsupportedTokens } from "./guards.mjs";

const MODEL = "Xenova/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7";

// The registered statement.
const paragraphs = [
  "Wurden die Zahlen manipuliert? Diese Frage stellt sich seit Monaten.",
  "Der Vorstand weist die Vorwürfe zurück und verweist auf die Prüfberichte.",
  "Im vergangenen Quartal stieg der Umsatz um vier Prozent.",
  "Kritiker behaupten, die Rückstellungen seien zu niedrig angesetzt.",
  "Eine unabhängige Prüfung ist für Oktober angekündigt.",
  "Frau Roth leitet das Unternehmen seit 2019.",
];

// [category, claim, expected]  — COVERED must score high, DISTORTED must score low.
const cases = [
  ["identisch", "Im vergangenen Quartal stieg der Umsatz um vier Prozent.", "COVERED"],
  ["uebersetzt-en", "Revenue rose by four percent last quarter.", "COVERED"],
  ["uebersetzt-es", "Los ingresos aumentaron un cuatro por ciento el trimestre pasado.", "COVERED"],
  ["paraphrase", "Der Umsatz legte im letzten Quartal um vier Prozent zu.", "COVERED"],
  ["gekuerzt", "Der Vorstand weist die Vorwürfe zurück.", "COVERED"],
  ["umgestellt", "Seit 2019 steht Frau Roth an der Spitze des Unternehmens.", "COVERED"],
  ["passiv", "Für Oktober wurde eine unabhängige Prüfung angekündigt.", "COVERED"],

  ["frage→aussage", "Roth hat zugegeben, dass die Zahlen manipuliert wurden.", "DISTORTED"],
  ["negation-weg", "Der Vorstand hat die Vorwürfe eingeräumt.", "DISTORTED"],
  ["zitat-im-zitat", "Das Unternehmen bestätigt, die Rückstellungen seien zu niedrig.", "DISTORTED"],
  ["zahl-aufgeblasen", "Im vergangenen Quartal stieg der Umsatz um vierzig Prozent.", "DISTORTED"],
  ["subjekt-getauscht", "Herr Roth leitet das Unternehmen seit 2019.", "DISTORTED"],
  ["zeit-verschoben", "Eine unabhängige Prüfung wurde im Oktober bereits durchgeführt.", "DISTORTED"],
  ["konjunktiv-weg", "Die Rückstellungen sind zu niedrig angesetzt.", "DISTORTED"],
  ["ueberdehnt", "Der Umsatz steigt seit Jahren kontinuierlich.", "DISTORTED"],
  ["unverwandt", "Der Zug nach Kopenhagen fällt heute wegen Bauarbeiten aus.", "DISTORTED"],
];

const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
const model = await AutoModelForSequenceClassification.from_pretrained(MODEL);

const labels = model.config.id2label;
const entailIdx = Object.keys(labels).find((k) => labels[k].toLowerCase().startsWith("entail"));
const contraIdx = Object.keys(labels).find((k) => labels[k].toLowerCase().startsWith("contra"));

const softmax = (xs) => {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
};

// Full three-class distribution for one (paragraph, claim) pair.
async function judge(premise, hypothesis) {
  const inputs = await tokenizer(premise, { text_pair: hypothesis, truncation: true });
  const { logits } = await model(inputs);
  const p = softmax(Array.from(logits.data));
  return { entail: p[entailIdx], contra: p[contraIdx] };
}

console.log(`\nmodel:  ${MODEL}`);
console.log(`labels: ${JSON.stringify(labels)}`);
console.log(`${paragraphs.length} paragraphs × ${cases.length} claims\n`);
console.log("case                 entail  contra  para  expected");
console.log("─".repeat(62));

const results = [];
for (const [label, claim, expected] of cases) {
  // The real screen does not know which paragraph is meant: take the best entailment.
  let best = { entail: -1, contra: 0, idx: -1, blocked: [] };
  for (let i = 0; i < paragraphs.length; i++) {
    const blocked = unsupportedTokens(paragraphs[i], claim);
    // A guarded pair is not scored at all: the claim asserts a number or an actor the
    // paragraph never mentions, so no amount of semantic closeness makes it covered.
    if (blocked.length) continue;
    const r = await judge(paragraphs[i], claim);
    if (r.entail > best.entail) best = { ...r, idx: i, blocked: [] };
  }
  if (best.idx === -1) {
    // Every paragraph was guarded. Report the closest one — fewest unsupported values —
    // so the reason names what the claim actually asserts beyond the nearest text.
    const closest = paragraphs
      .map((p) => unsupportedTokens(p, claim))
      .reduce((a, b) => (b.length < a.length ? b : a));
    best = { entail: 0, contra: 0, idx: -1, blocked: closest };
  }
  results.push({ label, expected, ...best });
  const flag = expected === "COVERED" ? "" : " ";
  const where = best.idx === -1 ? `guard:${best.blocked.join(",")}` : `[${best.idx}]`;
  console.log(
    `${label.padEnd(20)} ${best.entail.toFixed(4)}  ${best.contra.toFixed(4)}  ${where.padEnd(5)}${flag} ${expected}`,
  );
}

const covered = results.filter((r) => r.expected === "COVERED");
const distorted = results.filter((r) => r.expected === "DISTORTED");

// The two error types are not equally bad. Rejecting a real quote is an annoyance;
// confirming a distorted one is the failure this whole project exists to prevent.
// So the question is not "is there a perfect split" but "how low can the threshold go
// while still letting through zero distorted claims".
console.log("\n" + "─".repeat(62));
console.log("threshold   false-positive   false-negative");
console.log("            (distorted OK)   (real rejected)");

let safest = null;
for (const t of [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]) {
  const fp = distorted.filter((r) => r.entail >= t);
  const fn = covered.filter((r) => r.entail < t);
  const mark = fp.length === 0 && !safest ? "  ← lowest safe cut" : "";
  if (fp.length === 0 && !safest) safest = { t, fn };
  console.log(`  ${t.toFixed(2)}         ${String(fp.length).padStart(2)}/${distorted.length}            ${String(fn.length).padStart(2)}/${covered.length}${mark}`);
}

console.log();
if (safest) {
  console.log(`✅ Threshold ${safest.t} admits no distorted claim.`);
  if (safest.fn.length) {
    console.log(`   Cost: ${safest.fn.map((r) => `${r.label} (${r.entail.toFixed(3)})`).join(", ")}`);
  }
  const headroom = safest.t - Math.max(...distorted.map((r) => r.entail));
  console.log(`   Headroom to the strongest distorted claim: ${headroom.toFixed(3)}`);
} else {
  console.log("❌ Even at 0.90 a distorted claim gets through. The model is not enough.");
}
console.log();
