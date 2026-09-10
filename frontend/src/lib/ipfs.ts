// Getting the bundle behind a CID.
//
// Reading needs no key and no account — public gateways are enough. Only pinning does.
//
// Every source is tried at once and the first one whose bytes REBUILD THE ROOT wins. That
// ordering is the whole design: a bundle is not trusted because of where it came from, it
// is trusted because verifyBundle anchors it to the root on chain. So a fast source costs
// nothing, and a source serving the wrong bytes cannot win the race — it is discarded and
// the others keep going.
//
// That is what makes the last source defensible. Until a pinning service is configured,
// the only node holding these bundles is the machine that published them, and a CID no
// node serves is a dead link. So the app ships a copy of every bundle it published and
// serves it from its own origin. It buys availability, not trust: the copy has to clear
// the same check as a gateway, and a tampered copy loses the race instead of winning it.
//
// Configuring Pinata is therefore one environment variable and no code change:
//   NEXT_PUBLIC_IPFS_GATEWAYS=https://<subdomain>.mypinata.cloud/ipfs/,https://ipfs.io/ipfs/

const DEFAULT_GATEWAYS = ["https://w3s.link/ipfs/", "https://ipfs.io/ipfs/"];

const GATEWAYS = (process.env.NEXT_PUBLIC_IPFS_GATEWAYS ?? "")
  .split(",")
  .map((g) => g.trim())
  .filter(Boolean);

const TIMEOUT_MS = 12_000;

/** How long the app's own copy waits before joining the race. See fetchBundle. */
const LOCAL_HANDICAP_MS = 1_500;

/**
 * No source produced a bundle that rebuilds the root.
 *
 * `served` tells the two failures apart, and they mean opposite things. False: nobody
 * answered — an outage, and nothing is proven or disproven. True: something answered with
 * bytes that are not this statement's — the content behind the CID was swapped, or the
 * CID points elsewhere. Showing the second message for the first case would accuse a
 * publisher of tampering because a gateway was down.
 */
export class BundleFetchError extends Error {
  readonly served: boolean;
  constructor(message: string, served: boolean) {
    super(message);
    this.served = served;
  }
}

/** Where a bundle came from. Shown in the apparatus — the reader gets to see it. */
export interface FetchedBundle {
  data: unknown;
  source: string;
  /** True when the app served its own copy rather than a public gateway. */
  local: boolean;
}

/** Strips ipfs:// and any /ipfs/ prefix — CIDs are stored on chain in varying shapes. */
export function normaliseCid(cid: string): string {
  return cid
    .trim()
    .replace(/^ipfs:\/\//, "")
    .replace(/^\/?ipfs\//, "");
}

function sources(cid: string): { url: string; label: string; local: boolean }[] {
  const gateways = GATEWAYS.length > 0 ? GATEWAYS : DEFAULT_GATEWAYS;
  return [
    ...gateways.map((gateway) => ({
      url: gateway + cid,
      label: new URL(gateway).host,
      local: false,
    })),
    { url: `/bundles/${cid}.json`, label: "this app's own copy", local: true },
  ];
}

/**
 * @param accept  must return true for the bundle to count. Pass the root check here —
 *                a source that fails it is treated as if it had not answered at all.
 */
export async function fetchBundle(
  cid: string,
  accept: (data: unknown) => boolean,
): Promise<FetchedBundle> {
  const id = normaliseCid(cid);
  if (!id) throw new BundleFetchError("The statement carries no CID.", false);

  // Set by any source that answered with a readable bundle which then failed the root
  // check. That is the difference between "unreachable" and "wrong content".
  let served = false;

  const attempts = sources(id).map(async ({ url, label, local }) => {
    // The local copy starts a beat late on purpose. It would win every race otherwise,
    // and then the public network would never be exercised — the screen would say "own
    // copy" even where IPFS was working perfectly. Long enough for a warm gateway to get
    // there first, short enough that nobody watches a spinner for it.
    if (local) await new Promise((r) => setTimeout(r, LOCAL_HANDICAP_MS));

    let data: unknown;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
    } catch (error) {
      throw new Error(`${label} → ${error instanceof Error ? error.message : String(error)}`);
    }
    // Reached the source but the bytes are not this statement's. Louder than a 404: it
    // means something is serving a different file under this CID.
    if (!accept(data)) {
      served = true;
      throw new Error(`${label} → served bytes that do not rebuild the root`);
    }
    return { data, source: label, local };
  });

  // First source whose bytes rebuild the root wins; the rest are abandoned mid-flight.
  // Promise.any rejects only when every one of them failed.
  try {
    return await Promise.any(attempts);
  } catch (error) {
    const failures = (error as AggregateError).errors.map((e) =>
      e instanceof Error ? e.message : String(e),
    );
    throw new BundleFetchError(
      `No source delivered a bundle for this CID:\n${failures.join("\n")}`,
      served,
    );
  }
}
