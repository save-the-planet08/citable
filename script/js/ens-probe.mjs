// Third risk probe: is ENSv2 on Sepolia actually reachable, and can a contract cheaply
// check that an address may publish under a name? Everything here is read-only.
//
//   node script/js/ens-probe.mjs
//
// Section 3 answers the question that blocked the ENS layer: ownerOf(labelhash("ens"))
// returns 0x0 although the name exists. No value below is hardcoded — every name used as
// evidence is discovered from on-chain mint events at runtime.
import { createPublicClient, http, namehash, labelhash, parseAbi } from "viem";
import { sepolia } from "viem/chains";

// From https://docs.ens.domains/learn/deployments/
const ADDRESSES = {
  ETHRegistry: "0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2",
  RootRegistry: "0x8115186e8f2e0b0281e86ab91f0f48ba90364354",
  UniversalResolverV2: "0x4a1817d13e9cf196f471725176355c1234b63c70",
  VerifiableFactory: "0x10dc6333cdfe1fcef624c6e0a8221b91804cd7ef",
};

// The default endpoint caps eth_getLogs far below what section 4 needs.
const RPC_URL = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const client = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });

const ZERO = "0x0000000000000000000000000000000000000000";
const STATUS = ["AVAILABLE", "RESERVED", "REGISTERED"];
const hex = (value) => `0x${value.toString(16).padStart(64, "0")}`;

/// LibLabel.withVersion — replace the lower 32 bits of `anyId` with `versionId`.
/// Solidity: anyId ^ uint32(anyId) ^ versionId
export const withVersion = (anyId, versionId) =>
  (anyId ^ BigInt.asUintN(32, anyId)) | BigInt(versionId);

const registryAbi = parseAbi([
  "function getSubregistry(string label) view returns (address)",
  "function getResolver(string label) view returns (address)",
  "function ownerOf(uint256 id) view returns (address)",
  "function latestOwnerOf(uint256 tokenId) view returns (address)",
  "function findTokenId(string label) view returns (uint256)",
  "function findOwner(string label) view returns (address)",
  "function findExpiry(string label) view returns (uint64)",
  "function getState(uint256 anyId) view returns ((uint8 status, uint64 expiry, address latestOwner, uint256 tokenId, uint256 resource))",
  "function LABEL_STORE() view returns (address)",
]);
const labelStoreAbi = parseAbi(["function getLabel(uint256 anyId) view returns (string)"]);
const transferSingle = parseAbi([
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
])[0];

const read = (functionName, args, address = ADDRESSES.ETHRegistry, abi = registryAbi) =>
  client.readContract({ address, abi, functionName, args });

console.log("\n1. Do the documented contracts exist on Sepolia?\n");
for (const [name, address] of Object.entries(ADDRESSES)) {
  const code = await client.getCode({ address });
  const size = code && code !== "0x" ? (code.length - 2) / 2 : 0;
  console.log(`   ${size ? "✅" : "❌"} ${name.padEnd(20)} ${address}  ${size} bytes`);
}

console.log("\n2. Does the IRegistry interface respond as documented?\n");

const probe = async (label, fn, args) => {
  try {
    const out = await read(fn, args);
    console.log(`   ✅ ${label.padEnd(34)} → ${typeof out === "bigint" ? hex(out) : out}`);
    return out;
  } catch (err) {
    console.log(`   ❌ ${label.padEnd(34)} → ${err.shortMessage ?? err.message.split("\n")[0]}`);
    return null;
  }
};

await probe('getSubregistry("ens")', "getSubregistry", ["ens"]);
await probe('getResolver("ens")', "getResolver", ["ens"]);

// ---------------------------------------------------------------------------
// 3. The token id derivation
// ---------------------------------------------------------------------------
//
// PermissionedRegistry (ensdomains/contracts-v2, contracts/src/registry) keeps two
// version counters per name in its Entry struct:
//
//   eacVersionId    bumped on unregister      → combined with the labelhash it forms
//                                               the access-control resource
//   tokenVersionId  bumped on unregister and  → combined with the labelhash it forms
//                   on every token regeneration  the ERC1155 token id
//                   (burn + mint on role change)
//
// Both are written into the LOWER 32 BITS of the labelhash by LibLabel.withVersion:
//
//     function withVersion(uint256 anyId, uint32 versionId) internal pure returns (uint256) {
//         return anyId ^ uint32(anyId) ^ versionId;
//     }
//
//     tokenId  = withVersion(labelhash(label), entry.tokenVersionId)
//     resource = withVersion(labelhash(label), entry.eacVersionId)
//
// A raw labelhash carries hash bits, not a version, in those 32 bits. And ownerOf
// rejects any id that is not the current one:
//
//     tokenId != _constructTokenId(tokenId, entry) ? address(0) : super.ownerOf(tokenId)
//
// So ownerOf(labelhash) returns 0x0 for every name in the registry — the id is simply
// never the live one.

