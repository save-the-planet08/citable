/**
 * The position, drawn.
 *
 * "Paragraph 3 of 87" is the one claim this whole project exists to make, so it gets a
 * picture rather than a sentence: one tick per paragraph, in order, with the matched one
 * standing full height. You see at a glance whether a quote comes from the opening, the
 * middle, or somewhere buried near the end — which is exactly the context a quote loses
 * when it is lifted out of a text.
 *
 * The n here comes from the bundle, which verifyBundle held against the root. It is never
 * the contract's segmentCount, which is an unverified claim by the author.
 */
export function PositionComb({
  index,
  total,
  tone = "seal",
}: {
  index: number;
  total: number;
  tone?: "seal" | "amber";
}) {
  const colour = tone === "seal" ? "var(--seal)" : "var(--amber)";

  // Above a few hundred paragraphs individual ticks stop being readable. Then the comb
  // becomes a rule with a single marker — same information, still honest.
  const dense = total > 240;

  return (
    <figure className="m-0">
      <div
        className="flex items-end gap-px h-10 border-b"
        style={{ borderColor: "var(--rule-strong)" }}
        role="img"
        aria-label={`Paragraph ${index + 1} of ${total}`}
      >
        {dense ? (
          <div className="relative w-full h-full">
            <div
              className="absolute bottom-0 h-2 w-full"
              style={{ background: "var(--rule)" }}
            />
            <div
              className="absolute bottom-0 w-0.5 h-full"
              style={{ background: colour, left: `${(index / (total - 1 || 1)) * 100}%` }}
            />
          </div>
        ) : (
          Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className="flex-1 min-w-px"
              style={{
                height: i === index ? "100%" : "35%",
                background: i === index ? colour : "var(--rule)",
              }}
            />
          ))
        )}
      </div>
      <figcaption className="mt-2 flex items-baseline justify-between">
        <span className="eyebrow">Position in the statement</span>
        <span className="font-mono text-sm" style={{ color: colour }}>
          {index + 1}
          <span style={{ color: "var(--ink-faint)" }}> / {total}</span>
        </span>
      </figcaption>
    </figure>
  );
}
