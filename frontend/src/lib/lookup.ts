// Finding statements without an indexer.
//
// StatementRegistered carries ensNode as an indexed topic (src/CitableRegistry.sol:38),
// so a getLogs call returns every statement published under a name. That is the whole
// reason the subgraph could be dropped: there is no service in between, the chain answers
// the question directly.
//
// The price of having no indexer is that the query has to survive whatever eth_getLogs
// limit the reader's RPC endpoint imposes — see registeredLogs below.
import { keccak256, toHex, isAddress, type Address } from "viem";
import { publicClient, REGISTRY } from "./chain";

// The block the registry was deployed in. Without a floor, getLogs walks the whole chain
// and public RPCs abort the request — which surfaces as "no statements found" and looks
// like an empty registry rather than a failed query.
//
// Overridable because it is a fact about a deployment and not about the code: a registry
// deployed somewhere else has a different floor. Setting it to 0 also makes the range
// fallback below reachable on demand, which is how it gets tested against a provider that
// really does refuse a wide window.
const DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_REGISTRY_FROM_BLOCK ?? 0xb225f3);

/** Cap on how many statements one search will open. Each costs an IPFS round trip. */
export const SEARCH_LIMIT = 25;

const registeredEvent = {
  type: "event",
  name: "StatementRegistered",
  inputs: [
    { name: "root", type: "bytes32", indexed: true },
    { name: "author", type: "address", indexed: true },
    { name: "ensNode", type: "bytes32", indexed: true },
    { name: "segmentCount", type: "uint32", indexed: false },
    { name: "cid", type: "string", indexed: false },
  ],
} as const;

export type Query =
  | { kind: "name"; label: string; ensNode: `0x${string}` }
  | { kind: "root"; root: `0x${string}` }
  | { kind: "author"; address: Address }
  /**
   * A subname like anna.wochenzeitung.eth. Refused rather than searched.
   *
   * Taking the first label would quietly look up "anna" — a different name entirely — and
   * report "not found". An absence claim derived from the wrong denominator is worse than
   * no answer, so this is surfaced as a limit instead.
   */
  | { kind: "subname"; input: string };

/**
 * What did the user type?
 *
 * A name is turned into labelhash(label) — keccak256 over the first label only, the same
 * rule ENSv2NameGuard applies on chain (src/ENSv2NameGuard.sol:61). Anything deeper than
 * a second-level name would live in a subregistry this build does not descend into.
 */
export function parseQuery(input: string): Query | null {
  const value = input.trim();
  if (!value) return null;

  if (/^0x[0-9a-fA-F]{64}$/.test(value)) {
    return { kind: "root", root: value.toLowerCase() as `0x${string}` };
  }
  if (isAddress(value)) {
    return { kind: "author", address: value };
  }

  const bare = value.replace(/^@/, "").toLowerCase();
  const labels = bare.split(".").filter(Boolean);
  if (labels.length === 0) return null;

  // "wochenzeitung" and "wochenzeitung.eth" are the same name. Anything longer is a
  // subname, which lives in a subregistry this build does not descend into.
  const isSecondLevel = labels.length === 1 || (labels.length === 2 && labels[1] === "eth");
  if (!isSecondLevel) return { kind: "subname", input: value };

  const label = labels[0].trim();
  if (!label) return null;
  return { kind: "name", label, ensNode: keccak256(toHex(label)) };
}

export interface Candidate {
  root: `0x${string}`;
  cid: string;
  author: Address;
  segmentCount: number;
}

/**
 * The widest window to ask for once a provider has refused the whole range.
 *
 * Public endpoints cap eth_getLogs and they do not agree on where: measured on Sepolia,
 * tenderly serves genesis-to-latest in 120ms while publicnode refuses anything past 50 000
 * blocks. A fixed window would be wrong for both — too small is needless round trips, too
 * large fails on the stricter half of the internet.
 */
const MAX_SPAN = BigInt(45_000);

/** Below this, a provider is not range limited but broken, and the error is real. */
const MIN_SPAN = BigInt(1_000);

/**
 * Every StatementRegistered log in a range, whatever the provider's limit happens to be.
 *
 * The whole range is tried first, so a capable endpoint costs exactly one request and keeps
 * costing one as the chain grows. Only when that is refused does it fall back to windows,
 * halving them until the provider stops complaining.
 *
 * This matters more than it looks. The search walks from the deploy block to the head, and
 * that distance only ever grows — a registry that answers today would start failing on a
 * stricter endpoint a few weeks from now, and the failure surfaces as "could not read the
 * registry" in front of whoever is watching.
 */
async function registeredLogs(args: { ensNode?: `0x${string}` }) {
  const head = await publicClient.getBlockNumber();
  const ask = (fromBlock: bigint, toBlock: bigint) =>
    publicClient.getLogs({ address: REGISTRY, event: registeredEvent, args, fromBlock, toBlock });

  try {
    return await ask(DEPLOY_BLOCK, head);
  } catch {
    // Refused. Fall through to windows rather than reporting an empty registry.
  }

  const logs: Awaited<ReturnType<typeof ask>> = [];
  let span = MAX_SPAN;
  let cursor = DEPLOY_BLOCK;

  while (cursor <= head) {
    const end = cursor + span - BigInt(1) > head ? head : cursor + span - BigInt(1);
    try {
      logs.push(...(await ask(cursor, end)));
      cursor = end + BigInt(1);
    } catch (error) {
      // Narrow and retry the same window. Giving up here would hand the caller an empty
      // list, and an empty list is indistinguishable from "this name published nothing" —
      // exactly the false absence claim this project refuses to make.
      if (span <= MIN_SPAN) throw error;
      span /= BigInt(2);
    }
  }
  return logs;
}

/** Every statement registered under this name, newest first. */
export async function statementsByName(ensNode: `0x${string}`): Promise<Candidate[]> {
  const logs = await registeredLogs({ ensNode });

  return logs
    .reverse()
    .map((log) => ({
      root: log.args.root as `0x${string}`,
      cid: log.args.cid as string,
      author: log.args.author as Address,
      segmentCount: Number(log.args.segmentCount),
    }));
}

/** Same, by the account that registered. rootsByAuthor already exists on the contract. */
export async function statementsByAuthor(author: Address): Promise<`0x${string}`[]> {
  const roots = await publicClient.readContract({
    address: REGISTRY,
    abi: [
      {
        type: "function",
        name: "rootsByAuthor",
        stateMutability: "view",
        inputs: [{ name: "author", type: "address" }],
        outputs: [{ type: "bytes32[]" }],
      },
    ] as const,
    functionName: "rootsByAuthor",
    args: [author],
  });
  return [...roots].reverse() as `0x${string}`[];
}
