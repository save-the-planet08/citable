"use client";

import { useState } from "react";
import { coverage, EMBED_MODEL, NLI_MODEL, THRESHOLD, type Coverage, type Progress } from "@/lib/stage3";
import type { Scanned } from "@/lib/search";

/**
 * Stage 3, and everything about how it looks is an argument.
 *
 * It never uses the seal, never a solid fill, never the shapes stages 1 and 2 use. Hatched
 * ground, dashed border, its own colour: a percentage that looks like a proof does more
 * damage than no answer at all (CONCEPT.md section 4). Somebody skimming this screen has
 * to be unable to mistake it for the panel above it, even without reading a word.
 */
export function Stage3({ corpus, claim }: { corpus: Scanned[]; claim: string }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<Coverage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // One flat list for the models, and the way back for the display: a paragraph has to be
  // reported as paragraph i of the statement it came from, not of the pile.
  const flat = corpus.flatMap((s) =>
    s.texts.map((text, index) => ({ root: s.root, index, text, total: s.texts.length })),
  );

  async function measure() {
    setRunning(true);
    setError(null);
    try {
      setResult(await coverage(flat.map((f) => f.text), claim, setProgress));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  if (flat.length === 0) return null;

  return (
    <section
      className="hatched mt-6 border border-dashed"
      style={{ borderColor: "var(--measure)", borderWidth: "1.5px" }}
    >
      <header className="px-6 py-4 sm:px-8">
        <h3 className="font-ui text-sm font-semibold tracking-wide uppercase" style={{ color: "var(--measure)" }}>
          Stage 3 · a measurement, not a proof
        </h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          Word for word, this quote is in none of these {flat.length} paragraphs. It can still be a
          translation or a paraphrase. Stage 3 measures whether the claim is <em>covered</em> by a
          paragraph — and it can be wrong.
        </p>
      </header>

      <div className="px-6 pb-7 sm:px-8">
        {!result && !running && (
          <button
            onClick={measure}
            className="border px-6 py-3 text-sm font-medium tracking-wide"
            style={{ borderColor: "var(--measure)", color: "var(--measure)" }}
          >
            Measure coverage
          </button>
        )}

        {!result && !running && (
          <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--ink-faint)" }}>
            Downloads about 400 MB of models the first time and runs them in your browser. Nothing
            is uploaded. Nothing was downloaded before you asked.
          </p>
        )}

        {running && <Meter progress={progress} />}

        {error && (
          <p className="mt-4 text-sm" style={{ color: "var(--alarm)" }}>
            The measurement did not run: {error}
          </p>
        )}

        {result && <Measurement result={result} flat={flat} />}
      </div>
    </section>
  );
}

const PHASES: Record<Progress["phase"], string> = {
  loading: "Downloading the models",
  embedding: "Reading the paragraphs",
  judging: "Checking coverage",
};

function Meter({ progress }: { progress: Progress | null }) {
  const pct = progress?.fraction === null || progress === null ? null : Math.round(progress.fraction * 100);
  return (
    <div className="max-w-md">
      <p className="eyebrow">{progress ? PHASES[progress.phase] : "Starting"}</p>
      <div className="mt-2 h-1.5 w-full" style={{ background: "var(--rule)" }}>
        <div
          className="h-full transition-[width] duration-200"
          style={{ width: pct === null ? "20%" : `${pct}%`, background: "var(--measure)" }}
        />
      </div>
      <p className="mt-2 font-mono text-xs" style={{ color: "var(--ink-faint)" }}>
        {progress?.detail ?? ""} {pct !== null && `· ${pct}%`}
      </p>
    </div>
  );
}

function Measurement({
  result,
  flat,
}: {
  result: Coverage;
  flat: { root: `0x${string}`; index: number; text: string; total: number }[];
}) {
  // The value check needs no model and no threshold, so it is reported as its own kind of
  // answer rather than as a low score. A reader can check this one by hand.
  if (result.kind === "guarded") {
    const where = flat[result.index];
    return (
      <div className="rise">
        <Claim>Not measured. The quote asserts something the text never says.</Claim>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          The closest paragraph does not mention{" "}
          {result.blocked.map(describeToken).join(", ")}. A value the text never states cannot be
          covered by it, however alike the two read — so no model was asked.
        </p>
        <Paragraph text={where.text} index={where.index} total={where.total} />
      </div>
    );
  }

  const { best } = result;
  const where = flat[best.index];
  const percent = Math.round(best.entail * 100);

  return (
    <div className="rise">
      <Claim>
        {result.kind === "covered"
          ? `Paragraph ${where.index + 1} of ${where.total} covers this claim to ${percent} %.`
          : `Paragraph ${where.index + 1} of ${where.total} is about the same thing but does not cover the claim (${percent} %).`}
      </Claim>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        {percent} % does <strong>not</strong> mean &ldquo;{percent} % true&rdquo;. It means: in the
        16-case test set behind this threshold, no distorted quote reached this value. Sixteen cases
        are a signal, not a validation, and Spanish is measurably weaker than English.
      </p>

      <Paragraph text={where.text} index={where.index} total={where.total} />

      <dl className="mt-6 space-y-2 border-t pt-4 text-xs" style={{ borderColor: "var(--rule)" }}>
        <Row label="Coverage" value={`${best.entail.toFixed(4)} entailment · threshold ${THRESHOLD}`} />
        <Row label="Contradiction" value={best.contra.toFixed(4)} />
        <Row label="Models" value={`${EMBED_MODEL} → ${NLI_MODEL}`} />
        <Row label="Ran" value="in this browser tab" />
      </dl>
    </div>
  );
}

function Claim({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-lg leading-snug" style={{ color: "var(--ink)" }}>
      {children}
    </p>
  );
}

function Paragraph({ text, index, total }: { text: string; index: number; total: number }) {
  return (
    <figure className="mt-5">
      <figcaption className="eyebrow">
        Paragraph {index + 1} of {total}, in full
      </figcaption>
      <blockquote
        className="mt-2 border-l-2 border-dashed pl-5 font-display text-base leading-relaxed"
        style={{ borderColor: "var(--measure)" }}
      >
        {text}
      </blockquote>
    </figure>
  );
}

/** "n:40" and "t:m" are internal. A reader gets told what was actually missing. */
function describeToken(token: string): string {
  const [kind, value] = token.split(":");
  if (kind === "n") return `the number ${value}`;
  if (value === "m") return "a male form of address";
  if (value === "f") return "a female form of address";
  return `the title "${value}"`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-4">
      <dt className="eyebrow w-28 shrink-0">{label}</dt>
      <dd className="min-w-0 flex-1 font-mono break-all" style={{ color: "var(--ink-soft)" }}>
        {value}
      </dd>
    </div>
  );
}
