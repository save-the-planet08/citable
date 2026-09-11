"use client";

import { useState } from "react";
import { search, type Progress, type SearchResult } from "@/lib/search";
import { parseQuery } from "@/lib/lookup";
import { ResultPanel } from "@/components/Verdict";
import { DEMO_NAME, DEMO_PARAGRAPHS, DEMO_HIT } from "@/lib/demo";

/**
 * The reading door: name who is being quoted, paste what they are supposed to have said.
 *
 * No motion in here. A tool that animates while you are trying to use it is a tool that
 * does not trust its own answer to hold attention.
 */
export function CheckTool() {
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
    <div>
      <p className="max-w-[58ch] text-[1.0625rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        Citable walks every statement that name has registered, rebuilds each text from its
        bundle, and asks the contract which paragraph the quote was — and where it stood. All
        of it in this tab.
      </p>

      <form onSubmit={check} className="mt-8">
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
        <p className="ui mt-2 text-xs" style={{ color: "var(--ink-faint)" }}>
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
            className="ui px-7 py-3 text-sm font-medium tracking-wide transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
            style={{ background: "var(--seal)", color: "var(--paper-raised)" }}
          >
            {checking ? "Checking…" : "Check this quote"}
          </button>
          <button
            type="button"
            onClick={tryIt}
            className="ui text-sm underline underline-offset-4"
            style={{ color: "var(--ink-soft)" }}
          >
            Use a quote that is registered
          </button>
        </div>
        <p className="ui mt-3 text-xs" style={{ color: "var(--ink-faint)" }}>
          {progress && progress.total > 0
            ? `Statement ${progress.done + 1} of ${progress.total}…`
            : "Everything runs in your browser. Nothing is sent to a server."}
        </p>
      </form>

      {result && <ResultPanel result={result} claim={fragment} />}
    </div>
  );
}
