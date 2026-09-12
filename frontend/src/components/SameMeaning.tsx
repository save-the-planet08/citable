/**
 * The case this whole third stage exists for: a quotation whose words have changed and
 * whose meaning has not.
 *
 * Told rather than shown is not enough here — "it also handles paraphrases" is what every
 * such tool claims. So one registered paragraph is put on the page and five real queries
 * are put to it, with the numbers that were actually measured, including the one it gets
 * wrong. Every figure below is in CONCEPT.md or WALKTHROUGH.md; none is illustrative.
 *
 * No motion. The section is a table of results, and results that slide in are being sold.
 */

const PARAGRAPH = "Im vergangenen Quartal stieg der Umsatz um vier Prozent.";

type Tone = "seal" | "measure" | "amber" | "alarm";

const TONE: Record<Tone, { color: string; tint?: string; hatched?: boolean }> = {
  seal: { color: "var(--seal)", tint: "var(--seal-tint)" },
  measure: { color: "var(--measure)", hatched: true },
  amber: { color: "var(--amber)", hatched: true },
  alarm: { color: "var(--alarm)" },
};

const QUERIES: {
  query: string;
  how: string;
  verdict: string;
  score?: string;
  tone: Tone;
  why: string;
}[] = [
  {
    query: "Im vergangenen Quartal stieg der Umsatz um vier Prozent.",
    how: "The paragraph itself",
    verdict: "Proven",
    tone: "seal",
    why: "Stage 1. The leaf and its path go to the contract, which recomputes them. No model is involved and none is needed.",
  },
  {
    query: "Revenue rose by four percent last quarter.",
    how: "English",
    verdict: "Covered",
    score: "83 %",
    tone: "measure",
    why: "Stage 3. Not one character matches, so stages 1 and 2 find nothing. The entailment model puts coverage at 0.8253 against paragraph 3 of 6.",
  },
  {
    query: "Los ingresos aumentaron un cuatro por ciento el trimestre pasado.",
    how: "Spanish",
    verdict: "Not covered",
    score: "56 %",
    tone: "amber",
    why: "The same sentence in Spanish scores 0.562 and falls below the 0.80 threshold. A correct quotation refused — the failure is real, and it is on the page rather than behind it.",
  },
  {
    query: "Im vergangenen Quartal stieg der Umsatz um vierzig Prozent.",
    how: "One word changed: forty instead of four",
    verdict: "Not scored at all",
    tone: "alarm",
    why: "The value check reads 40 in a claim about a paragraph that says four, and the model never sees the pair. Deterministic, no model, checkable by hand — and it normalises value rather than spelling, so four, vier and cuatro are the same number.",
  },
  {
    query: "Roth hat zugegeben, dass die Zahlen manipuliert wurden.",
    how: "An admission that was never made",
    verdict: "Not covered",
    score: "9 %",
    tone: "alarm",
    why: "A question in the text turned into a confession. Entailment asks whether the text carries the claim, and this text does not.",
  },
];

export function SameMeaning() {
  return (
    <section id="coverage" className="mt-32 scroll-mt-6 sm:mt-44">
      <p className="eyebrow">The case this was built for</p>
      <h2 className="mt-4 max-w-[22ch] font-display text-[clamp(1.75rem,3.4vw,2.6rem)] leading-[1.08] text-balance">
        The words change. The meaning does not.
      </h2>
      <p className="mt-5 max-w-[60ch] text-[1.0625rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        A German sentence quoted in an English paper shares no characters with its source.
        A word-for-word proof has nothing to compare. That is where most of this problem
        actually lives, and it is the reason stage 3 exists.
      </p>

      {/* The text everything below is asked about. */}
      <figure
        className="mt-10 border-l-4 border-y border-r px-6 py-6 sm:px-8"
        style={{ borderColor: "var(--rule-strong)", borderLeftColor: "var(--seal)", background: "#ffffff" }}
      >
        <figcaption className="eyebrow">
          Registered · wochenzeitung.eth · paragraph 3 of 6
        </figcaption>
        <blockquote className="mt-3 font-display text-[clamp(1.15rem,2vw,1.5rem)] leading-snug" lang="de">
          {PARAGRAPH}
        </blockquote>
      </figure>

      <p className="ui mt-10 text-[12px] tracking-[0.13em] uppercase" style={{ color: "var(--ink-faint)" }}>
        Five things asked of it
      </p>

      <ol className="m-0 mt-4 list-none space-y-px p-0">
        {QUERIES.map((q) => {
          const tone = TONE[q.tone];
          return (
            <li
              key={q.query}
              className={`grid gap-x-10 gap-y-3 border-t py-7 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] ${
                tone.hatched ? "hatched" : ""
              }`}
              style={{ borderColor: "var(--rule)" }}
            >
              <div>
                <p className="ui text-[12px] tracking-[0.1em] uppercase" style={{ color: "var(--ink-faint)" }}>
                  {q.how}
                </p>
                <p className="mt-2 font-display text-[1.15rem] leading-snug">{q.query}</p>
              </div>

              <div>
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span
                    className={`ui inline-block px-3 py-1 text-[11.5px] font-semibold tracking-[0.1em] uppercase ${
                      tone.hatched ? "border-dashed" : ""
                    }`}
                    style={{
                      border: `1.5px solid ${tone.color}`,
                      background: tone.tint ?? "transparent",
                      color: tone.color,
                    }}
                  >
                    {q.verdict}
                  </span>
                  {q.score && (
                    <span className="font-mono text-[1.1rem]" style={{ color: tone.color }}>
                      {q.score}
                    </span>
                  )}
                </p>
                <p className="ui mt-3 text-[13.5px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                  {q.why}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* The measurement that decided the design. Without it, stage 3 would be a similarity
          score — and a similarity score would have confirmed the disinformation. */}
      <div
        className="mt-12 border-t-2 pt-7"
        style={{ borderColor: "var(--alarm)" }}
      >
        <p className="eyebrow" style={{ color: "var(--alarm)" }}>
          Why it is not a similarity score
        </p>
        <p className="mt-4 max-w-[60ch] font-display text-[clamp(1.15rem,1.9vw,1.45rem)] leading-snug">
          Measured against the paragraph <span lang="de">“Wurden die Zahlen manipuliert?”</span>,
          the invented confession scored{" "}
          <span className="font-mono" style={{ color: "var(--alarm)" }}>
            0.880
          </span>{" "}
          on plain similarity — <em className="italic">higher</em> than a correct English
          translation of that same paragraph, at{" "}
          <span className="font-mono">0.877</span>.
        </p>
        <p className="mt-5 max-w-[62ch] text-[1.0625rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          Similarity measures what a sentence is about. A question and an accusation are
          about the same thing. Entailment asks something else — is this claim carried by
          this text — and that is the only question worth answering here. The percentage is
          the entailment value, and it means that no distorted quotation in the test set
          reached it. It does not mean the claim is that likely to be true.
        </p>
        <p className="ui mt-5 text-[12.5px]" style={{ color: "var(--ink-faint)" }}>
          mDeBERTa-v3-base-xnli, threshold 0.80, run in your browser. The model identifier
          travels with every figure — another model gives another number. Sixteen test cases
          are a signal, not a validation.
        </p>
      </div>
    </section>
  );
}
