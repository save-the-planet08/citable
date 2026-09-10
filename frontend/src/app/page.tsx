"use client";

import { useState } from "react";
import { search, type Progress, type SearchResult } from "@/lib/search";
import { parseQuery } from "@/lib/lookup";
import { ResultPanel } from "@/components/Verdict";
import { REGISTRY } from "@/lib/chain";

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

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
      <header>
        <p className="eyebrow">Citable · Sepolia</p>
        <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">
          Not <em>is this quote real?</em>
          <br />
          <span style={{ color: "var(--seal)" }}>
            Here is the proof that I quoted correctly.
          </span>
        </h1>
        <p
          className="mt-5 max-w-xl text-[15px] leading-relaxed"
          style={{ color: "var(--ink-soft)" }}
        >
          Name who is being quoted and paste what they are supposed to have said. Citable
          searches every statement that name has registered, rebuilds each text from IPFS,
          and asks the contract which paragraph the quote was — and where it stood.
        </p>
      </header>

      <form onSubmit={check} className="mt-12">
        <label className="block">
          <span className="eyebrow">Who is being quoted</span>
          <input
            className="field mt-2 text-base"
            placeholder="wochenzeitung.eth"
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
          <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
            {progress && progress.total > 0
              ? `Statement ${progress.done + 1} of ${progress.total}…`
              : "Everything runs in your browser. Nothing is sent to a server."}
          </p>
        </div>
      </form>

      {result && <ResultPanel result={result} claim={fragment} />}

      <footer
        className="mt-20 border-t pt-6 text-xs leading-relaxed"
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
          </a>
        </p>
        <p className="mt-2 max-w-xl">
          A proof shows that a paragraph stood at a position when the root was registered. It
          does not show that the statement is true, and a quote that is not found here was
          not necessarily invented.
        </p>
      </footer>
    </main>
  );
}
