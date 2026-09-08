// Leaf hashing, JS side. Must stay byte-identical to src/Leaf.sol.
// Usage: node script/js/leaf.mjs <index> <segment>
import { encodeAbiParameters, keccak256 } from "viem";

export function leafOf(index, segment) {
  const encoded = encodeAbiParameters(
    [{ type: "uint256" }, { type: "string" }],
    [BigInt(index), segment],
  );
  return keccak256(keccak256(encoded));
}

const [index, segment] = process.argv.slice(2);
if (index === undefined || segment === undefined) {
  console.error("usage: node script/js/leaf.mjs <index> <segment>");
  process.exit(1);
}
process.stdout.write(leafOf(index, segment));
