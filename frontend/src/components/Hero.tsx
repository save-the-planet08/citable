import Link from "next/link";
import { Masthead } from "@/components/Masthead";

/**
 * The first screen says what this is, shows one piece of what it produces, and offers the
 * two things you can do. Nothing else.
 *
 * There is no scene here any more. A demonstration that has to be watched before it can be
 * understood is a demonstration that arrives after the visitor has already decided, and the
 * argument of this product is a sentence, not a spectacle: you can prove you quoted right.
 *
 * The entrance is CSS with staggered delays — the hero is the LCP element and must not wait
 * on a script. Under prefers-reduced-motion every rule resolves to its finished state.
 */

/** One registered paragraph, exactly as the tool below reports it. */
const PROOF = {
  passage:
    "…that government of the people, by the people, for the people, shall not perish from the earth.",
  name: "frederik.eth",
  index: 4,
  total: 4,
};

export function Hero() {
  return (
    <section className="flex min-h-svh flex-col px-4 pt-5 pb-12 sm:px-10 sm:pt-8">
      <div className="mx-auto flex w-full max-w-[1340px] flex-1 flex-col">
        <div className="enter" style={{ "--d": "0.05s" } as React.CSSProperties}>
          <Masthead />
        </div>

        <div className="grid flex-1 items-center gap-12 pt-14 pb-6 sm:pt-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20 lg:pt-10">
          <div>
            <p className="eyebrow enter" style={{ "--d": "0.15s" } as React.CSSProperties}>
              A register of statements · live on Sepolia
            </p>

            <h1 className="mt-5 font-display text-[clamp(2.4rem,5.4vw,4.4rem)] leading-[1.02]">
              <span className="line">
                <span style={{ "--d": "0.25s" } as React.CSSProperties}>
                  Anyone can invent
                </span>
              </span>
              <span className="line">
                <span style={{ "--d": "0.35s" } as React.CSSProperties}>a quotation.</span>
              </span>
              <span className="line" style={{ color: "var(--seal)" }}>
                <span style={{ "--d": "0.47s" } as React.CSSProperties}>
                  Now you can prove
                </span>
              </span>
              <span className="line" style={{ color: "var(--seal)" }}>
                <span style={{ "--d": "0.57s" } as React.CSSProperties}>you didn’t.</span>
              </span>
            </h1>

            <p
              className="enter mt-8 max-w-[54ch] text-[1.125rem] leading-relaxed"
              style={{ "--d": "0.78s", color: "var(--ink-soft)" } as React.CSSProperties}
            >
              Citable cuts a statement into paragraphs, binds each one to its position, and
              puts the root of that tree on chain. Quote from it afterwards and the proof
              travels with the quote: this passage, word for word, at this position, in this
              text, on this date.
            </p>

            <div
              className="enter mt-9 flex flex-wrap items-center gap-x-4 gap-y-3"
              style={{ "--d": "0.9s" } as React.CSSProperties}
            >
              <Link
                href="/#check"
                className="ui px-8 py-3.5 text-sm font-medium tracking-wide"
                style={{ background: "var(--seal)", color: "var(--paper-raised)" }}
              >
                Check a quote
              </Link>
              <Link
                href="/#register"
                className="ui border px-8 py-3.5 text-sm font-medium tracking-wide"
                style={{ borderColor: "var(--rule-strong)", color: "var(--ink)" }}
              >
                Register a statement
              </Link>
            </div>

            <p
              className="ui enter mt-6 text-[13px]"
              style={{ "--d": "1s", color: "var(--ink-faint)" } as React.CSSProperties}
            >
              No account, no server, no indexer. The check runs in your browser.
            </p>
          </div>

          {/* What the tool hands back, shown once. */}
          <figure
            className="enter m-0"
            style={{ "--d": "0.62s" } as React.CSSProperties}
          >
            <div
              className="border-l-4 border-y border-r px-7 py-7 sm:px-9 sm:py-9"
              style={{ borderColor: "var(--rule-strong)", borderLeftColor: "var(--seal)", background: "#ffffff" }}
            >
              <div className="flex items-start justify-between gap-6">
                <p className="eyebrow">Registered statement</p>
                <span
                  className="ui shrink-0 border px-3 py-1 text-[11px] font-semibold tracking-[0.12em]"
                  style={{ borderColor: "var(--seal)", color: "var(--seal)" }}
                >
                  PROVEN
                </span>
              </div>

              <blockquote className="mt-5 font-display text-[clamp(1.1rem,1.5vw,1.3rem)] leading-snug">
                “{PROOF.passage}”
              </blockquote>

              {/* The position is what a quotation loses when it is lifted out, so it is
                  numbered rather than drawn as bars — bars of unequal height read as a
                  chart that is still loading. */}
              <div className="mt-7 flex gap-1.5">
                {Array.from({ length: PROOF.total }, (_, i) => {
                  const here = i === PROOF.index - 1;
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
                Paragraph {PROOF.index} of {PROOF.total}
              </p>

              <p
                className="ui mt-6 border-t pt-4 text-[13px] leading-relaxed"
                style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}
              >
                Published under <span className="font-mono">{PROOF.name}</span> on Sepolia.
                Anyone can rebuild this from the bundle and check it against the chain.
              </p>
            </div>
            <figcaption className="ui mt-3 text-[12.5px]" style={{ color: "var(--ink-faint)" }}>
              Proves the paragraph and where it stood — not that the statement is true.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
