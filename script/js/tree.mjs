// FFI entry point for test/ProofBridge.t.sol. Segments a text with the client library,
// builds the tree and returns root, segment count and the proof for one position —
// exactly what a frontend would hand to CitableRegistry.verifySegment.
//
// This is the second bridge between JS and Solidity after the leaf formula, and the most
// likely place for a silent error: a proof the contract rejects means the whole client
// is broken, however green the JS tests are.
//
// Usage: node script/js/tree.mjs <index> <text>
import { encodeAbiParameters } from "viem";
import { segment } from "../../lib/citable/segment.mjs";
import { buildTree } from "../../lib/citable/tree.mjs";

const [rawIndex, text] = process.argv.slice(2);
if (rawIndex === undefined || text === undefined) {
  console.error("usage: node script/js/tree.mjs <index> <text>");
  process.exit(1);
}

const segments = segment(text);
const { root, proofFor } = buildTree(segments);

process.stdout.write(
  encodeAbiParameters(
    [{ type: "bytes32" }, { type: "uint256" }, { type: "bytes32[]" }],
    [root, BigInt(segments.length), proofFor(Number(rawIndex))],
  ),
);
