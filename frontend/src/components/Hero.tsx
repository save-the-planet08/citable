import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { ProofFlip } from "@/components/ProofFlip";

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

          {/* The one moment: a quotation nobody can check, replaced in the same place by
              one anybody can. */}
          <figure className="enter m-0" style={{ "--d": "0.62s" } as React.CSSProperties}>
            <ProofFlip />
          </figure>
        </div>
      </div>
    </section>
  );
}
