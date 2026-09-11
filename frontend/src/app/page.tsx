"use client";

import { useState } from "react";
import Link from "next/link";
import { search, type Progress, type SearchResult } from "@/lib/search";
import { parseQuery } from "@/lib/lookup";
import { ResultPanel } from "@/components/Verdict";
import { Hero } from "@/components/Hero";
import { HowItHolds } from "@/components/HowItHolds";
import { Cascade } from "@/components/Cascade";
import { Limits } from "@/components/Limits";
import { REGISTRY } from "@/lib/chain";
import { DEMO_NAME, DEMO_PARAGRAPHS, DEMO_HIT } from "@/lib/demo";

export default function VerifyScreen() {
  const [who, setWho] = useState("");
  const [fragment, setFragment] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [checking, setChecking] = useState(false);

  const query = parseQuery(who);
  const ready = query !== null && fragment.trim().length > 0;

  async function check(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || checking) return;
    setChecking(true);
    setResult(null);
    setProgress(null);
    try {
      setResult(await search(who, fragment, setProgress));
    } finally {
      setChecking(false);
      setProgress(null);
    }
  }

  /** Fills the form with a quote that really is registered, so the tool can be tried. */
  function tryIt() {
    setWho(DEMO_NAME);
    setFragment(DEMO_PARAGRAPHS[DEMO_HIT]);
  }

  return (
    <>
      {/* The hero pins itself and carries the masthead, so it owns the top of the page
          outright rather than sitting in the column below. */}
      <Hero />

      <main className="mx-auto w-full max-w-5xl px-5 pb-14 sm:px-8 sm:pb-20">

      {/* The instrument itself, and the one section with no motion in it. A tool that
          animates while you are trying to use it is a tool that does not trust its own
          answer to hold attention. */}
      <section id="check" className="mt-28 scroll-mt-8 sm:mt-36">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">Check a quote</p>
          <h2 className="mt-3 max-w-[24ch] font-display text-[clamp(1.5rem,3vw,2.1rem)] leading-tight text-balance">
            Name who is being quoted. Paste what they are supposed to have said.
          </h2>
          <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Citable walks every statement that name has registered, rebuilds each text from
            its bundle, and asks the contract which paragraph the quote was — and where it
            stood. All of it in this tab.
          </p>

          <form onSubmit={check} className="mt-10">
            <label className="block">
              <span className="eyebrow">Who is being quoted</span>
              <input
                className="field mt-2 text-base"
                placeholder={DEMO_NAME}
                value={who}
                onChange={(e) => setWho(e.target.value)}
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <p className="mt-2 text-xs" style={{ color: "var(--ink-faint)" }}>
              {query?.kind === "root"
                ? "Reading as a statement root."
                : query?.kind === "author"
                  ? "Reading as an author address."
                  : "An ENS name. A statement root or an address works too, if you have one."}
            </p>

            <label className="mt-7 block">
              <span className="eyebrow">What they are supposed to have said</span>
              <textarea
                className="field mt-2 font-display text-base leading-relaxed"
                rows={5}
                placeholder="Paste the passage exactly as it was quoted."
                value={fragment}
                onChange={(e) => setFragment(e.target.value)}
              />
            </label>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="submit"
                disabled={!ready || checking}
                className="px-7 py-3 text-sm font-medium tracking-wide transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
                style={{ background: "var(--seal)", color: "var(--paper-raised)" }}
              >
                {checking ? "Checking…" : "Check this quote"}
              </button>
              <button
                type="button"
                onClick={tryIt}
                className="text-sm underline underline-offset-4"
                style={{ color: "var(--ink-soft)" }}
              >
                Use a quote that is registered
              </button>
            </div>
            <p className="mt-3 text-xs" style={{ color: "var(--ink-faint)" }}>
              {progress && progress.total > 0
                ? `Statement ${progress.done + 1} of ${progress.total}…`
                : "Everything runs in your browser. Nothing is sent to a server."}
            </p>
          </form>

          {result && <ResultPanel result={result} claim={fragment} />}
        </div>
      </section>

      <HowItHolds />
      <Cascade />

      <section className="mt-28 sm:mt-36">
        <div
          className="border p-8 sm:p-10"
          style={{ borderColor: "var(--rule-strong)", background: "var(--paper-raised)" }}
        >
          <p className="eyebrow">The other side of it</p>
          <h2 className="mt-3 max-w-[26ch] font-display text-[clamp(1.4rem,2.6vw,1.9rem)] leading-tight text-balance">
            Put your own statement on the record.
          </h2>
          <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Paste a text, watch where it gets cut, keep the bundle, register the root. One
            transaction, and every paragraph becomes quotable with a proof attached.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block px-7 py-3 text-sm font-medium tracking-wide"
            style={{ background: "var(--seal)", color: "var(--paper-raised)" }}
          >
            Register a statement
          </Link>
        </div>
      </section>

      <Limits />

      <footer
        className="mt-24 border-t pt-6 text-xs leading-relaxed"
        style={{ borderColor: "var(--rule)", color: "var(--ink-faint)" }}
      >
        <p>
          Registry{" "}
          <a
            className="font-mono underline underline-offset-2"
            href={`https://sepolia.etherscan.io/address/${REGISTRY}#code`}
            target="_blank"
            rel="noreferrer"
          >
            {REGISTRY}
          </a>{" "}
          on Sepolia, verified on Etherscan.
        </p>
        <p className="mt-2 max-w-[70ch]">
          A proof shows that a paragraph stood at a position when the root was registered. It
          does not show that the statement is true, and a quote that is not found here was
          not necessarily invented.
        </p>
      </footer>
      </main>
    </>
  );
}
