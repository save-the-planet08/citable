"use client";

import { useEffect, useRef, useState } from "react";

/**
 * How a proof holds — the merkle tree, drawn in the order it is actually built.
 *
 * The motion is the mechanism and not decoration. A tree is computed from the leaves
 * upward: paragraphs become leaves, leaves are hashed in pairs, pairs into pairs, until
 * one value is left. Drawing it in that order, tied to the scroll, is the only animation
 * this section could honestly have. Anything else here would be movement for its own sake.
 *
 * Scroll progress drives it directly, with no easing: eased scrubbing feels rubbery, and
 * rubbery is how a scroll animation announces that it is ornament.
 *
 * Under prefers-reduced-motion the tree is simply drawn. The section loses nothing —
 * it was never about the drawing, it was about the shape.
 */

const LEAVES = 7;
const VIEW_W = 640;
const VIEW_H = 260;
const LEAF_Y = 214;
const LEVEL_H = 54;

interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** 0..1 — where in the build this stroke appears. */
  at: number;
  spine?: boolean;
}

/** The same pairing the client library does, including how an odd node is carried up. */
function buildSegments(): { segs: Seg[]; root: { x: number; y: number }; levels: number } {
  const pad = 30;
  const span = (VIEW_W - pad * 2) / (LEAVES - 1);
  const segs: Seg[] = [];

  let nodes = Array.from({ length: LEAVES }, (_, i) => ({ x: pad + i * span, y: LEAF_Y - 18 }));
  for (let i = 0; i < LEAVES; i++) {
    segs.push({ x1: nodes[i].x, y1: LEAF_Y, x2: nodes[i].x, y2: LEAF_Y - 18, at: 0 });
  }

  let level = 1;
  const steps: Seg[][] = [];
  while (nodes.length > 1) {
    const step: Seg[] = [];
    const next: { x: number; y: number }[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const y = LEAF_Y - 18 - level * LEVEL_H;
      if (!b) {
        step.push({ x1: a.x, y1: a.y, x2: a.x, y2: y, at: 0 });
        next.push({ x: a.x, y });
        continue;
      }
      step.push({ x1: a.x, y1: a.y, x2: a.x, y2: y, at: 0 });
      step.push({ x1: b.x, y1: b.y, x2: b.x, y2: y, at: 0 });
      step.push({ x1: a.x, y1: y, x2: b.x, y2: y, at: 0, spine: nodes.length <= 2 });
      next.push({ x: (a.x + b.x) / 2, y });
    }
    steps.push(step);
    nodes = next;
    level++;
  }

  const total = steps.length + 1;
  segs.forEach((s) => (s.at = 0));
  steps.forEach((step, i) => {
    step.forEach((s) => {
      s.at = (i + 1) / total;
      segs.push(s);
    });
  });

  return { segs, root: nodes[0], levels: total };
}

const { segs, root, levels } = buildSegments();
const LEAF_XS = segs.slice(0, LEAVES).map((s) => s.x1);

export function HowItHolds() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    const update = () => {
      frame = 0;
      if (still) {
        setProgress(1);
        return;
      }
      const r = node.getBoundingClientRect();
      // 0 when the figure's top reaches 80% of the viewport, 1 when it reaches 35%.
      const span = window.innerHeight * 0.45;
      const p = (window.innerHeight * 0.8 - r.top) / span;
      setProgress(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Never synchronously during the effect: the first measurement waits a frame, which is
    // also when layout is actually settled enough to measure.
    onScroll();
    if (still) return () => cancelAnimationFrame(frame);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section id="how" className="mt-32 scroll-mt-6 sm:mt-40">
      <p className="eyebrow">How a proof holds</p>
      <h2 className="mt-3 max-w-[22ch] font-display text-[clamp(1.75rem,3.4vw,2.6rem)] leading-[1.08] text-balance">
        Seven paragraphs go in. Thirty-two bytes come out.
      </h2>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
        <figure ref={ref} className="m-0">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="w-full"
            role="img"
            aria-label="Seven leaves hashed in pairs up to a single root"
          >
            {segs.map((s, i) => {
              const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
              // Each level owns one slice of the scroll, so a stroke starting at `at`
              // finishes within 1/levels of it. Deriving the window from the last stroke's
              // start instead left the final pair permanently half-drawn — the root sat
              // above a line that never reached its right-hand child.
              const local = Math.min(1, Math.max(0, (progress - s.at) * levels * 1.35));
              return (
                <line
                  key={i}
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke={s.spine ? "var(--seal)" : i < LEAVES ? "var(--ink-soft)" : "var(--rule-strong)"}
                  strokeWidth={s.spine || i < LEAVES ? 1.5 : 1}
                  strokeDasharray={len}
                  strokeDashoffset={len * (1 - local)}
                />
              );
            })}

            {LEAF_XS.map((x, i) => (
              <text
                key={i}
                x={x}
                y={LEAF_Y + 16}
                textAnchor="middle"
                className="font-mono"
                fontSize="10"
                fill="var(--ink-faint)"
                opacity={progress > 0 ? 1 : 0}
              >
                {i + 1}
              </text>
            ))}

            <g opacity={progress > 0.92 ? 1 : 0} style={{ transition: "opacity 200ms" }}>
              <line x1={root.x} y1={root.y} x2={root.x} y2={root.y - 20} stroke="var(--seal)" strokeWidth={1.5} />
              <rect x={root.x - 5} y={root.y - 30} width={10} height={10} fill="var(--seal)" />
              <text x={root.x + 14} y={root.y - 21} className="font-mono" fontSize="10" fill="var(--seal)" letterSpacing="0.08em">
                ROOT
              </text>
            </g>
          </svg>
          <figcaption className="mt-3 flex justify-between border-t pt-2 text-xs" style={{ borderColor: "var(--rule)", color: "var(--ink-faint)" }}>
            <span>Seven paragraphs</span>
            <span>one root · <span className="font-mono">0xa2ea6730…</span></span>
          </figcaption>
        </figure>

        <div className="space-y-5 text-[1.0625rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          <p>
            Each paragraph is hashed together with <em>its index</em>, so a leaf says both what
            was written and where. Pairs are hashed into pairs until one value is left. That
            value is what goes on chain.
          </p>
          <p>
            A quote comes back with the short path from its leaf to the root. The contract
            recomputes the path and either arrives at the registered root or does not. It never
            sees the text, and it never has to.
          </p>
          <p>
            Move a paragraph and the leaf changes, because the index is inside it. Sorted
            sibling pairs would otherwise prove membership without proving position — and
            position is the whole claim.
          </p>
          <p className="pt-1 text-sm" style={{ color: "var(--ink-faint)" }}>
            The number of leaves cannot be recovered from a root. So &ldquo;paragraph 5 of 7&rdquo;
            takes its 7 from the bundle, which was itself checked against the root — never from
            the count the author wrote on chain.
          </p>
        </div>
      </div>
    </section>
  );
}
