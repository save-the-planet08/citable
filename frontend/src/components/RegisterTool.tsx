"use client";

import { useEffect, useMemo, useState } from "react";
import { keccak256, toHex, type Address } from "viem";
import { citable, type Bundle } from "@/lib/citable";
import { REGISTRY, mayPublish, publicClient, registryAbi } from "@/lib/chain";
import { pinBundle } from "@/lib/pin";
import { connect, currentAccount, hasWallet, WalletError } from "@/lib/wallet";
import { SegmentationPreview } from "@/components/SegmentationPreview";

/**
 * The writing door — the half that makes this a product rather than a viewer.
 *
 * The text is split, the tree is built and the CID is computed here, in this tab. A CID on
 * chain is a promise that somebody is serving those bytes, so the one step this page
 * cannot do alone is keeping them: it has no pinning key and must never have one.
 *
 * It used to answer that by making the author download the bundle and pin it by hand. They
 * did not — three statements stand on chain whose CIDs no node serves. So the pinning now
 * happens through api/pin.mjs, which holds the key server-side, and it happens BEFORE the
 * transaction. That order is the point: reversed, the CID is immutable before the bytes
 * exist anywhere, which is exactly how those three came about.
 *
 * When there is no endpoint — next dev, or a deployment without a key — the old hand path
 * comes back as a fallback rather than the transaction going out unbacked.
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

type Stage = "idle" | "connecting" | "pinning" | "sending" | "done";

/** Why the endpoint did not keep the bytes. Its presence is what makes the download a duty. */
interface PinNote {
  kind: "unavailable" | "failed";
  detail: string;
}

