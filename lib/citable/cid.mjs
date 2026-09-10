// The CID of a bundle, computed without kubo and without an account.
//
// A file that fits in one chunk is stored by IPFS as a single raw block, and its CID is
// then nothing but the hash with four bytes of header:
//
//   CIDv1 = base32( 0x01 0x55 0x12 0x20 || sha256(bytes) )
//           version │ raw │ sha2-256 │ 32 bytes
//
// That is why this file exists: the register screen runs in the browser, where there is
// no kubo and no pinning key, and it still has to show the author the CID it is about to
// write on chain. `script/js/publish.mjs` cross-checks the result against what kubo
// actually returns, so the two cannot drift apart unnoticed.
//
// This is NOT a general IPFS implementation. Above the chunk size kubo builds a dag-pb
// tree over several blocks and the formula no longer holds — so that case throws rather
// than returning a CID that looks right and points nowhere.
import { sha256 } from "viem";

/// kubo's default chunker. Beyond this a file is no longer a single raw block.
export const MAX_RAW_BLOCK = 262144;

const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";

/// RFC 4648 base32, lowercase, unpadded — the "b" multibase alphabet.
function base32(bytes) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

/// @param {Uint8Array} bytes  the file, exactly as it will be uploaded
/// @returns {string} the CIDv1 kubo would give this file with --cid-version 1
export function cidV1Raw(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new Error("cidV1Raw: expected Uint8Array");
  if (bytes.length > MAX_RAW_BLOCK) {
    throw new Error(
      `cidV1Raw: ${bytes.length} bytes exceeds the ${MAX_RAW_BLOCK}-byte chunk size — ` +
        "such a file is a dag-pb tree, not a raw block, and this formula would be wrong",
    );
  }
  const digest = sha256(bytes, "bytes");
  const cid = new Uint8Array(4 + digest.length);
  cid.set([0x01, 0x55, 0x12, 0x20]);
  cid.set(digest, 4);
  return `b${base32(cid)}`;
}

/// The bytes of a bundle, as uploaded.
///
/// Compact JSON, because a bundle with vectors is mostly digits and pretty-printing them
/// costs a third of the file. The byte order follows the object, so a bundle rebuilt with
/// different key order hashes differently — that is not a security property: what anchors
/// a bundle to a statement is verifyBundle against the root, never a recomputed CID.
/// @returns {Uint8Array}
export function bundleBytes(bundle) {
  return new TextEncoder().encode(JSON.stringify(bundle));
}

/// Convenience: the CID of a bundle object.
export function bundleCid(bundle) {
  return cidV1Raw(bundleBytes(bundle));
}
