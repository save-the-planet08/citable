/**
 * The thesis, and the one dark band on the page.
 *
 * A chain answers yes or no. That is not a limitation to be apologised for — it is what
 * proof means, and a hash has no degrees. But quotation in the world is mostly grey:
 * translated, shortened, turned around. A system that can only answer yes or no tells a
 * perfectly faithful translation that it was not found.
 *
 * So the grey is measured somewhere the chain cannot reach and does not need to: on the
 * reader's own machine. That is the move. A softer answer normally costs a trusted party —
 * somebody has to compute the number and vouch for it — and a model running locally costs
 * nobody, because the reader computed it and can run it again.
 *
 * Still, and inverted, used once. Two columns that differ in material as well as in colour:
 * the chain's side is solid, the measurement's side is hatched behind a dashed rule, the
 * same way stage 1 and stage 3 differ everywhere else on the page.
 */

const SIDES = [
  {
    label: "On chain",
    kind: "Proof",
    question: "Is this leaf in this tree, at this index?",
    answer: "Yes or no",
    answerNote: "Nothing in between, ever.",
    rows: [
      ["Where", "A contract on Sepolia recomputes it. Thirty-two bytes decide."],
      ["Who has to be trusted", "Nobody. It is arithmetic, and you can redo it."],
      ["Why it cannot be softer", "A hash has no degrees. Change one character and the root is not nearly right — it is unrelated."],
    ],
  },
  {
    label: "In your browser",
    kind: "Measurement",
    question: "Does this text carry this claim?",
    answer: "A number",
    answerNote: "Between 0 and 1, with its error bars in the open.",
    rows: [
      ["Where", "A 400 MB model downloaded to your machine. The query never leaves it."],
      ["Who has to be trusted", "Nobody. Nobody is asserting the number to you — you computed it, and you can compute it again."],
      ["Why it may be softer", "Because it costs no trust. A percentage from a server would need somebody to vouch for it. This one does not."],
    ],
  },
] as const;

export function BinaryAndGrey() {
  return (
    <section className="mt-32 sm:mt-44">
      <div
        className="px-6 py-14 sm:px-12 sm:py-20"
        style={{ background: "var(--seal)", color: "var(--paper)" }}
      >
        <p className="eyebrow" style={{ color: "color-mix(in srgb, var(--paper) 62%, transparent)" }}>
          What is actually new here
        </p>
        <h2 className="mt-4 max-w-[16ch] font-display text-[clamp(1.9rem,4vw,3.1rem)] leading-[1.05]">
          A chain can only say yes or no.
        </h2>
        <p
          className="mt-6 max-w-[62ch] text-[clamp(1.0625rem,1.4vw,1.2rem)] leading-relaxed"
          style={{ color: "color-mix(in srgb, var(--paper) 82%, transparent)" }}
        >
          Quotation is mostly grey. Translated, shortened, turned around — and a register
          that can only answer yes or no tells a perfectly faithful translation it was never
          said. So the grey gets measured somewhere the chain cannot reach and does not need
          to: on the reader’s own machine.
        </p>

        <div className="mt-14 grid gap-px sm:grid-cols-2" style={{ background: "color-mix(in srgb, var(--paper) 28%, transparent)" }}>
          {SIDES.map((side, i) => (
            <div
              key={side.label}
              className={`px-6 py-8 sm:px-9 sm:py-10 ${i === 1 ? "hatched-invert" : ""}`}
              style={{
                background: "var(--seal)",
                border: i === 1 ? "1px dashed color-mix(in srgb, var(--paper) 55%, transparent)" : "none",
              }}
            >
              <p className="ui text-[12px] font-semibold tracking-[0.14em] uppercase">
                {side.label}
              </p>
              <p
                className="ui mt-1 text-[12px] tracking-[0.14em] uppercase"
                style={{ color: "color-mix(in srgb, var(--paper) 55%, transparent)" }}
              >
                {side.kind}
              </p>

              <p className="mt-7 font-display text-[1.3rem] leading-snug">{side.question}</p>

              <p className="mt-6 font-display text-[clamp(2rem,3.4vw,2.8rem)] leading-none">
                {side.answer}
              </p>
              <p
                className="ui mt-2 text-[13px]"
                style={{ color: "color-mix(in srgb, var(--paper) 70%, transparent)" }}
              >
                {side.answerNote}
              </p>

              <dl className="mt-9 space-y-5">
                {side.rows.map(([term, body]) => (
                  <div key={term}>
                    <dt
                      className="ui text-[11.5px] tracking-[0.13em] uppercase"
                      style={{ color: "color-mix(in srgb, var(--paper) 55%, transparent)" }}
                    >
                      {term}
                    </dt>
                    <dd
                      className="ui mt-1 text-[14px] leading-relaxed"
                      style={{ color: "color-mix(in srgb, var(--paper) 88%, transparent)" }}
                    >
                      {body}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <p className="mt-12 max-w-[64ch] font-display text-[clamp(1.15rem,1.9vw,1.5rem)] leading-snug">
          The percentage is never written back. No score goes on chain, because a chain that
          stores an opinion has stopped being a record — and the moment a measurement is
          sealed, somebody has to be trusted for it.
        </p>
        <p
          className="ui mt-5 max-w-[64ch] text-[13.5px] leading-relaxed"
          style={{ color: "color-mix(in srgb, var(--paper) 68%, transparent)" }}
        >
          The two answers never mix. Stage 1 is a fact and is drawn as one — solid, sealed.
          Stage 3 is a measurement and is drawn as one — hatched, dashed, with a number that
          is always beside the model that produced it. The next section is that measurement
          being run, failures included.
        </p>
      </div>
    </section>
  );
}