export function RegisterTool() {
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [buildState, setBuildState] = useState<Built | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [keptCid, setKeptCid] = useState<string | null>(null);
  const [pinNote, setPinNote] = useState<PinNote | null>(null);

  const [address, setAddress] = useState<Address | null>(null);
  // Starts optimistic and is corrected after mount. The prerendered HTML has to agree with
  // the browser's first render, and assuming "yes" flickers only for the minority without
  // a wallet — assuming "no" would grey the button for everyone else.
  const [walletPresent, setWalletPresent] = useState(true);
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

  // Both of these are facts about the visitor's browser, so they are read after mount and
  // never during render: this page is prerendered to static HTML, where `window.ethereum`
  // is always absent, and deciding anything on it while rendering would make the server's
  // markup and the browser's disagree.
  //
  // The account is asked for silently. An author who has already allowed this site sees
  // their address and their ENS permission on arrival, without a prompt — see
  // currentAccount in lib/wallet.ts.
  useEffect(() => {
    let cancelled = false;
    // currentAccount answers null when there is no wallet at all, so one round trip settles
    // both questions — and settles them in a callback, where setting state is what an
    // effect is for.
    currentAccount().then((account) => {
      if (cancelled) return;
      setWalletPresent(hasWallet());
      if (account) setAddress(account);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!built || !ensNode) return;
    setError(null);

    // Connecting is not a step of its own. Anyone who got this far has said what they want
    // to publish and under whose name; making them press a separate button before the page
    // will even try is ceremony.
    //
    // Connected once, here, and the client is carried through: a wallet that has already
    // allowed this site answers without a prompt, but asking it twice is two round trips
    // for nothing. The account is held in a local as well — setAddress does not take
    // effect until the next render, and the simulation below needs it in this one.
    if (!address) setStage("connecting");
    let wallet;
    try {
      wallet = await connect();
      setAddress(wallet.address);
    } catch (e) {
      setStage("idle");
      setError(e instanceof WalletError ? e.message : String(e));
      return;
    }

    // Pinning next, and a failure here ends the attempt. The alternative — register now,
    // sort the bytes out later — is the thing that produced three unverifiable statements.
    if (!pinNote) {
      setStage("pinning");
      const outcome = await pinBundle(built.bytes, built.root, built.cid);
      if (outcome.status !== "pinned") {
        setStage("idle");
        setPinNote({ kind: outcome.status, detail: outcome.detail });
        return;
      }
    }

    setStage("sending");
    try {
      // Simulated first, so a rejection costs nothing. The guard reverting here is the
      // common case and deserves a sentence, not a raw revert string.
      const { request } = await publicClient.simulateContract({
        address: REGISTRY,
        abi: registryAbi,
        functionName: "registerRoot",
        args: [built.root, ensNode, built.cid, built.segments.length],
        account: wallet.address,
      });
      const hash = await wallet.client.writeContract(request);
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
  // Only once the endpoint has failed. Until then the download is an offer, not a gate —
  // the bytes are about to be kept for the author, which is what the gate was standing in
  // for in the first place.
  const needsDownload = pinNote !== null;
  // A connected wallet is not among the conditions: the button connects one. What is left
  // is only what the author alone can supply — the text, the name, and the bytes in the
  // case where nothing else will keep them.
  const ready =
    built !== null &&
    ensNode !== null &&
    walletPresent &&
    (!needsDownload || kept) &&
    stage === "idle";

  return (
    <div>
      <p className="max-w-[58ch] text-[1.0625rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        The text is split into paragraphs here, in this tab. Each paragraph is bound to its
        position, and only the root of that tree goes on chain — 32 bytes. The words
        themselves go to IPFS on the click that registers them, because a root nobody can
        check the text against proves nothing. Nothing is stored anywhere before that click.
      </p>

      <Step n={1} title="The statement" note="Paragraphs are separated by a blank line.">
        <textarea
          className="field font-display text-base leading-relaxed"
          rows={12}
          placeholder={"Erster Absatz.\n\nZweiter Absatz."}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {buildError && (
          <p className="ui mt-2 text-sm" style={{ color: "var(--alarm)" }}>
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
          <p className="ui mt-2 font-mono text-xs break-all" style={{ color: "var(--ink-faint)" }}>
            ensNode {ensNode}
          </p>
        )}
        {permission && <Permission permission={permission} />}
      </Step>

      <Step n={3} title="Register" note="The bundle is kept, then one transaction on Sepolia.">
        {!walletPresent && (
          <p className="ui mb-4 text-sm" style={{ color: "var(--amber)" }}>
            No wallet in this browser. MetaMask or Rabby will do.
          </p>
        )}
        {address && (
          <p className="ui font-mono text-xs break-all" style={{ color: "var(--ink-soft)" }}>
            {address}
          </p>
        )}

        {/* The download only becomes a step of its own once nothing else will keep the
            bytes. Until then it is one line under the button, for an author who would
            rather not depend on this deployment's pinning account. */}
        {needsDownload && (
          <div
            className="rise mb-5 border p-5"
            style={{ borderColor: "var(--alarm)", background: "var(--paper-raised)" }}
          >
            <p className="ui text-sm leading-relaxed" style={{ color: "var(--alarm)" }}>
              {pinNote.kind === "unavailable"
                ? "This deployment cannot keep the bytes for you."
                : "Keeping the bytes failed."}{" "}
              <span style={{ color: "var(--ink-soft)" }}>{pinNote.detail}</span>
            </p>
            <p className="ui mt-3 max-w-xl text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              Nothing was sent. It falls to you now: download the bundle and pin it — any IPFS
              node or pinning service will do, and the CID is the same everywhere because it is
              the hash of these exact bytes. Register without it and you have put a dead link on
              chain with a timestamp on it.
            </p>
            <button
              onClick={download}
              disabled={!built}
              className="ui mt-4 border px-6 py-3 text-sm font-medium tracking-wide disabled:opacity-35"
              style={{ borderColor: "var(--seal)", color: "var(--seal)" }}
            >
              {kept ? "Downloaded ✓ — download again" : "Download the bundle"}
            </button>
          </div>
        )}

        <button
          onClick={register}
          disabled={!ready}
          className="ui px-7 py-3 text-sm font-medium tracking-wide disabled:cursor-not-allowed disabled:opacity-35"
          style={{ background: "var(--seal)", color: "var(--paper-raised)" }}
        >
          {stage === "connecting"
            ? "Waiting for the wallet…"
            : stage === "pinning"
              ? "Keeping the bytes…"
              : stage === "sending"
                ? "Waiting for the chain…"
                : address || !walletPresent
                  ? "Register on Sepolia"
                  : "Connect a wallet and register"}
        </button>

        {!ready && stage === "idle" && (
          <p className="ui mt-3 text-xs" style={{ color: "var(--ink-faint)" }}>
            {missing({ built, ensNode, kept, needsDownload, walletPresent })}
          </p>
        )}

        {ready && !needsDownload && (
          <p className="ui mt-3 max-w-xl text-xs leading-relaxed" style={{ color: "var(--ink-faint)" }}>
            One click: the bundle is pinned so the CID points at something, then the
            transaction goes out. Nothing is sent if the pinning fails.{" "}
            <button
              onClick={download}
              className="underline underline-offset-2"
              style={{ color: "var(--seal)" }}
            >
              {kept ? "Downloaded ✓ — download again" : "Keep a copy of the bundle yourself"}
            </button>
            {" — optional, and the answer to “what if this deployment's pin lapses”."}
          </p>
        )}

        {error && (
          <p className="ui mt-4 max-w-xl text-sm leading-relaxed" style={{ color: "var(--alarm)" }}>
            {error}
          </p>
        )}

        {stage === "done" && built && (
          <Registered root={built.root} cid={built.cid} txHash={txHash} label={label} />
        )}
      </Step>
    </div>
  );
}

function Permission({ permission }: { permission: { allowed: boolean; guard: Address } }) {
  if (permission.guard === "0x0000000000000000000000000000000000000000") {
    return (
      <p className="ui mt-3 text-sm leading-relaxed" style={{ color: "var(--amber)" }}>
        The name check is switched off on this registry. Anyone can claim any name right now,
        so a name recorded today is unbacked metadata.
      </p>
    );
  }
  return (
    <p
      className="ui mt-3 text-sm leading-relaxed"
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
  cid,
  txHash,
  label,
}: {
  root: `0x${string}`;
  cid: string;
  txHash: `0x${string}` | null;
  label: string;
}) {
  return (
    <div
      className="rise mt-6 border p-6"
      style={{ borderColor: "var(--seal)", background: "var(--seal-tint)" }}
    >
      <p className="font-display text-lg">On the record.</p>
      <p className="ui mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        Every paragraph of this statement can now be proven to have stood where it stands, at
        this moment, under this name.
      </p>
      <dl className="ui mt-5 space-y-2 text-xs">
        <div className="flex flex-wrap gap-x-4">
          <dt className="eyebrow w-24 shrink-0">Root</dt>
          <dd className="min-w-0 flex-1 font-mono break-all">{root}</dd>
        </div>
        <div className="flex flex-wrap gap-x-4">
          <dt className="eyebrow w-24 shrink-0">Bundle</dt>
          <dd className="min-w-0 flex-1 font-mono break-all">{cid}</dd>
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
      <a
        href="#check"
        className="ui mt-5 inline-block text-sm underline underline-offset-2"
        style={{ color: "var(--seal)" }}
      >
        Check a quote from {label.trim() || "this statement"} →
      </a>
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
    <section className="mt-10 border-t pt-7" style={{ borderColor: "var(--rule)" }}>
      <div className="flex items-baseline gap-3">
        <span className="ui font-mono text-sm" style={{ color: "var(--ink-faint)" }}>
          {n}
        </span>
        <h2 className="font-display text-xl">{title}</h2>
      </div>
      <p className="ui mt-1 mb-4 ml-7 text-sm" style={{ color: "var(--ink-faint)" }}>
        {note}
      </p>
      <div className="ml-7">{children}</div>
    </section>
  );
}

function missing({
  built,
  ensNode,
  kept,
  needsDownload,
  walletPresent,
}: {
  built: Built | null;
  ensNode: string | null;
  kept: boolean;
  needsDownload: boolean;
  walletPresent: boolean;
}): string {
  if (!built) return "Paste the statement first.";
  if (!ensNode) return "Name who is publishing.";
  if (needsDownload && !kept) {
    return "Download the bundle first — the CID has to point at something.";
  }
  if (!walletPresent) return "A wallet is needed to sign the transaction.";
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
