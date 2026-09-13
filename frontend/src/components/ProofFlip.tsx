"use client";

import { useEffect, useRef, useState } from "react";
import { MISQUOTES } from "@/lib/misquotes";

/**
 * The one moment in the hero.
 *
 * A quotation card that nobody can check is stamped NEVER SAID and replaced, in the same
 * place, by one anybody can check. It is the headline made literal — anyone can invent a
 * quotation, now you can prove you didn't — and it takes about five seconds, most of which
 * is the pause that lets the refutation be read.
 *
 * The forgery is real and documented: the words are not Einstein's, the earliest trace is
 * 1981, and he died in 1955. Inventing one for a page about quoting accurately would settle
 * the argument against us.
 *
 * The animation is CSS with delays — nothing here blocks paint. The only script is the
 * observer that starts it again when the hero comes back into view, so a visitor who scrolls
 * up sees it a second time rather than a still they have to reconstruct.
 */

const FAKE = MISQUOTES[0];

const RECORD = {
  passage:
    "…that government of the people, by the people, for the people, shall not perish from the earth.",
  name: "frederik.eth",
  index: 4,
  total: 4,
};

export function ProofFlip() {
  const box = useRef<HTMLDivElement>(null);
  const inView = useRef(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const node = box.current;
    if (!node) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const watcher = new IntersectionObserver(
      ([entry]) => {
        // Only on the way in. The two cards are different heights, so the swap resizes the
        // box — without this the resize would re-trigger the observer and the moment would
        // restart forever.
        if (entry.isIntersecting === inView.current) return;
        inView.current = entry.isIntersecting;
        if (entry.isIntersecting) setRun((n) => n + 1);
      },
      { threshold: 0.6 },
    );
    watcher.observe(node);
    return () => watcher.disconnect();
  }, []);

  return (
    <div ref={box}>
      {/* Remounting on re-entry is what restarts the CSS delays. */}
      <div key={run} className="moment grid">
        {/* ---- the quotation nobody can check ---- */}
        <div
          className="m-fake border px-7 py-7 sm:px-9 sm:py-9"
          style={{ borderColor: "var(--rule-strong)", background: "#ffffff" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="block size-9 shrink-0 rounded-full border"
              style={{ borderColor: "var(--rule-strong)" }}
            />
            <span className="block">
              <span className="block h-2 w-24 rounded-full" style={{ background: "#c9ccc3" }} />
              <span className="mt-1.5 block h-2 w-14 rounded-full" style={{ background: "#dcdfd7" }} />
            </span>
          </div>

          <blockquote className="mt-5 font-display text-[clamp(1.1rem,1.5vw,1.3rem)] leading-snug">
            {FAKE.lines.join(" ")}
          </blockquote>
          <p className="ui mt-4 text-[12px] tracking-[0.12em]" style={{ color: "var(--ink-faint)" }}>
            — {FAKE.who}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span
              className="m-stamp ui inline-block border-2 px-3 py-1.5 text-[13px] font-semibold tracking-[0.14em]"
              style={{ borderColor: "var(--alarm)", color: "var(--alarm)" }}
            >
              NEVER SAID
            </span>
            <span className="m-note ui text-[12.5px]" style={{ color: "var(--alarm)" }}>
              {FAKE.debunk}
            </span>
          </div>
        </div>

        {/* ---- the quotation anybody can check ---- */}
        <div
          className="m-record border-l-4 border-y border-r px-7 py-7 sm:px-9 sm:py-9"
          style={{
            borderColor: "var(--rule-strong)",
            borderLeftColor: "var(--seal)",
            background: "#ffffff",
          }}
        >
          <div className="flex items-start justify-between gap-6">
            <p className="eyebrow">Registered statement</p>
            <span
              className="m-seal ui shrink-0 border px-3 py-1 text-[11px] font-semibold tracking-[0.12em]"
              style={{ borderColor: "var(--seal)", color: "var(--seal)" }}
            >
              PROVEN
            </span>
          </div>

          <blockquote className="mt-5 font-display text-[clamp(1.1rem,1.5vw,1.3rem)] leading-snug">
            “{RECORD.passage}”
          </blockquote>

          {/* The position is what a quotation loses when it is lifted out. */}
          <div className="mt-7 flex gap-1.5">
            {Array.from({ length: RECORD.total }, (_, i) => {
              const here = i === RECORD.index - 1;
              return (
                <span
                  key={i}
                  className="ui flex-1 py-2 text-center text-[12px] font-medium"
                  style={{
                    background: here ? "var(--seal)" : "transparent",
                    border: `1px solid ${here ? "var(--seal)" : "var(--rule)"}`,
                    color: here ? "var(--paper-raised)" : "var(--ink-faint)",
                  }}
                >
                  {i + 1}
                </span>
              );
            })}
          </div>
          <p className="ui mt-2 text-[12px] tracking-[0.1em] uppercase" style={{ color: "var(--ink-faint)" }}>
            Paragraph {RECORD.index} of {RECORD.total}
          </p>

          <p
            className="ui mt-6 border-t pt-4 text-[13px] leading-relaxed"
            style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}
          >
            Published under <span className="font-mono">{RECORD.name}</span> on Sepolia. Anyone
            can rebuild this from the bundle and check it against the chain.
          </p>
        </div>
      </div>

      <p className="ui mt-3 text-[12.5px]" style={{ color: "var(--ink-faint)" }}>
        Proves the paragraph and where it stood — not that the statement is true.
      </p>
    </div>
  );
}
