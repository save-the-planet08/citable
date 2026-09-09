// The leaf formula. One of the two invariants of the project.
//
//   leaf = keccak256(keccak256(abi.encode(uint256 index, string segment)))
//
// Must stay byte-identical to src/Leaf.sol. test/Leaf.t.sol proves it by calling
// script/js/leaf.mjs over FFI and comparing against Leaf.leafOf — no fixture, so the
// two sides cannot drift apart unnoticed.
//
// The index sits inside the leaf because merkletreejs sorts sibling pairs
// (sortPairs: true) and would otherwise lose the order. A sorted proof shows
// membership, not position. The double hash is the OpenZeppelin convention against
// second-preimage attacks.
import { encodeAbiParameters, keccak256 } from "viem";

/// @returns {`0x${string}`} the leaf binding `segment` to position `index`
export function leafOf(index, segment) {
  return keccak256(
    keccak256(
      encodeAbiParameters([{ type: "uint256" }, { type: "string" }], [BigInt(index), segment]),
    ),
  );
}
