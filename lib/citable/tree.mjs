// Merkle tree over the leaves of a statement.
//
// sortPairs: true matches OpenZeppelin's MerkleProof, which hashes sibling pairs in
// ascending order. sortLeaves stays off — the leaf order is the segment order, and the
// tree shape depends on it.
import { MerkleTree } from "merkletreejs";
import { keccak256 } from "viem";
import { leafOf } from "./leaf.mjs";

const hashFn = (data) => Buffer.from(keccak256(new Uint8Array(data), "bytes"));

/// @param {string[]} segments
/// @returns {{ root: `0x${string}`, leaves: `0x${string}`[], proofFor: (i: number) => `0x${string}`[] }}
export function buildTree(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("buildTree: need at least one segment");
  }

  const leaves = segments.map((s, i) => leafOf(i, s));
  const tree = new MerkleTree(
    leaves.map((l) => Buffer.from(l.slice(2), "hex")),
    hashFn,
    { sortPairs: true },
  );

  return {
    root: `0x${tree.getRoot().toString("hex")}`,
    leaves,
    /// @returns bytes32[] as expected by CitableRegistry.verifySegment
    proofFor(index) {
      if (!Number.isInteger(index) || index < 0 || index >= leaves.length) {
        throw new Error(`proofFor: index ${index} out of range (0..${leaves.length - 1})`);
      }
      // Pass the index too: getProof by value alone would be ambiguous for equal leaves.
      return tree
        .getProof(Buffer.from(leaves[index].slice(2), "hex"), index)
        .map((node) => `0x${node.data.toString("hex")}`);
    },
  };
}
