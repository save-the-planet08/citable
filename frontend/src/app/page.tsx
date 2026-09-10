"use client";

import { useState } from "react";
import { verify, type Verdict } from "@/lib/verify";
import { VerdictPanel } from "@/components/Verdict";
import { REGISTRY } from "@/lib/chain";

const ROOT_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export default function VerifyScreen() {
  const [root, setRoot] = useState("");
  const [fragment, setFragment] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [checking, setChecking] = useState(false);

  const rootValid = ROOT_PATTERN.test(root.trim());
  const ready = rootValid && fragment.trim().length > 0;

  async function check(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || checking) return;
    setChecking(true);
    setVerdict(null);
    try {
      setVerdict(await verify(root.trim() as `0x${string}`, fragment));
    } finally {
      setChecking(false);
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
          Paste a fragment and the root of the statement it came from. Citable rebuilds the
          text from IPFS, checks it against the root, and asks the contract which paragraph
          the fragment was — and where it stood.
        </p>
      </header>

      <form onSubmit={check} className="mt-12">
        <label className="block">
          <span className="eyebrow">Statement root</span>
          <input
            className="field mt-2 font-mono text-sm"
            placeholder="0x…"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        {root.length > 0 && !rootValid && (
          <p className="mt-2 text-sm" style={{ color: "var(--alarm)" }}>
            A root is 0x followed by 64 hex characters.
          </p>
        )}

        <label className="mt-7 block">
          <span className="eyebrow">The quoted fragment</span>
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
            Everything runs in your browser. Nothing is sent to a server.
          </p>
        </div>
      </form>

      {verdict && <VerdictPanel verdict={verdict} />}

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
          does not show that the statement is true, and a statement that is not registered
          here was not necessarily invented.
        </p>
      </footer>
    </main>
  );
}
