// Stage 3 — coverage. A measurement, never a proof.
//
// This is the cascade from CONCEPT.md section 3, moved into the browser unchanged:
//
//   embeddings  pick the three paragraphs nearest in meaning
//   value check numbers and forms of address must be covered, or the pair is not scored
//   NLI         is the claim entailed by the paragraph?
//
// Two things about it are load-bearing and easy to get wrong later.
//
// First, similarity is NOT the answer and is only used to shortlist. Measured in
// script/js/similarity-probe.mjs: a false quote scored 0.880 against a correct
// translation's 0.877, because similarity models measure what is being talked about, not
// what is being asserted. A percentage built on that would confirm the disinformation in
// exactly the case this project exists for.
//
// Second, the threshold and the guard are not taste. They were measured over 16 cases in
// script/js/entailment-eval.mjs: at 0.80 no distorted claim gets through, and the value
// check is what widens the headroom from 0.072 to 0.235. Change either number and the
// sentence the UI prints stops being true.
//
// What the percentage means: no false quote in that test set reached this value. It does
// NOT mean "X % true". 16 cases are a signal, not a validation.
// Straight from the client library, not through the dynamic loader in ./citable: the
// guard is plain string work with no merkletreejs and no Buffer behind it, so it needs
// none of that module's ceremony. It is the same file script/js/entailment-eval.mjs
// measured with.
import { unsupportedTokens } from "@citable/guards.mjs";

/** Picks the shortlist. Multilingual, so a German paragraph and an English claim meet. */
export const EMBED_MODEL = "Xenova/multilingual-e5-small";

/** Decides coverage. Asks whether the claim is entailed, not whether it sounds alike. */
export const NLI_MODEL = "Xenova/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7";

/** The lowest cut at which no distorted claim in the test set got through. */
export const THRESHOLD = 0.8;

/** How many paragraphs the embeddings hand to the NLI model. */
export const CANDIDATES = 3;

export type Phase = "loading" | "embedding" | "judging";

export interface Progress {
  phase: Phase;
  /** 0..1 where known, otherwise null — model downloads report per file. */
  fraction: number | null;
  detail: string;
}

export interface Scored {
  index: number;
  paragraph: string;
  entail: number;
  /** The other two classes, so the panel can say "contradicted" rather than just "low". */
  contra: number;
}

export type Coverage =
  /** Entailment at or above the measured threshold. Still a measurement. */
  | { kind: "covered"; best: Scored; ranked: Scored[] }
  /** The nearest paragraphs were scored and none of them covers the claim. */
  | { kind: "uncovered"; best: Scored; ranked: Scored[] }
  /**
   * Every candidate asserted a value the paragraph never mentions, so nothing was scored.
   * Not a weak result — a categorical one, and reachable by hand without a model.
   */
  | { kind: "guarded"; index: number; paragraph: string; blocked: string[] };

type Extractor = (text: string, options: object) => Promise<{ data: Float32Array }>;
type Tokenizer = (text: string, options: object) => Promise<object>;
type Classifier = ((inputs: object) => Promise<{ logits: { data: Float32Array } }>) & {
  config: { id2label: Record<string, string> };
};

interface Models {
  extract: Extractor;
  tokenize: Tokenizer;
  classify: Classifier;
  entailIdx: number;
  contraIdx: number;
}

let models: Promise<Models> | undefined;

/** True once the models are in memory — the button can stop offering a 400 MB download. */
export function modelsReady(): boolean {
  return models !== undefined;
}

/**
 * Downloads and instantiates both models. ~400 MB the first time, then served from the
 * browser's cache. Deliberately not called on page load: nobody should pay for a download
 * they did not ask for, and stages 1 and 2 answer most questions without it.
 */
