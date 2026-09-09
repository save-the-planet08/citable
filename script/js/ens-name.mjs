// FFI entry point for test/ENSv2NameGuard.t.sol. Finds a name that is really registered
// and owned on the ENSv2 ETHRegistry right now, so the fork test has no hardcoded name
// to go stale — the bounty asks for that explicitly.
//
// Prints abi.encode(bytes32 labelhash, address owner, uint256 roles).
//
// Usage: node script/js/ens-name.mjs
import { createPublicClient, http, encodeAbiParameters, labelhash, parseAbi } from "viem";
import { sepolia } from "viem/chains";

const ETH_REGISTRY = "0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2";
const ZERO = "0x0000000000000000000000000000000000000000";

// eth_getLogs limits differ per provider; the fork RPC is tried first, then a known
// endpoint that serves wide ranges.
const RPC_URLS = [
  process.env.SEPOLIA_RPC_URL,
  "https://ethereum-sepolia-rpc.publicnode.com",
].filter(Boolean);

const registryAbi = parseAbi([
  "function getOwner(uint256 anyId) view returns (address)",
  "function roles(uint256 anyId, address account) view returns (uint256)",
  "function LABEL_STORE() view returns (address)",
]);
const labelStoreAbi = parseAbi(["function getLabel(uint256 anyId) view returns (string)"]);
const transferSingle = parseAbi([
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
])[0];

async function findOwnedName(client) {
  const labelStore = await client.readContract({
    address: ETH_REGISTRY,
    abi: registryAbi,
    functionName: "LABEL_STORE",
  });
  const head = await client.getBlockNumber();
  const mints = (
    await client.getLogs({
      address: ETH_REGISTRY,
      event: transferSingle,
      fromBlock: head - 50000n,
      toBlock: head,
    })
  ).filter((log) => log.args.from === ZERO);

  for (const log of mints.reverse()) {
    let label;
    try {
      label = await client.readContract({
        address: labelStore,
        abi: labelStoreAbi,
        functionName: "getLabel",
        args: [log.args.id],
      });
    } catch {
      continue;
    }
    if (!label) continue;

    const id = BigInt(labelhash(label));
    const owner = await client.readContract({
      address: ETH_REGISTRY,
      abi: registryAbi,
      functionName: "getOwner",
      args: [id],
    });
    if (owner === ZERO) continue;

    const roles = await client.readContract({
      address: ETH_REGISTRY,
      abi: registryAbi,
      functionName: "roles",
      args: [id, owner],
    });
    return { labelhash: labelhash(label), owner, roles };
  }
  return null;
}

let found = null;
let lastError;
for (const url of RPC_URLS) {
  try {
    found = await findOwnedName(createPublicClient({ chain: sepolia, transport: http(url) }));
    if (found) break;
  } catch (err) {
    lastError = err;
  }
}

if (!found) {
  console.error(`no owned name found on the ENSv2 ETHRegistry: ${lastError?.shortMessage ?? lastError?.message ?? "none in range"}`);
  process.exit(1);
}

process.stdout.write(
  encodeAbiParameters(
    [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }],
    [found.labelhash, found.owner, found.roles],
  ),
);
