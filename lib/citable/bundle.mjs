// The IPFS bundle: full text as segments, optionally with meaning vectors.
//
// The bundle is what a verifier downloads and rebuilds the tree from. Its anchor is the
// root on chain — verifyBundle is that anchor. Without it the bundle behind a CID could
// be swapped for any other.
import { buildTree } from "./tree.mjs";
import { segment } from "./segment.mjs";

export const BUNDLE_VERSION = 1;

/// @param {string} text        the statement, verbatim
/// @param {number[][]} [vectors] one vector per segment, same order
/// @param {string} [model]     model identifier — without it a percentage is not
///                             reproducible, so vectors without a model are refused
export function buildBundle(text, vectors, model) {
  const segments = segment(text);
  if (segments.length === 0) throw new Error("buildBundle: text has no segments");

  if (vectors === undefined || vectors === null) {
    return {
      version: BUNDLE_VERSION,
      model: null,
      dim: 0,
      segments: segments.map((s, index) => ({ index, text: s })),
    };
  }

  if (!model) throw new Error("buildBundle: vectors without a model identifier");
  if (vectors.length !== segments.length) {
    throw new Error(`buildBundle: ${vectors.length} vectors for ${segments.length} segments`);
  }
  const dim = vectors[0].length;
  if (vectors.some((v) => v.length !== dim)) {
    throw new Error("buildBundle: vectors of differing length");
  }

  return {
    version: BUNDLE_VERSION,
    model,
    dim,
    segments: segments.map((s, index) => ({ index, text: s, vector: vectors[index] })),
  };
}

/// Rebuild the tree from the bundle and compare against the root registered on chain.
/// @returns {boolean}
export function verifyBundle(bundle, root) {
  if (!bundle || bundle.version !== BUNDLE_VERSION) return false;
  if (!Array.isArray(bundle.segments) || bundle.segments.length === 0) return false;

  // The array order is not trusted — the index field is. Sorted pairs would hide a swap
  // of two siblings, the index inside the leaf would not.
  const byIndex = new Array(bundle.segments.length);
  for (const s of bundle.segments) {
    if (!Number.isInteger(s?.index) || s.index < 0 || s.index >= byIndex.length) return false;
    if (typeof s.text !== "string") return false;
    if (byIndex[s.index] !== undefined) return false;
    byIndex[s.index] = s.text;
  }

  return buildTree(byIndex).root.toLowerCase() === String(root).toLowerCase();
}
