// Search across every statement a name has registered.
//
// The layer that makes the screen usable: nobody carries a merkle root around. They carry
// a name and a sentence. This walks the statements that name published and runs the
// existing per-statement check (verify.ts) against each.
//
// The interesting outcome is the one where nothing is found. Because the candidates were
// enumerated from the chain, the answer can name its own denominator — "not in any of the
// 12 statements registered by this name" — instead of an unqualified "no". An absence
// claim without a visible denominator is the kind of number this project refuses to make.
import { verify, type Verdict } from "./verify";
import {
  parseQuery,
  statementsByAuthor,
  statementsByName,
  SEARCH_LIMIT,
  type Query,
} from "./lookup";

/** Every query shape the search can act on — a subname is refused before it gets here. */
export type Searchable = Exclude<Query, { kind: "subname" }>;

export type SearchResult =
  /** A statement matched. The verdict carries which stage and where. */
  | { kind: "found"; query: Searchable; root: `0x${string}`; verdict: Verdict; searched: number }
  /** Nothing matched, and this is how much was looked at. */
  | {
      kind: "absent";
      query: Searchable;
      statements: number;
      paragraphs: number;
      capped: boolean;
    }
  /** The name has never registered anything. Different from "searched and not found". */
  | { kind: "no-statements"; query: Searchable }
  | { kind: "error"; message: string };

export interface Progress {
  done: number;
  total: number;
}

export async function search(
  input: string,
  fragment: string,
  onProgress?: (p: Progress) => void,
): Promise<SearchResult> {
  const query = parseQuery(input);
  if (!query) return { kind: "error", message: "Enter a name, a statement root, or an address." };
  if (query.kind === "subname") {
    return {
      kind: "error",
      message: `Citable covers second-level names only, so ${query.input} cannot be searched. Try the name it sits under.`,
    };
  }
  if (!fragment.trim()) return { kind: "error", message: "Enter the quote you want to check." };

  let roots: `0x${string}`[];
  try {
    roots = await candidates(query);
  } catch (error) {
    return {
      kind: "error",
      message: `Could not read the registry: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (roots.length === 0) {
    // A root typed by hand is still worth checking — verify reports "unregistered" itself.
    if (query.kind === "root") {
      return { kind: "found", query, root: query.root, verdict: await verify(query.root, fragment), searched: 1 };
    }
    return { kind: "no-statements", query };
  }

  const capped = roots.length > SEARCH_LIMIT;
  const shortlist = roots.slice(0, SEARCH_LIMIT);

  let paragraphs = 0;
  let bestPartial: { root: `0x${string}`; verdict: Verdict } | null = null;

  for (const [i, root] of shortlist.entries()) {
    onProgress?.({ done: i, total: shortlist.length });
    const verdict = await verify(root, fragment);

    // A word-for-word proof cannot be beaten by anything later in the list. Stop.
    if (verdict.kind === "proven") {
      onProgress?.({ done: shortlist.length, total: shortlist.length });
      return { kind: "found", query, root, verdict, searched: i + 1 };
    }

    // Keep the first partial, but keep looking — a later statement may hold the whole
    // paragraph, and a proof outranks a partial quote.
    if (verdict.kind === "partial" && !bestPartial) bestPartial = { root, verdict };

    if (verdict.kind === "no-match" || verdict.kind === "partial") paragraphs += verdict.total;

    // A broken bundle or an unreachable gateway must not be swallowed as "not found" —
    // that would turn an outage into a false absence claim.
    if (verdict.kind === "bundle-mismatch" || verdict.kind === "error") {
      if (shortlist.length === 1) return { kind: "found", query, root, verdict, searched: 1 };
    }
  }

  onProgress?.({ done: shortlist.length, total: shortlist.length });

  if (bestPartial) {
    return {
      kind: "found",
      query,
      root: bestPartial.root,
      verdict: bestPartial.verdict,
      searched: shortlist.length,
    };
  }

  return { kind: "absent", query, statements: shortlist.length, paragraphs, capped };
}

async function candidates(query: Searchable): Promise<`0x${string}`[]> {
  switch (query.kind) {
    case "root":
      return [query.root];
    case "name":
      return (await statementsByName(query.ensNode)).map((c) => c.root);
    case "author":
      return statementsByAuthor(query.address);
  }
}

/** How to name the thing that was searched, for the absence sentence. */
export function describeQuery(query: Searchable): string {
  switch (query.kind) {
    case "name":
      return `${query.label}.eth`;
    case "author":
      return `${query.address.slice(0, 6)}…${query.address.slice(-4)}`;
    case "root":
      return "this statement";
  }
}
