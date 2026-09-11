/**
 * What this cannot do.
 *
 * The one section on the page with no motion at all, and that is the design decision, not
 * an omission. Every other section earns its animation by explaining a mechanism. Here the
 * content is an admission, and an admission that slides in on scroll is being sold. The
 * stillness is the tone.
 *
 * It is also not a client component, because there is nothing to run.
 */

const LIMITS: [string, string][] = [
  [
    "Not registered is not invented",
    "An absence says something about this registry and nothing about the world. That is why the screen never answers a plain no — it names how many statements and how many paragraphs it actually read.",
  ],
  [
    "Stage 3 is a measurement",
    "Sixteen test cases are a signal, not a validation. Spanish scores measurably worse than English and would be rejected at the threshold. Irony and quote-within-quote are not handled at all.",
  ],
  [
    "A proof is about position, not truth",
    "That a paragraph stood where it stood says nothing about whether it was right. Citable can show you were quoted accurately. It cannot show you were correct.",
  ],
  [
    "Whoever registers a text first holds it",
    "Identical text gives an identical root, so someone can register another author's words before they do. Documented, not solved.",
  ],
  [
    "The registry owner can switch the name check off",
    "A known central point. It cannot alter statements already recorded and no proof depends on it — but it is there, and pretending otherwise would be the same trick this project exists to expose.",
  ],
  [
    "The cold start problem is unsolved",
    "A register of quotations is worth what is in it. Nothing here fixes that, and no hackathon project does.",
  ],
];

export function Limits() {
  return (
    <section className="mt-32 sm:mt-44">
      <p className="eyebrow">What this cannot do</p>
      <h2 className="mt-4 max-w-[26ch] font-display text-[clamp(1.75rem,3.4vw,2.6rem)] leading-[1.08] text-balance">
        The limits are part of the instrument.
      </h2>
      <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        A measuring instrument that hides its error bars is not a measuring instrument.
      </p>

      {/* Set as a definition list, not a grid of cards: six equal boxes read as a feature
          table, and this is the opposite of a feature table. */}
      <dl className="mt-12">
        {LIMITS.map(([title, body]) => (
          <div
            key={title}
            className="grid gap-y-2 border-t py-6 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.65fr)] sm:gap-x-12"
            style={{ borderColor: "var(--rule)" }}
          >
            <dt className="font-display text-[1.2rem] leading-snug" style={{ color: "var(--ink)" }}>
              {title}
            </dt>
            <dd
              className="max-w-[62ch] text-[1.0625rem] leading-relaxed"
              style={{ color: "var(--ink-soft)" }}
            >
              {body}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