export function loadModels(onProgress?: (p: Progress) => void): Promise<Models> {
  models ??= (async () => {
    const { pipeline, AutoTokenizer, AutoModelForSequenceClassification, env } = await import(
      "@xenova/transformers"
    );
    // No local model directory to look in — this runs in a browser, the hub is the source.
    env.allowLocalModels = false;

    const report = (model: string) => (p: { status: string; file?: string; progress?: number }) => {
      if (p.status !== "progress") return;
      onProgress?.({
        phase: "loading",
        fraction: typeof p.progress === "number" ? p.progress / 100 : null,
        detail: `${model} · ${p.file ?? ""}`,
      });
    };

    const extract = (await pipeline("feature-extraction", EMBED_MODEL, {
      progress_callback: report("candidate search"),
    })) as unknown as Extractor;

    const tokenize = (await AutoTokenizer.from_pretrained(NLI_MODEL, {
      progress_callback: report("coverage"),
    })) as unknown as Tokenizer;

    const classify = (await AutoModelForSequenceClassification.from_pretrained(NLI_MODEL, {
      progress_callback: report("coverage"),
    })) as unknown as Classifier;

    // The label order is read off the model rather than assumed. A wrong index here would
    // silently report the contradiction score as coverage — the worst possible failure.
    const labels = classify.config.id2label;
    const find = (prefix: string) => {
      const key = Object.keys(labels).find((k) => labels[k].toLowerCase().startsWith(prefix));
      if (key === undefined) throw new Error(`${NLI_MODEL} has no ${prefix} label: ${JSON.stringify(labels)}`);
      return Number(key);
    };

    return { extract, tokenize, classify, entailIdx: find("entail"), contraIdx: find("contra") };
  })();
  return models;
}

/**
 * @param paragraphs the statement's paragraphs, already proven against the root
 * @param claim      what the reader says was said
 */
export async function coverage(
  paragraphs: string[],
  claim: string,
  onProgress?: (p: Progress) => void,
): Promise<Coverage> {
  const m = await loadModels(onProgress);

  // e5 wants these prefixes. Without them the numbers get noticeably worse — measured in
  // script/js/similarity-probe.mjs.
  const embed = async (text: string, prefix: "query" | "passage") =>
    (await m.extract(`${prefix}: ${text}`, { pooling: "mean", normalize: true })).data;

  onProgress?.({ phase: "embedding", fraction: 0, detail: `${paragraphs.length} paragraphs` });
  const vectors: Float32Array[] = [];
  for (const [i, p] of paragraphs.entries()) {
    vectors.push(await embed(p, "passage"));
    onProgress?.({
      phase: "embedding",
      fraction: (i + 1) / (paragraphs.length + 1),
      detail: `${i + 1} of ${paragraphs.length} paragraphs`,
    });
    await yieldToBrowser();
  }
  const claimVector = await embed(claim, "query");

  // Normalised vectors, so the dot product is the cosine.
  const nearest = paragraphs
    .map((paragraph, index) => ({ index, paragraph, score: dot(claimVector, vectors[index]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, CANDIDATES);

  // The value check, before the model and independent of it. A claim asserting a number or
  // an actor the paragraph never mentions is not scored at all, however close it reads.
  const scorable = nearest.map((c) => ({ ...c, blocked: unsupportedTokens(c.paragraph, claim) }));
  const open = scorable.filter((c) => c.blocked.length === 0);

  if (open.length === 0) {
    // Nothing to score. Name the candidate that asserts the least beyond its text, so the
    // reason points at what the claim actually added.
    const closest = scorable.reduce((a, b) => (b.blocked.length < a.blocked.length ? b : a));
    return {
      kind: "guarded",
      index: closest.index,
      paragraph: closest.paragraph,
      blocked: closest.blocked,
    };
  }

  onProgress?.({ phase: "judging", fraction: 0, detail: `${open.length} candidates` });
  const ranked: Scored[] = [];
  for (const [i, candidate] of open.entries()) {
    ranked.push({ ...(await judge(m, candidate.paragraph, claim)), index: candidate.index, paragraph: candidate.paragraph });
    onProgress?.({
      phase: "judging",
      fraction: (i + 1) / open.length,
      detail: `${i + 1} of ${open.length} candidates`,
    });
    await yieldToBrowser();
  }
  ranked.sort((a, b) => b.entail - a.entail);

  const best = ranked[0];
  return { kind: best.entail >= THRESHOLD ? "covered" : "uncovered", best, ranked };
}

async function judge(m: Models, premise: string, hypothesis: string) {
  const inputs = await m.tokenize(premise, { text_pair: hypothesis, truncation: true });
  const { logits } = await m.classify(inputs);
  const p = softmax(Array.from(logits.data));
  return { entail: p[m.entailIdx], contra: p[m.contraIdx] };
}

function softmax(xs: number[]): number[] {
  const max = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - max));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / sum);
}

function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** Inference blocks the thread. Hand it back between items so progress actually paints. */
const yieldToBrowser = () => new Promise((r) => setTimeout(r, 0));
