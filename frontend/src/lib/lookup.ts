// Finding statements without an indexer.
//
// StatementRegistered carries ensNode as an indexed topic (src/CitableRegistry.sol:38),
// so one getLogs call returns every statement published under a name. That is the whole
// reason the subgraph could be dropped: there is no service in between, the chain answers
// the question directly.
import { keccak256, toHex, isAddress, type Address } from "viem";
import { publicClient, REGISTRY } from "./chain";

// The block the registry was deployed in. Without a floor, getLogs walks the whole chain
// and public RPCs abort the request — which surfaces as "no statements found" and looks
// like an empty registry rather than a failed query.
const DEPLOY_BLOCK = BigInt(0xb225f3);

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

/** Every statement registered under this name, newest first. */
export async function statementsByName(ensNode: `0x${string}`): Promise<Candidate[]> {
  const logs = await publicClient.getLogs({
    address: REGISTRY,
    event: registeredEvent,
    args: { ensNode },
    fromBlock: DEPLOY_BLOCK,
    toBlock: "latest",
  });

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
