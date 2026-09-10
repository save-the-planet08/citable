// The three stages from CONCEPT.md section 4, as one pure-ish function so the screen only
// renders and never decides.
//
// Order matters and is not an optimisation: the bundle is checked against the root first.
// A bundle that does not rebuild the root is not this statement's bundle, and nothing it
// says may be shown — otherwise anyone could swap the content behind a CID.
import { citable, type Bundle } from "./citable";
import { fetchBundle, BundleFetchError, type FetchedBundle } from "./ipfs";
import { getStatement, verifySegmentOnChain, type Statement } from "./chain";

/**
 * Where the bundle came from, carried through to the panel.
 *
 * Part of the apparatus, not a debug field: which source answered is exactly the kind of
 * thing a reader is entitled to see, and the honest place to admit that the app served
 * its own copy rather than the public network.
 */
export interface Provenance {
  source: string;
  local: boolean;
}

export type Verdict =
  /** Stage 1: the fragment is a whole paragraph, and the chain confirmed the proof. */
  | {
      kind: "proven";
      statement: Statement;
      index: number;
      total: number;
      segment: string;
      before: string | null;
      after: string | null;
      proof: `0x${string}`[];
      via: Provenance;
    }
  /** Stage 2: the fragment sits inside a paragraph, but is not the whole one. */
  | {
      kind: "partial";
      statement: Statement;
      index: number;
      total: number;
      full: string;
      via: Provenance;
    }
  /**
   * Neither. Explicitly not "made up" — see CONCEPT.md section 6.
   *
   * Carries the paragraphs so stage 3 can measure against them without fetching the
   * bundle a second time. They are safe to pass on: verifyBundle already held every one
   * of them against the root.
   */
  | { kind: "no-match"; statement: Statement; total: number; via: Provenance; texts: string[] }
  | { kind: "unregistered" }
  /** Some source answered, but its bytes do not rebuild the root. Nothing from it is shown. */
  | { kind: "bundle-mismatch"; statement: Statement; detail: string }
  | { kind: "error"; message: string };

/** Same normalisation the segmenter applies, so stage 1 compares like against like. */
function normalise(text: string): string {
  return text.trim();
}

export async function verify(root: `0x${string}`, fragment: string): Promise<Verdict> {
  const needle = normalise(fragment);
  if (!needle) return { kind: "error", message: "Enter a fragment to check." };

  let statement: Statement | null;
  try {
    statement = await getStatement(root);
  } catch (error) {
    return { kind: "error", message: `Chain not reachable: ${message(error)}` };
  }
  if (!statement) return { kind: "unregistered" };

  const { verifyBundle, buildTree } = await citable();

  // The anchor, and it is handed to the fetch rather than run after it: several sources
  // are raced, and a source that serves bytes which do not rebuild the root loses the
  // race instead of ending the search. So a copy served by this app is worth no more than
  // a public gateway — both have to clear the same check to be believed.
  let fetched: FetchedBundle;
  try {
    fetched = await fetchBundle(statement.cid, (data) => verifyBundle(data, root));
  } catch (error) {
    // Two different failures wear the same exception. Something answering with the wrong
    // bytes is an accusation; nothing answering at all is an outage. Saying the first when
    // the second happened would charge a publisher with tampering because a gateway was
    // down, so the flag decides and not the convenience of one code path.
    if (error instanceof BundleFetchError && error.served) {
      return { kind: "bundle-mismatch", statement, detail: error.message };
    }
    return { kind: "error", message: message(error) };
  }

  const bundle = fetched.data as Bundle;
  const via: Provenance = { source: fetched.source, local: fetched.local };
  // verifyBundle already proved index and text of every segment, so the array order can be
  // relied on once it is sorted by the field it verified.
  const texts = [...bundle.segments].sort((a, b) => a.index - b.index).map((s) => s.text);
  const total = texts.length;

  // Stage 1 — verbatim paragraph, proof checked on chain.
  const exact = texts.findIndex((t) => t === needle);
  if (exact !== -1) {
    const proof = buildTree(texts).proofFor(exact);
    let ok: boolean;
    try {
      ok = await verifySegmentOnChain(root, exact, texts[exact], proof);
    } catch (error) {
      return { kind: "error", message: `Chain rejected the proof call: ${message(error)}` };
    }
    if (ok) {
      return {
        kind: "proven",
        statement,
        index: exact,
        total,
        segment: texts[exact],
        before: exact > 0 ? texts[exact - 1] : null,
        after: exact + 1 < total ? texts[exact + 1] : null,
        proof,
        via,
      };
    }
    // The bundle rebuilt the root, so a rejected proof means the two disagree about the
    // tree — a real bug, not a bad quote. Say so rather than falling through to stage 2.
    return {
      kind: "error",
      message: "The bundle matches the root, but the contract rejected the proof. This is a bug.",
    };
  }

  // Stage 2 — the fragment is contained in a paragraph, but is not the whole paragraph.
  const inside = texts.findIndex((t) => t.includes(needle));
  if (inside !== -1) {
    return { kind: "partial", statement, index: inside, total, full: texts[inside], via };
  }

  return { kind: "no-match", statement, total, via, texts };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
