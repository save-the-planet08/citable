// Reading needs no key and no account — public gateways are enough. Only pinning does,
// and that is not part of the verify screen.
//
// Two gateways, tried in order: one of them is regularly slow or rate limited, and a
// verify screen that hangs on a gateway looks like a broken proof.
const GATEWAYS = ["https://w3s.link/ipfs/", "https://ipfs.io/ipfs/"];

const TIMEOUT_MS = 12_000;

export class BundleFetchError extends Error {}

/** Strips ipfs:// and any /ipfs/ prefix — CIDs are stored on chain in varying shapes. */
export function normaliseCid(cid: string): string {
  return cid
    .trim()
    .replace(/^ipfs:\/\//, "")
    .replace(/^\/?ipfs\//, "");
}

export async function fetchBundle(cid: string): Promise<unknown> {
  const id = normaliseCid(cid);
  if (!id) throw new BundleFetchError("The statement carries no CID.");

  const failures: string[] = [];

  for (const gateway of GATEWAYS) {
    try {
      const response = await fetch(gateway + id, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        failures.push(`${gateway} → HTTP ${response.status}`);
        continue;
      }
      return await response.json();
    } catch (error) {
      failures.push(`${gateway} → ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new BundleFetchError(`No gateway delivered the bundle:\n${failures.join("\n")}`);
}
