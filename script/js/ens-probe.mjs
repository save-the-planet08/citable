// Third risk probe: is ENSv2 on Sepolia actually reachable, and can a contract cheaply
// check that an address may publish under a name? Everything here is read-only.
//
//   node script/js/ens-probe.mjs
import { createPublicClient, http, namehash, labelhash } from "viem";
import { sepolia } from "viem/chains";

// From https://docs.ens.domains/learn/deployments/
const ADDRESSES = {
  ETHRegistry: "0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2",
  RootRegistry: "0x8115186e8f2e0b0281e86ab91f0f48ba90364354",
  UniversalResolverV2: "0x4a1817d13e9cf196f471725176355c1234b63c70",
  VerifiableFactory: "0x10dc6333cdfe1fcef624c6e0a8221b91804cd7ef",
};

const client = createPublicClient({ chain: sepolia, transport: http() });

console.log("\n1. Do the documented contracts exist on Sepolia?\n");
for (const [name, address] of Object.entries(ADDRESSES)) {
  const code = await client.getCode({ address });
  const size = code && code !== "0x" ? (code.length - 2) / 2 : 0;
  console.log(`   ${size ? "✅" : "❌"} ${name.padEnd(20)} ${address}  ${size} bytes`);
}

// The interfaces we would need. If these calls decode, a contract can use them too.
const registryAbi = [
  { type: "function", name: "getSubregistry", stateMutability: "view", inputs: [{ name: "label", type: "string" }], outputs: [{ type: "address" }] },
  { type: "function", name: "getResolver", stateMutability: "view", inputs: [{ name: "label", type: "string" }], outputs: [{ type: "address" }] },
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "address" }] },
];

console.log("\n2. Does the IRegistry interface respond as documented?\n");

const probe = async (label, fn, args) => {
  try {
    const out = await client.readContract({
      address: ADDRESSES.ETHRegistry,
      abi: registryAbi,
      functionName: fn,
      args,
    });
    console.log(`   ✅ ${label.padEnd(34)} → ${out}`);
    return out;
  } catch (err) {
    console.log(`   ❌ ${label.padEnd(34)} → ${err.shortMessage ?? err.message.split("\n")[0]}`);
    return null;
  }
};

await probe('getSubregistry("ens")', "getSubregistry", ["ens"]);
await probe('getResolver("ens")', "getResolver", ["ens"]);

// If names are ERC1155Singleton tokens, ownerOf(tokenId) is the ownership check a
// third-party contract would make. The token id is derived from the label.
const id = BigInt(labelhash("ens"));
await probe("ownerOf(labelhash('ens'))", "ownerOf", [id]);

console.log("\n3. Reference values\n");
console.log(`   namehash("ens.eth")   ${namehash("ens.eth")}`);
console.log(`   labelhash("ens")      ${labelhash("ens")}`);
console.log();
