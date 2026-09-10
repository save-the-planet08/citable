// Gateway to lib/citable/.
//
// merkletreejs works on Buffer, and lib/citable/tree.mjs passes Buffers to it. Browsers
// have no Buffer, so it is installed globally here — before tree.mjs is ever evaluated.
// Static imports get hoisted above this assignment, so the library is pulled in
// dynamically instead. That is the whole reason this module exists.
import { Buffer } from "buffer";

type WithBuffer = typeof globalThis & { Buffer?: typeof Buffer };

if (typeof (globalThis as WithBuffer).Buffer === "undefined") {
  (globalThis as WithBuffer).Buffer = Buffer;
}

export type { Bundle, BundleSegment, Tree } from "@citable/index.mjs";

let cached: Promise<typeof import("@citable/index.mjs")> | undefined;

/** Loads the client library with Buffer in place. Cached — the module is evaluated once. */
export function citable() {
  cached ??= import("@citable/index.mjs");
  return cached;
}
