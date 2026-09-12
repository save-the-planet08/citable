// The whole registration path, end to end: text → bundle → IPFS → chain.
//
//   node script/js/publish.mjs statements/wochenzeitung/anhoerung.txt \
//     --name wochenzeitung [--broadcast]
//
// Needs PRIVATE_KEY and SEPOLIA_RPC_URL from .env. PINATA_JWT is optional and additive —
// without it the CID is real and locally reachable, with it the CID is also reachable
// from someone else's machine. Nothing else changes, which is the point: pinning is a
// configuration step, not a different code path.
//
// Three things are proven here rather than assumed:
//   1. the CID this repo computes is the CID kubo computes
//   2. the bytes read back out of IPFS rebuild the root
//   3. the chain accepts a proof against that root, at the right index and not at another
//
// Only after all three does anything go on chain.
import { createPublicClient, createWalletClient, http, labelhash, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildBundle, verifyBundle } from "../../lib/citable/bundle.mjs";
import { buildTree } from "../../lib/citable/tree.mjs";
import { bundleBytes, bundleCid } from "../../lib/citable/cid.mjs";
import { pinToPinata } from "../../lib/citable/pinata.mjs";

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const deployment = JSON.parse(readFileSync(join(ROOT_DIR, "deployments", "sepolia.json"), "utf8"));

const registryAbi = parseAbi([
  "function registerRoot(bytes32 root, bytes32 ensNode, string cid, uint32 segmentCount)",
  "function verifySegment(bytes32 root, uint256 index, string segment, bytes32[] proof) view returns (bool)",
  "function getStatement(bytes32 root) view returns ((address author, bytes32 ensNode, uint64 timestamp, uint32 segmentCount, bool withdrawn, string cid))",
]);

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const broadcast = args.includes("--broadcast");
const label = args.find((a) => a.startsWith("--name="))?.slice(7);

if (!file || !label) {
  console.error("usage: node script/js/publish.mjs <textfile> --name=<ens-label> [--broadcast]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Text → segments → tree
// ---------------------------------------------------------------------------

// Read as UTF-8 and left exactly as written. The segmenter is deliberately literal about
// line endings (lib/citable/segment.mjs), so normalising here would move the root.
const text = readFileSync(file, "utf8");
const bundle = buildBundle(text);
const segments = bundle.segments.map((s) => s.text);
const { root, proofFor } = buildTree(segments);
const ensNode = labelhash(label);

console.log(`\nfile       ${file}`);
console.log(`name       ${label}.eth`);
console.log(`ensNode    ${ensNode}`);
console.log(`segments   ${segments.length}`);
console.log(`root       ${root}`);

// ---------------------------------------------------------------------------
// 2. Bundle → CID, and the CID checked against kubo
// ---------------------------------------------------------------------------

const bytes = bundleBytes(bundle);
const computed = bundleCid(bundle);
console.log(`\nbundle     ${bytes.length} bytes`);
console.log(`cid (js)   ${computed}`);

const tmp = join(ROOT_DIR, ".bundle.tmp.json");
writeFileSync(tmp, bytes);

// kubo runs offline against ~/.ipfs — no daemon, no account. The CID is real either way;
// what a daemon or a pinning service adds is reachability, not identity.
const added = ipfs(["add", "-Q", "--cid-version", "1", "--pin", tmp]);
console.log(`cid (kubo) ${added}`);

if (added !== computed) {
  fail(
    `the CID this repo computes and the CID kubo computes disagree.\n` +
      `  js:   ${computed}\n  kubo: ${added}\n` +
      `Do not publish. lib/citable/cid.mjs is wrong, or the bundle exceeded one block.`,
  );
}

// ---------------------------------------------------------------------------
// 3. Read it back out of IPFS and rebuild the root from what came back
// ---------------------------------------------------------------------------

// Not a formality. This is the same check the verify screen runs on a stranger's machine,
// and running it here means a broken bundle is caught before the root is immutable.
const readBack = JSON.parse(ipfs(["cat", added]));
rmSync(tmp, { force: true });
if (!verifyBundle(readBack, root)) {
  fail("the bundle read back out of IPFS does not rebuild the root");
}
console.log(`\nround trip ok — the bytes in IPFS rebuild ${root.slice(0, 10)}…`);

// ---------------------------------------------------------------------------
// 4. Keep a copy where the app can serve it
// ---------------------------------------------------------------------------

// A CID that no node is serving is a dead link, and until Pinata is configured the only
// node holding this bundle is this laptop. The copy is safe to serve from anywhere
// because verifyBundle rebuilds the root from it — a swapped copy is rejected, so this
// buys availability and not trust. It is also NIGHT.md's own fallback for the case where
// pinning gets cut.
const publicDir = join(ROOT_DIR, "frontend", "public", "bundles");
mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, `${added}.json`), bytes);
console.log(`copy       frontend/public/bundles/${added}.json`);

