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

/** Only what the verify screen reads. The write path is not part of this screen. */
export const registryAbi = [
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
