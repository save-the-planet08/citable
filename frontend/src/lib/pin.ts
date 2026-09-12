// Asking the deployment to keep the bytes.
//
// The register screen computes the CID here in the browser but has no key to make anything
// serve it. api/pin.mjs has one. This is the whole conversation between them.
//
// Three outcomes, kept apart on purpose, because they ask the author for different things:
//
//   pinned       — the bytes are served. Carry on to the transaction.
//   unavailable  — there is no endpoint here (next dev, or a deployment without a key).
//                  Not a fault of the bundle. The screen asks for the download instead.
//   failed       — there is an endpoint and it said no. Same fallback, different sentence,
//                  because "nobody is listening" and "somebody refused" are not the same
//                  news — the second one may mean the bundle itself was rejected.

/** Must match ROOT_HEADER in api/pin.mjs. A drift surfaces as a loud 400, not silence. */
const ROOT_HEADER = "x-citable-root";

export type PinOutcome =
  | { status: "pinned"; cid: string }
  | { status: "unavailable"; detail: string }
  | { status: "failed"; detail: string };

/**
 * @param bytes  the bundle, exactly as its CID was computed over
 * @param root   the root these bytes rebuild — the endpoint checks it before pinning
 * @param cid    what this browser computed. The answer is held against it.
 */
export async function pinBundle(
  bytes: Uint8Array,
  root: `0x${string}`,
  cid: string,
): Promise<PinOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/pin", {
      method: "POST",
      headers: { "content-type": "application/octet-stream", [ROOT_HEADER]: root },
      body: bytes as BodyInit,
    });
  } catch (error) {
    return { status: "unavailable", detail: error instanceof Error ? error.message : String(error) };
  }

  // A static export serves index.html for unknown paths, so a missing function can arrive
  // as a 200 full of HTML. Anything that is not the JSON contract counts as "no endpoint".
  if (response.status === 404 || response.status === 405) {
    return { status: "unavailable", detail: "this deployment has no pinning endpoint" };
  }

  let body: { cid?: string; error?: string };
  try {
    body = await response.json();
  } catch {
    return { status: "unavailable", detail: "this deployment has no pinning endpoint" };
  }

  if (response.status === 503) {
    return { status: "unavailable", detail: body.error ?? "no pinning key configured" };
  }
  if (!response.ok) {
    return { status: "failed", detail: body.error ?? `HTTP ${response.status}` };
  }

  // The browser does not take the server's word for the CID. It computed the same number
  // from the same bytes, and that number is what goes on chain — if the two disagree, the
  // pin does not cover what would be registered, and nothing may be registered.
  if (body.cid !== cid) {
    return {
      status: "failed",
      detail: `the endpoint reports ${body.cid}, this browser computed ${cid} — not registering against a pin that covers something else`,
    };
  }

  return { status: "pinned", cid };
}
