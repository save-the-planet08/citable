// Deterministic guards that run BEFORE the model, catching the distortions it is weakest at.
//
// Lives in the client library and not next to the evaluation script because both sides run
// it: script/js/entailment-eval.mjs measured the thresholds with it, and stage 3 in the
// browser has to apply the identical rule. A second copy would let the browser drift away
// from the numbers in CONCEPT.md while still printing them.
//
// The model reasons about meaning and is therefore vague about the two things a forger
// changes most often: the numbers, and who did it. These checks are plain comparisons —
// no model, no randomness, and a reader can verify the rule by hand.
//
// Everything is normalised to a value rather than a spelling, so "four" and "vier" are the
// same token. Without that the guard would reject exactly the translations we want to find.

const DIGITS = /\b\d+(?:[.,]\d+)?\b/g;

// Deliberately omitted: "ein/eine/one/un" (indefinite article), "once" (11 in Spanish but
// "one time" in English), "cien/ciento" (appears inside "por ciento" = percent).
const NUMBER_WORDS = {
  null: 0, zero: 0,
  zwei: 2, two: 2, dos: 2,
  drei: 3, three: 3, tres: 3,
  vier: 4, four: 4, cuatro: 4,
  fünf: 5, fuenf: 5, five: 5, cinco: 5,
  sechs: 6, six: 6, seis: 6,
  sieben: 7, seven: 7, siete: 7,
  acht: 8, eight: 8, ocho: 8,
  neun: 9, nine: 9, nueve: 9,
  zehn: 10, ten: 10, diez: 10,
  elf: 11, eleven: 11,
  zwölf: 12, zwoelf: 12, twelve: 12, doce: 12,
  zwanzig: 20, twenty: 20, veinte: 20,
  dreißig: 30, dreissig: 30, thirty: 30, treinta: 30,
  vierzig: 40, forty: 40, cuarenta: 40,
  fünfzig: 50, fuenfzig: 50, fifty: 50, cincuenta: 50,
  sechzig: 60, sixty: 60, sesenta: 60,
  siebzig: 70, seventy: 70, setenta: 70,
  achtzig: 80, eighty: 80, ochenta: 80,
  neunzig: 90, ninety: 90, noventa: 90,
  hundert: 100, hundred: 100,
  tausend: 1000, thousand: 1000, mil: 1000,
};

// Forms of address: swapping one rewrites who made the statement.
const TITLES = {
  herr: "m", mr: "m", sir: "m", señor: "m", senor: "m",
  frau: "f", mrs: "f", ms: "f", miss: "f", lady: "f", señora: "f", senora: "f",
  dr: "dr", prof: "prof",
};

const WORD = /[\p{L}]+/gu;

/// Every value-bearing token a text asserts: literal numbers, spelled-out numbers, titles.
function claims(text) {
  const out = new Set();
  for (const d of text.match(DIGITS) ?? []) out.add(`n:${Number(d.replace(",", "."))}`);
  for (const w of text.match(WORD) ?? []) {
    const k = w.toLowerCase();
    if (k in NUMBER_WORDS) out.add(`n:${NUMBER_WORDS[k]}`);
    if (k in TITLES) out.add(`t:${TITLES[k]}`);
  }
  return out;
}

/// Values the claim asserts that the paragraph never mentions.
/// Non-empty means the claim states something the text does not — no matter how close
/// the two read semantically.
export function unsupportedTokens(paragraph, claim) {
  const inText = claims(paragraph);
  return [...claims(claim)].filter((t) => !inText.has(t));
}

export const isGuarded = (paragraph, claim) => unsupportedTokens(paragraph, claim).length > 0;