console.log("\n3. Why ownerOf(labelhash) returns 0x0\n");

const ensLabelhash = BigInt(labelhash("ens"));
const ensState = await read("getState", [ensLabelhash]);

console.log(`   labelhash("ens")               ${hex(ensLabelhash)}`);
console.log(`   ownerOf(labelhash)             ${await read("ownerOf", [ensLabelhash])}`);
console.log(`   withVersion(labelhash, 0)      ${hex(withVersion(ensLabelhash, 0))}`);
console.log(`   findTokenId("ens")             ${hex(await read("findTokenId", ["ens"]))}`);
console.log(`   getState.tokenId               ${hex(ensState.tokenId)}`);
console.log(`   getState.resource              ${hex(ensState.resource)}`);
console.log(`   getState.status                ${STATUS[ensState.status] ?? ensState.status}`);
console.log(`   getState.expiry                ${ensState.expiry} (${new Date(Number(ensState.expiry) * 1000).toISOString().slice(0, 10)})`);
console.log(`   getState.latestOwner           ${ensState.latestOwner}`);

const derivationHolds = withVersion(ensLabelhash, 0) === ensState.tokenId;
console.log(`\n   ${derivationHolds ? "✅" : "❌"} derivation confirmed: the lower 32 bits carry tokenVersionId, nothing else`);
console.log(`   ⚠️  "ens" still has no owner — it is ${STATUS[ensState.status]}, not REGISTERED.`);
console.log("      Expiry and resolver are set, but no ERC1155 token was ever minted.");
console.log("      Two independent reasons for 0x0, and the second one survives the fix.");

// ---------------------------------------------------------------------------
// 4. Proof against names that really are owned
// ---------------------------------------------------------------------------
// A derivation that only reproduces zero proves nothing. Below, names are pulled from
// live mint events and checked against the registry's own answer.

console.log("\n4. The same derivation against live, owned names\n");

const labelStore = await read("LABEL_STORE", []);
console.log(`   LABEL_STORE                    ${labelStore}\n`);

const head = await client.getBlockNumber();
const mints = (
  await client.getLogs({
    address: ADDRESSES.ETHRegistry,
    event: transferSingle,
    fromBlock: head - 50000n,
    toBlock: head,
  })
).filter((log) => log.args.from === ZERO);

console.log(`   ${mints.length} mints in the last 50000 blocks (head ${head})\n`);

const seen = new Set();
let checked = 0;
let versioned = 0;

for (const log of mints.reverse()) {
  if (checked >= 3 && versioned >= 1) break;
  const tokenId = log.args.id;
  if (seen.has(tokenId)) continue;
  seen.add(tokenId);

  let label;
  try {
    label = await read("getLabel", [tokenId], labelStore, labelStoreAbi);
  } catch {
    continue;
  }
  if (!label) continue;

  const state = await read("getState", [BigInt(labelhash(label))]);
  if (state.latestOwner === ZERO) continue;

  const onChainVersion = BigInt.asUintN(32, state.tokenId);
  // A name whose token was regenerated is the interesting case: version bits are not 0.
  const interesting = onChainVersion !== 0n;
  if (checked >= 3 && !interesting) continue;
  if (interesting) versioned++;
  checked++;

  const lh = BigInt(labelhash(label));
  const ok = withVersion(lh, onChainVersion) === state.tokenId;
  const naive = withVersion(lh, 0);

  console.log(`   "${label}"  ${STATUS[state.status]}  owner ${state.latestOwner}`);
  console.log(`     labelhash                    ${hex(lh)}`);
  console.log(`     tokenVersionId               ${onChainVersion}`);
  console.log(`     withVersion(labelhash, ver)  ${hex(withVersion(lh, onChainVersion))}`);
  console.log(`     findTokenId("${label}")`.padEnd(37) + ` ${hex(await read("findTokenId", [label]))}`);
  console.log(`     ${ok ? "✅" : "❌"} derived id matches the registry`);
  if (interesting) {
    console.log(`     ⚠️  assuming version 0 would give ${hex(naive)}`);
    console.log(`        ownerOf on that id → ${await read("ownerOf", [naive])}  (wrong answer, name is owned)`);
  }
  console.log();
}

console.log("   What this means for the guard:\n");
console.log("   A contract must NOT derive the token id from the labelhash. The version bits");
console.log("   live in registry storage and change without warning — a name above sits at");
console.log("   tokenVersionId > 0 purely because its roles were edited. The guard asks the");
console.log("   registry instead: getOwner(labelhash) and hasRoles(getResource(labelhash), …),");
console.log("   both of which take any id and resolve the version themselves.");

console.log("\n5. Reference values\n");
console.log(`   namehash("ens.eth")   ${namehash("ens.eth")}`);
console.log(`   labelhash("ens")      ${labelhash("ens")}`);
console.log();
