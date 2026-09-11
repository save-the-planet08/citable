"use client";

import { DEMO_NAME, DEMO_PARAGRAPHS, DEMO_HIT } from "@/lib/demo";

/**
 * The hero shows the product doing its one thing.
 *
 * Chosen out of the generable class rather than the copyable one: there is no image
 * library here, and a stock photo of someone at a laptop would say nothing about a
 * register of quotations. What can be drawn is the mechanism itself — a text being cut at
 * its blank lines, numbered, and one paragraph pointed at.
 *
 * The paragraphs are real. They are the statement registered on Sepolia under
 * wochenzeitung.eth, not filler, so the first thing a visitor sees is the actual contents
 * of the registry.
 *
 * One entrance, no scroll effect, and it is CSS only: the hero sits in the LCP path and
 * must not wait on a library. Under prefers-reduced-motion every rule below resolves to
 * the finished state — the cut lines drawn, the numbers visible, the position marked.
 */
export function Hero() {
  return (
    <section className="grid items-start gap-10 sm:gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16">
      <div>
        <p className="eyebrow">Citable · a register with position proofs</p>
        <h1 className="mt-5 font-display text-[clamp(1.85rem,3.4vw,2.65rem)] leading-[1.12] text-balance">
          Not <em className="text-[var(--ink-soft)]">is this quote real?</em>
          <span className="mt-1 block" style={{ color: "var(--seal)" }}>
            Here is the proof that I quoted correctly.
          </span>
        </h1>
        <p className="mt-6 max-w-[34ch] text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          A statement is cut at its blank lines. Every paragraph is bound to its position,
          and the position is exactly what a quote loses when it is lifted out of a text.
        </p>
      </div>

      <figure className="m-0">
        <div className="border" style={{ borderColor: "var(--rule)", background: "var(--paper-raised)" }}>
          <ol className="m-0 list-none p-0">
            {DEMO_PARAGRAPHS.map((text, i) => (
              <li
                key={i}
                className={`hero-row relative grid grid-cols-[2.25rem_1fr] py-3.5 pr-4 ${
                  i === DEMO_HIT ? "hero-hit" : ""
                }`}
                style={
                  {
                    "--cut-delay": `${0.12 * i + 0.15}s`,
                    "--mark-delay": `${0.12 * DEMO_PARAGRAPHS.length + 0.35}s`,
                  } as React.CSSProperties
                }
              >
                <span className="hero-num pt-1 pr-3 text-right font-mono text-[0.6875rem]">{i + 1}</span>
                <p className="m-0 font-display text-[15px] leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div
          className="mt-4 flex h-9 items-end gap-0.5 border-b"
          style={{ borderColor: "var(--rule-strong)" }}
          role="img"
          aria-label={`Paragraph ${DEMO_HIT + 1} of ${DEMO_PARAGRAPHS.length}`}
        >
          {DEMO_PARAGRAPHS.map((_, i) => (
            <span
              key={i}
              className="hero-tick flex-1"
              style={
                {
                  height: i === DEMO_HIT ? "100%" : "34%",
                  background: i === DEMO_HIT ? "var(--seal)" : "var(--rule)",
                  "--tick-delay": `${0.12 * DEMO_PARAGRAPHS.length + 0.5 + 0.05 * i}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <figcaption className="mt-2 flex items-baseline justify-between">
          <span className="eyebrow">Position in the statement</span>
          <span className="font-mono text-sm" style={{ color: "var(--seal)" }}>
            {DEMO_HIT + 1}
            <span style={{ color: "var(--ink-faint)" }}> / {DEMO_PARAGRAPHS.length}</span>
          </span>
        </figcaption>
        <p className="mt-3 text-xs" style={{ color: "var(--ink-faint)" }}>
          Registered on Sepolia under {DEMO_NAME}. Check it below.
        </p>
      </figure>
    </section>
  );
}
