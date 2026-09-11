"use client";

import { useEffect, useRef, useState } from "react";
import { mountImpact, type Impact } from "@/lib/impact";
import { MISQUOTES, SPREAD_STUDY } from "@/lib/misquotes";

/**
 * The first screen states the problem with a measured number and then destroys five
 * forgeries with it. The headline and the source line are plain markup and paint at once;
 * the field underneath is built after mount, so nothing in the LCP path waits on it.
 *
 * Under prefers-reduced-motion the field renders its finished state and the five
 * refutations are set as text instead — still, and complete.
 */
export function Hero() {
  const field = useRef<SVGSVGElement>(null);
  const scene = useRef<Impact | null>(null);
  const [ran, setRan] = useState(false);

  useEffect(() => {
    if (!field.current) return;
    scene.current = mountImpact(field.current);
    setRan(true);
    return () => {
      scene.current?.destroy();
      scene.current = null;
    };
  }, []);

  return (
    <section className="pb-2">
      <div className="mt-6 grid items-end gap-6 sm:mt-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <p className="eyebrow">The problem, measured</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,4.6vw,3.6rem)] leading-[1.06] tracking-[-0.012em] text-balance">
            A lie reaches 1,500 people{" "}
            <span style={{ color: "var(--alarm)" }}>six times faster</span> than the truth.
          </h1>
        </div>
        <p
          className="max-w-[46ch] border-t pt-3.5 text-[clamp(0.9375rem,1.15vw,1.0625rem)] leading-relaxed"
          style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}
        >
          The quotations below were{" "}
          <b className="font-medium" style={{ color: "var(--ink)" }}>
            never said
          </b>{" "}
          by the people they are pinned to. They are still in circulation. Nothing about them
          is unusual — that is the point.
        </p>
      </div>

      <div className="relative mt-5 sm:mt-8">
        <svg
          ref={field}
          className="block h-auto w-full"
          role="img"
          aria-label="Fabricated quotation cards are destroyed by the figure six times over; one registered paragraph remains, stamped proven."
        />
        {ran && (
          <button
            type="button"
            onClick={() => scene.current?.replay()}
            className="absolute right-0 -bottom-7 text-xs tracking-wide uppercase motion-reduce:hidden"
            style={{ color: "var(--ink-faint)" }}
          >
            Replay
          </button>
        )}
      </div>

      <p className="mt-9 max-w-[64ch] text-xs leading-relaxed" style={{ color: "var(--ink-faint)" }}>
        <a
          className="font-medium underline underline-offset-2"
          style={{ color: "var(--ink-soft)" }}
          href={SPREAD_STUDY.url}
          target="_blank"
          rel="noreferrer"
        >
          {SPREAD_STUDY.cite}
        </a>{" "}
        {SPREAD_STUDY.detail}
      </p>

      {/* The still version of what the field says, for readers who have motion turned off. */}
      <div
        className="mt-6 hidden grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-x-8 gap-y-4 border-t pt-4 motion-reduce:grid"
        style={{ borderColor: "var(--rule)" }}
      >
        {MISQUOTES.map((m) => (
          <p key={m.who} className="m-0 text-[0.8125rem] leading-snug" style={{ color: "var(--ink-soft)" }}>
            <span className="eyebrow block" style={{ color: "var(--alarm)" }}>
              {m.who}
            </span>
            {m.short} — {m.debunk}
          </p>
        ))}
      </div>
    </section>
  );
}