await pinBundle(bytes, added);

// ---------------------------------------------------------------------------
// 5. The chain
// ---------------------------------------------------------------------------

const rpc = process.env.SEPOLIA_RPC_URL;
const key = process.env.PRIVATE_KEY;
if (!rpc || !key) fail("SEPOLIA_RPC_URL and PRIVATE_KEY must be set — source .env first.");

const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });
const registry = deployment.CitableRegistry;

const existing = await publicClient.readContract({
  address: registry,
  abi: registryAbi,
  functionName: "getStatement",
  args: [root],
});
if (existing.timestamp !== 0n) {
  console.log(`\nAlready registered at ${new Date(Number(existing.timestamp) * 1000).toISOString()}.`);
  console.log(`Whoever registers a text first wins — this one is taken.\n`);
  process.exit(0);
}

const { request } = await publicClient.simulateContract({
  address: registry,
  abi: registryAbi,
  functionName: "registerRoot",
  args: [root, ensNode, added, segments.length],
  account,
});

if (!broadcast) {
  console.log(`\nregisterRoot simulated ok against ${registry}.`);
  console.log("Nothing was sent. Re-run with --broadcast.\n");
  process.exit(0);
}

const wallet = createWalletClient({ account, chain: sepolia, transport: http(rpc) });
const hash = await wallet.writeContract(request);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`\nregisterRoot → ${hash}  (${receipt.status}, gas ${receipt.gasUsed})`);
if (receipt.status !== "success") fail("registerRoot reverted");

// ---------------------------------------------------------------------------
// 6. Prove the proof, against the deployed contract
// ---------------------------------------------------------------------------

const index = Math.min(1, segments.length - 1);
const proof = proofFor(index);
const accepted = await verifyOnChain(index, segments[index], proof);
const wrongPosition =
  segments.length > 1 && (await verifyOnChain((index + 1) % segments.length, segments[index], proof));

console.log(`\nverifySegment(${index}) ......... ${accepted}`);
console.log(`same segment, wrong index .... ${wrongPosition}`);
if (!accepted || wrongPosition) fail("the deployed contract does not agree with the client");

const record = {
  root,
  cid: added,
  ensNode,
  label,
  segmentCount: segments.length,
  author: account.address,
  registry,
  txHash: hash,
  block: Number(receipt.blockNumber),
  source: file,
};
const recordDir = join(ROOT_DIR, "deployments", "statements");
mkdirSync(recordDir, { recursive: true });
writeFileSync(join(recordDir, `${label}-${root.slice(2, 10)}.json`), JSON.stringify(record, null, 2) + "\n");

console.log(`\nrecorded in deployments/statements/${label}-${root.slice(2, 10)}.json\n`);

// ---------------------------------------------------------------------------

function verifyOnChain(index, segment, proof) {
  return publicClient.readContract({
    address: registry,
    abi: registryAbi,
    functionName: "verifySegment",
    args: [root, BigInt(index), segment, proof],
  });
}

function ipfs(argv) {
  try {
    return execFileSync("ipfs", argv, { encoding: "utf8" }).trim();
  } catch (error) {
    fail(`ipfs ${argv[0]} failed: ${error.stderr?.trim() || error.message}`);
  }
}

/// Additive by design. No JWT means one line of output and no other difference — the CID
/// was already real before this ran. The upload itself lives in lib/citable/pinata.mjs,
/// shared with the Vercel function, so the two cannot drift on `cidVersion`.
async function pinBundle(bytes, cid) {
  const result = await pinToPinata(bytes, cid, process.env.PINATA_JWT);
  if (result.status === "unconfigured") {
    console.log("pinata     not configured (PINATA_JWT unset) — the CID is served locally only");
  } else if (result.status === "pinned") {
    console.log(`pinata     pinned as ${result.cid}`);
  } else {
    console.log(`pinata     ${result.status.toUpperCase()}: ${result.detail}`);
    console.log("           the CID stands; only its reachability from elsewhere does not");
  }
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}
