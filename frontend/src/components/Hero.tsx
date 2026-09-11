"use client";

import { useEffect, useRef } from "react";
import { mountImpact, IMPACT_MS } from "@/lib/impact";
import { MISQUOTES, SPREAD_STUDY } from "@/lib/misquotes";
import { Masthead } from "@/components/Masthead";

/**
 * The first screen states the problem with a number that was measured, and then destroys
 * five forgeries with it.
 *
 * The scene runs on a clock, slowly, and starts again every time the hero comes back into
 * view. Scrolling is left alone: the page moves the way a page moves, and someone who wants
 * to see it again scrolls up and it plays.
 *
 * The headline is plain markup and paints at once. The field is built after mount, so
 * nothing in the LCP path waits on it. Under prefers-reduced-motion nothing runs: the field
 * renders its finished state and the five refutations are set as text.
 */
export function Hero() {
  const stage = useRef<HTMLElement>(null);
  const field = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = field.current, section = stage.current;
    if (!svg || !section) return;

    const scene = mountImpact(svg);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => scene.destroy();

    let frame = 0;
    let started = 0;

    const step = (now: number) => {
      const p = (now - started) / IMPACT_MS;
      scene.render(p >= 1 ? 1 : p);
      if (p < 1) frame = requestAnimationFrame(step);
      else frame = 0;
    };

    // Watched rather than played once: the reader decides when to see it again by coming
    // back to it, which is the only control this needs.
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        cancelAnimationFrame(frame);
        started = performance.now();
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.55 },
    );
    watcher.observe(section);

    return () => {
      watcher.disconnect();
      cancelAnimationFrame(frame);
      scene.destroy();
    };
  }, []);

  return (
    <section ref={stage} className="flex min-h-svh flex-col px-4 pt-5 pb-8 sm:px-10 sm:pt-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col">
        <Masthead />

        <div className="mt-8 grid shrink-0 items-end gap-6 sm:mt-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <p className="eyebrow">The problem, measured</p>
            <h1 className="mt-4 font-display text-[clamp(2.2rem,5vw,4.1rem)] leading-[1.02] text-balance">
              A lie reaches 1,500 people{" "}
              <span style={{ color: "var(--alarm)" }}>six times faster</span> than the truth.
            </h1>
          </div>
          <p className="max-w-[42ch] text-[1.0625rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            The quotations below were{" "}
            <b className="font-semibold" style={{ color: "var(--ink)" }}>
              never said
            </b>{" "}
            by the people they are pinned to. They are still in circulation. Nothing about them
            is unusual — that is the point.
          </p>
        </div>

        {/* The field takes whatever height is left, and the drawing scales into it. */}
        <div className="relative mt-6 min-h-[300px] flex-1 motion-reduce:aspect-[1400/560] motion-reduce:flex-none">
          <svg
            ref={field}
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label="Fabricated quotation cards are destroyed by the figure six times over; one registered paragraph remains, stamped proven."
          />
        </div>

        <p className="ui mt-4 max-w-[68ch] shrink-0 text-[13px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
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
          className="mt-6 hidden grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-8 gap-y-4 border-t pt-4 motion-reduce:grid"
          style={{ borderColor: "var(--rule)" }}
        >
          {MISQUOTES.map((m) => (
            <p key={m.who} className="m-0 text-[0.9375rem] leading-snug" style={{ color: "var(--ink-soft)" }}>
              <span className="eyebrow block" style={{ color: "var(--alarm)" }}>
                {m.who}
              </span>
              {m.short} — {m.debunk}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
