import { createPublicClient, http, type Address } from "viem";
import { sepolia } from "viem/chains";
import deployment from "../../../deployments/sepolia.json";

// Read from the file the deploy script wrote, never typed by hand — a wrong address here
// would fail as "statement not registered", which reads like a missing statement rather
// than like a bug.
export const REGISTRY = deployment.CitableRegistry as Address;
export const NAME_GUARD = deployment.ENSv2NameGuard as Address;

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined),
});

export const registryAbi = [
  {
    type: "function",
    name: "registerRoot",
    stateMutability: "nonpayable",
    inputs: [
      { name: "root", type: "bytes32" },
      { name: "ensNode", type: "bytes32" },
      { name: "cid", type: "string" },
      { name: "segmentCount", type: "uint32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "nameGuard",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getStatement",
    stateMutability: "view",
    inputs: [{ name: "root", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "author", type: "address" },
          { name: "ensNode", type: "bytes32" },
          { name: "timestamp", type: "uint64" },
          { name: "segmentCount", type: "uint32" },
          { name: "withdrawn", type: "bool" },
          { name: "cid", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "verifySegment",
    stateMutability: "view",
    inputs: [
      { name: "root", type: "bytes32" },
      { name: "index", type: "uint256" },
      { name: "segment", type: "string" },
      { name: "proof", type: "bytes32[]" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export interface Statement {
  author: Address;
  ensNode: `0x${string}`;
  timestamp: bigint;
  segmentCount: number;
  withdrawn: boolean;
  cid: string;
}

/** Returns null when nothing is registered under this root — timestamp 0 is the sentinel. */
export async function getStatement(root: `0x${string}`): Promise<Statement | null> {
  const s = await publicClient.readContract({
    address: REGISTRY,
    abi: registryAbi,
    functionName: "getStatement",
    args: [root],
  });
  return s.timestamp === BigInt(0) ? null : (s as Statement);
}

export function verifySegmentOnChain(
  root: `0x${string}`,
  index: number,
  segment: string,
  proof: `0x${string}`[],
) {
  return publicClient.readContract({
    address: REGISTRY,
    abi: registryAbi,
    functionName: "verifySegment",
    args: [root, BigInt(index), segment, proof],
  });
}

/**
 * Asks the deployed guard whether this account may publish under this name.
 *
 * Called before the transaction rather than after it, because the alternative is an author
 * paying gas to be told no. `address(0)` for the guard means the check is switched off —
 * which is a fact about the registry the author is entitled to see, not something to
 * quietly treat as a yes.
 */
export async function mayPublish(
  ensNode: `0x${string}`,
  account: Address,
): Promise<{ allowed: boolean; guard: Address }> {
  const guard = await publicClient.readContract({
    address: REGISTRY,
    abi: registryAbi,
    functionName: "nameGuard",
  });

  if (guard === "0x0000000000000000000000000000000000000000") {
    return { allowed: true, guard };
  }

  const allowed = await publicClient.readContract({
    address: guard,
    abi: [
      {
        type: "function",
        name: "mayPublish",
        stateMutability: "view",
        inputs: [
          { name: "ensNode", type: "bytes32" },
          { name: "account", type: "address" },
        ],
        outputs: [{ type: "bool" }],
      },
    ] as const,
    functionName: "mayPublish",
    args: [ensNode, account],
  });

  return { allowed, guard };
}
