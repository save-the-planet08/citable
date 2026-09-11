"use client";

import { useEffect, useRef } from "react";
import { mountImpact } from "@/lib/impact";
import { MISQUOTES, SPREAD_STUDY } from "@/lib/misquotes";
import { Masthead } from "@/components/Masthead";

/**
 * The first screen states the problem with a number that was measured, and then destroys
 * five forgeries with it.
 *
 * The scene is pinned and driven by scroll rather than by a clock: the reader sets the
 * pace, the screen holds instead of sliding away, and scrolling back up puts the cards
 * together again — a refutation that went by too quickly can simply be scrolled back to.
 *
 * The headline is plain markup and paints at once. The field is built after mount, so
 * nothing in the LCP path waits on it. Under prefers-reduced-motion the pin is dropped,
 * the field renders its finished state, and the five refutations are set as text.
 */
export function Hero() {
  const track = useRef<HTMLElement>(null);
  const field = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = field.current, section = track.current;
    if (!svg || !section) return;

    const scene = mountImpact(svg);
    let frame = 0;

    const read = () => {
      frame = 0;
      const box = section.getBoundingClientRect();
      const travel = box.height - innerHeight;
      scene.render(travel <= 0 ? 1 : Math.min(1, Math.max(0, -box.top / travel)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    read();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      scene.destroy();
    };
  }, []);

  return (
    <section ref={track} className="relative h-[330svh] motion-reduce:h-auto">
      <div className="sticky top-0 flex h-svh flex-col overflow-hidden px-4 pt-5 pb-4 sm:px-10 sm:pt-8 motion-reduce:static motion-reduce:h-auto motion-reduce:overflow-visible">
        <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col">
          <Masthead />

          <div className="mt-5 grid shrink-0 items-end gap-5 sm:mt-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="eyebrow">The problem, measured</p>
              <h1 className="mt-3 font-display text-[clamp(1.9rem,4.2vw,3.4rem)] leading-[1.06] tracking-[-0.012em] text-balance">
                A lie reaches 1,500 people{" "}
                <span style={{ color: "var(--alarm)" }}>six times faster</span> than the truth.
              </h1>
            </div>
            <p
              className="max-w-[46ch] border-t pt-3 text-[clamp(0.875rem,1.05vw,1rem)] leading-relaxed"
              style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}
            >
              The quotations below were{" "}
              <b className="font-medium" style={{ color: "var(--ink)" }}>
                never said
              </b>{" "}
              by the people they are pinned to. They are still in circulation. Nothing about
              them is unusual — that is the point.
            </p>
          </div>

          {/* The field takes whatever height is left, and the drawing scales into it. */}
          <div className="mt-4 min-h-0 flex-1 motion-reduce:aspect-[1400/560] motion-reduce:flex-none">
            <svg
              ref={field}
              className="h-full w-full"
              role="img"
              aria-label="Fabricated quotation cards are destroyed by the figure six times over; one registered paragraph remains, stamped proven."
            />
          </div>

          <p
            className="mt-3 max-w-[64ch] shrink-0 text-xs leading-relaxed"
            style={{ color: "var(--ink-faint)" }}
          >
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

          {/* The still version of what the field says, for readers with motion turned off. */}
          <div
            className="mt-6 hidden grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-x-8 gap-y-4 border-t pt-4 motion-reduce:grid"
            style={{ borderColor: "var(--rule)" }}
          >
            {MISQUOTES.map((m) => (
              <p
                key={m.who}
                className="m-0 text-[0.8125rem] leading-snug"
                style={{ color: "var(--ink-soft)" }}
              >
                <span className="eyebrow block" style={{ color: "var(--alarm)" }}>
                  {m.who}
                </span>
                {m.short} — {m.debunk}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
