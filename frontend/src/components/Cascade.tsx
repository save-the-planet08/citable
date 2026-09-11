"use client";

/**
 * The cascade — one fragment, three possible answers, and they are not the same kind of
 * answer.
 *
 * This is the turning point of the page, so it gets the strongest motion: the claim stands
 * still while the evidence passes it. That is what a pin is for, and here the content asks
 * for it literally — the sentence on the left stays true through all three panels, and the
 * panels are what change.
 *
 * It is `position: sticky`, not a scroll library. Two motions on this page did not justify
 * seventy kilobytes of animation runtime, and sticky needs no JavaScript, survives a
 * resize, and degrades to a normal two-column layout wherever it is not supported.
 *
 * The three panels differ in material, not only in hue, and that difference is the
 * argument: a measurement must not be able to pass for a proof at a glance. Stage 1 is
 * filled and sealed, stage 2 is outlined, stage 3 is hatched behind a dashed border.
 */
export function Cascade() {
  return (
    <section className="mt-28 sm:mt-36">
      <p className="eyebrow">What an answer can be</p>
      <h2 className="mt-3 max-w-[24ch] font-display text-[clamp(1.5rem,3vw,2.1rem)] leading-tight text-balance">
        Three answers, and only two of them are facts.
      </h2>

      <div className="mt-10 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            A quote is checked in one direction only: word for word first, and the softer
            tests come after, each one weaker and each one labelled as such.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Nothing here upgrades a guess into a proof. The screen never shows a percentage
            that looks like a seal, because a percentage that looks like a seal does more
            damage than no answer at all.
          </p>
        </div>

        <ol className="m-0 list-none space-y-5 p-0">
          <Stage
            n={1}
            name="Proven"
            claim="This paragraph stood at this position, word for word."
            how="The fragment is a whole paragraph. Its leaf and the path to the root go to the contract, which recomputes them."
            what="A fact. Mathematics, checked on chain, with no trusted party anywhere in it."
            style={{
              background: "var(--seal-tint)",
              borderColor: "var(--seal)",
              color: "var(--seal)",
            }}
          />
          <Stage
            n={2}
            name="Part of a paragraph"
            claim="The fragment is in the text, but it is not the whole paragraph."
            how="A literal substring match inside a paragraph the bundle already held against the root."
            what="Also a fact — and a warning. A shortened quote can be accurate and still mislead, so the rest of the paragraph is shown beside it."
            style={{ borderColor: "var(--amber)", color: "var(--amber)" }}
          />
          <Stage
            n={3}
            name="Covered"
            claim="Paragraph 3 covers this claim to 83 %."
            how="Embeddings shortlist three paragraphs, a value check drops any that assert a number or an actor the text never mentions, and an entailment model scores what is left."
            what="A measurement, and it can be wrong. 83 % does not mean 83 % true — it means no distorted quote in the test set behind the threshold reached this value."
            hatched
            style={{ borderColor: "var(--measure)", color: "var(--measure)" }}
          />
        </ol>
      </div>
    </section>
  );
}

function Stage({
  n,
  name,
  claim,
  how,
  what,
  style,
  hatched,
}: {
  n: number;
  name: string;
  claim: string;
  how: string;
  what: string;
  style: React.CSSProperties;
  hatched?: boolean;
}) {
  return (
    <li
      className={`border p-6 sm:p-7 ${hatched ? "hatched border-dashed" : ""}`}
      style={{ ...style, borderWidth: hatched ? "1.5px" : "1px" }}
    >
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-mono text-xs" style={{ color: "inherit" }}>
          Stage {n}
        </span>
        <h3 className="font-ui text-sm font-semibold tracking-wide uppercase" style={{ color: "inherit" }}>
          {name}
        </h3>
      </div>
      <p className="mt-2 font-display text-lg leading-snug" style={{ color: "var(--ink)" }}>
        {claim}
      </p>
      <dl className="mt-4 space-y-2 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        <div>
          <dt className="eyebrow">How</dt>
          <dd className="mt-0.5">{how}</dd>
        </div>
        <div>
          <dt className="eyebrow">What it is worth</dt>
          <dd className="mt-0.5">{what}</dd>
        </div>
      </dl>
    </li>
  );
}
