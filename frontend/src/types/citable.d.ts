// Type surface for lib/citable/, which is plain ESM without types.
// Keep in sync with lib/citable/index.mjs — the runtime there is authoritative.

declare module "@citable/index.mjs" {
  export interface BundleSegment {
    index: number;
    text: string;
    vector?: number[];
  }

  export interface Bundle {
    version: number;
    model: string | null;
    dim: number;
    segments: BundleSegment[];
  }

  export interface Tree {
    root: `0x${string}`;
    leaves: `0x${string}`[];
    /** bytes32[] as expected by CitableRegistry.verifySegment */
    proofFor(index: number): `0x${string}`[];
  }

  export const BUNDLE_VERSION: number;

  export function leafOf(index: number, segment: string): `0x${string}`;
  export function segment(text: string): string[];
  export function buildTree(segments: string[]): Tree;
  export function buildBundle(text: string, vectors?: number[][], model?: string): Bundle;
  export function verifyBundle(bundle: unknown, root: string): boolean;

  /** kubo's default chunk size. Past it a file is a dag-pb tree and cidV1Raw throws. */
  export const MAX_RAW_BLOCK: number;

  export function cidV1Raw(bytes: Uint8Array): string;
  export function bundleBytes(bundle: Bundle): Uint8Array;
  export function bundleCid(bundle: Bundle): string;
}
