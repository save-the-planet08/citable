"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { keccak256, toHex, type Address } from "viem";
import { citable, type Bundle } from "@/lib/citable";
import { REGISTRY, mayPublish, publicClient, registryAbi } from "@/lib/chain";
import { connect, hasWallet, WalletError } from "@/lib/wallet";
import { SegmentationPreview } from "@/components/SegmentationPreview";

/**
 * The screen that makes this a product rather than a viewer.
 *
 * Everything on it happens in the browser: the text is split, the tree is built, the CID
 * is computed. Nothing is uploaded by this page — which is precisely why step 3 exists and
 * is not optional. A CID on chain is a promise that somebody is serving those bytes, and
 * an author who registers without keeping them has published a dead link with a timestamp.
 */

interface Built {
  /** The text this was built from. Anything else on screen makes it stale. */
  forText: string;
  bundle: Bundle;
  segments: string[];
  root: `0x${string}`;
  cid: string;
  bytes: Uint8Array;
}

type Stage = "idle" | "sending" | "done";

export default function RegisterScreen() {
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [buildState, setBuildState] = useState<Built | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [keptCid, setKeptCid] = useState<string | null>(null);

  const [address, setAddress] = useState<Address | null>(null);
  const [permissionState, setPermissionState] = useState<
    { key: string; allowed: boolean; guard: Address } | null
  >(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Derived, not reset in an effect. A result belongs to the input it came from, so the
  // input is what decides whether it still counts — clearing it on the way would flash a
  // half-empty screen on every keystroke.
  const built = buildState?.forText === text ? buildState : null;

  const ensNode = useMemo(() => {
    const clean = label.trim().replace(/^@/, "").toLowerCase().split(".")[0];
    return clean ? keccak256(toHex(clean)) : null;
  }, [label]);

  // Rebuilt on a pause rather than on every keystroke: a merkle tree per character is
  // wasted work, and the numbers flickering while someone types reads as instability.
  useEffect(() => {
    if (!text.trim()) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { buildBundle, buildTree, bundleBytes, bundleCid } = await citable();
        const bundle = buildBundle(text);
        const segments = bundle.segments.map((s) => s.text);
        if (cancelled) return;
        setBuildState({
          forText: text,
          bundle,
          segments,
          root: buildTree(segments).root,
          cid: bundleCid(bundle),
          bytes: bundleBytes(bundle),
        });
        setBuildError(null);
      } catch (e) {
        if (!cancelled) setBuildError(e instanceof Error ? e.message : String(e));
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text]);

  const permissionKey = `${address ?? ""}:${ensNode ?? ""}`;
  const permission = permissionState?.key === permissionKey ? permissionState : null;

  useEffect(() => {
    if (!address || !ensNode) return;
    let cancelled = false;
    const key = `${address}:${ensNode}`;
    mayPublish(ensNode, address)
      .then((p) => !cancelled && setPermissionState({ key, ...p }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address, ensNode]);

  async function connectWallet() {
    setError(null);
    try {
      const { address } = await connect();
      setAddress(address);
    } catch (e) {
      setError(e instanceof WalletError ? e.message : String(e));
    }
  }

  function download() {
    if (!built) return;
    const url = URL.createObjectURL(new Blob([built.bytes as BlobPart], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${built.cid}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setKeptCid(built.cid);
  }

  async function register() {
    if (!built || !ensNode || !address) return;
    setStage("sending");
    setError(null);
    try {
      const { client } = await connect();
      // Simulated first, so a rejection costs nothing. The guard reverting here is the
      // common case and deserves a sentence, not a raw revert string.
      const { request } = await publicClient.simulateContract({
        address: REGISTRY,
        abi: registryAbi,
        functionName: "registerRoot",
        args: [built.root, ensNode, built.cid, built.segments.length],
        account: address,
      });
      const hash = await client.writeContract(request);
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      setStage("done");
    } catch (e) {
      setStage("idle");
      setError(readableRevert(e));
    }
  }

  // Consent is tied to the bytes, not to a click. Editing the text and changing it back
  // leaves the downloaded bundle valid, and editing it into something else does not.
  const kept = built !== null && keptCid === built.cid;
  const ready = built !== null && ensNode !== null && address !== null && kept && stage === "idle";

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
      <header>
        <p className="eyebrow">Citable · Sepolia · Register</p>
        <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">
          Put a statement on the record.
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          The text is split into paragraphs here, in this tab. Each paragraph is bound to its
          position, and only the root of that tree goes on chain — 32 bytes. The words never
          touch a server of ours, because there is no server of ours.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm underline underline-offset-2"
          style={{ color: "var(--seal)" }}
        >
          ← Check a quote instead
        </Link>
      </header>

      <Step n={1} title="The statement" note="Paragraphs are separated by a blank line.">
        <textarea
          className="field font-display text-base leading-relaxed"
          rows={12}
          placeholder={"Erster Absatz.\n\nZweiter Absatz."}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {buildError && (
          <p className="mt-2 text-sm" style={{ color: "var(--alarm)" }}>
            {buildError}
          </p>
        )}
        {built && <SegmentationPreview segments={built.segments} root={built.root} cid={built.cid} />}
      </Step>

      <Step
        n={2}
        title="Who is publishing"
        note="The ENS name this statement is registered under. Second-level names only."
      >
        <input
          className="field text-base"
          placeholder="wochenzeitung.eth"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        {ensNode && (
          <p className="mt-2 font-mono text-xs break-all" style={{ color: "var(--ink-faint)" }}>
            ensNode {ensNode}
          </p>
        )}
        {permission && <Permission permission={permission} />}
      </Step>

      <Step
        n={3}
        title="Keep the bundle"
        note="The CID goes on chain. The bytes do not — somebody has to serve them."
      >
        <p className="max-w-xl text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          This page has no pinning key and does not upload. Download the bundle and pin it —
          any IPFS node or pinning service will do, and the CID is the same everywhere because
          it is the hash of these exact bytes. Register without it and you have put a dead link
          on chain with a timestamp on it.
        </p>
        <button
          onClick={download}
          disabled={!built}
          className="mt-4 border px-6 py-3 text-sm font-medium tracking-wide disabled:opacity-35"
          style={{ borderColor: "var(--seal)", color: "var(--seal)" }}
        >
          {kept ? "Downloaded ✓ — download again" : "Download the bundle"}
        </button>
      </Step>

      <Step n={4} title="Register" note="One transaction on Sepolia.">
        {!hasWallet() && (
          <p className="text-sm" style={{ color: "var(--amber)" }}>
            No wallet in this browser. MetaMask or Rabby will do.
          </p>
        )}
        {hasWallet() && !address && (
          <button
            onClick={connectWallet}
            className="border px-6 py-3 text-sm font-medium tracking-wide"
            style={{ borderColor: "var(--seal)", color: "var(--seal)" }}
          >
            Connect a wallet
          </button>
        )}
        {address && (
          <p className="font-mono text-xs break-all" style={{ color: "var(--ink-soft)" }}>
            {address}
          </p>
        )}

        <button
          onClick={register}
          disabled={!ready}
          className="mt-5 px-7 py-3 text-sm font-medium tracking-wide disabled:cursor-not-allowed disabled:opacity-35"
          style={{ background: "var(--seal)", color: "var(--paper-raised)" }}
        >
          {stage === "sending" ? "Waiting for the chain…" : "Register on Sepolia"}
        </button>

        {!ready && stage === "idle" && (
          <p className="mt-3 text-xs" style={{ color: "var(--ink-faint)" }}>
            {missing({ built, ensNode, address, kept })}
          </p>
        )}

        {error && (
          <p className="mt-4 max-w-xl text-sm leading-relaxed" style={{ color: "var(--alarm)" }}>
            {error}
          </p>
        )}

        {stage === "done" && built && <Registered root={built.root} txHash={txHash} label={label} />}
      </Step>
    </main>
  );
}

function Permission({ permission }: { permission: { allowed: boolean; guard: Address } }) {
  if (permission.guard === "0x0000000000000000000000000000000000000000") {
    return (
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--amber)" }}>
        The name check is switched off on this registry. Anyone can claim any name right now,
        so a name recorded today is unbacked metadata.
      </p>
    );
  }
  return (
    <p
      className="mt-3 text-sm leading-relaxed"
      style={{ color: permission.allowed ? "var(--seal)" : "var(--alarm)" }}
    >
      {permission.allowed
        ? "ENS says this account may publish under this name."
        : "ENS does not let this account publish under this name. The transaction would revert, so it is not offered."}
    </p>
  );
}

function Registered({
  root,
  txHash,
  label,
}: {
  root: `0x${string}`;
  txHash: `0x${string}` | null;
  label: string;
}) {
  return (
    <div
      className="rise mt-6 border p-6"
      style={{ borderColor: "var(--seal)", background: "var(--seal-tint)" }}
    >
      <p className="font-display text-lg">On the record.</p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        Every paragraph of this statement can now be proven to have stood where it stands, at
        this moment, under this name.
      </p>
      <dl className="mt-5 space-y-2 text-xs">
        <div className="flex flex-wrap gap-x-4">
          <dt className="eyebrow w-24 shrink-0">Root</dt>
          <dd className="min-w-0 flex-1 font-mono break-all">{root}</dd>
        </div>
        {txHash && (
          <div className="flex flex-wrap gap-x-4">
            <dt className="eyebrow w-24 shrink-0">Transaction</dt>
            <dd className="min-w-0 flex-1 font-mono break-all">
              <a
                className="underline underline-offset-2"
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {txHash}
              </a>
            </dd>
          </div>
        )}
      </dl>
      <Link
        href="/"
        className="mt-5 inline-block text-sm underline underline-offset-2"
        style={{ color: "var(--seal)" }}
      >
        Check a quote from {label.trim() || "this statement"} →
      </Link>
    </div>
  );
}

function Step({
  n,
  title,
  note,
  children,
}: {
  n: number;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 border-t pt-7" style={{ borderColor: "var(--rule)" }}>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm" style={{ color: "var(--ink-faint)" }}>
          {n}
        </span>
        <h2 className="font-display text-xl">{title}</h2>
      </div>
      <p className="mt-1 mb-4 ml-7 text-sm" style={{ color: "var(--ink-faint)" }}>
        {note}
      </p>
      <div className="ml-7">{children}</div>
    </section>
  );
}

function missing({
  built,
  ensNode,
  address,
  kept,
}: {
  built: Built | null;
  ensNode: string | null;
  address: Address | null;
  kept: boolean;
}): string {
  if (!built) return "Paste the statement first.";
  if (!ensNode) return "Name who is publishing.";
  if (!kept) return "Download the bundle first — the CID has to point at something.";
  if (!address) return "Connect a wallet.";
  return "";
}

/** Contract errors carry meaning. A raw revert string throws it away. */
function readableRevert(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes("NotAuthorized")) {
    return "ENS does not let this account publish under this name, so the registry refused it.";
  }
  if (raw.includes("AlreadyRegistered")) {
    return "This exact text is already registered. Whoever registers a text first holds it — that is a known limit, not a bug.";
  }
  if (raw.includes("User rejected") || raw.includes("denied")) {
    return "You rejected the transaction. Nothing was sent.";
  }
  return raw;
}
