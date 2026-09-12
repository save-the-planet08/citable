// Pinning a bundle, in one place.
//
// Two callers need this and they must not drift: script/js/publish.mjs on a laptop with
// .env, and api/pin.mjs on Vercel with an environment variable. A second copy of the
// upload would be a second place where `cidVersion: 1` could silently become something
// else — and that option is the whole reason the pin covers the CID that goes on chain.
//
// Nothing here decides whether a pin is required. It reports what happened and lets the
// caller decide: publish.mjs shrugs and serves locally, the Vercel function refuses the
// transaction. Those are different answers to the same failure and both are right.

const ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";

/**
 * @typedef {object} PinResult
 * @property {"pinned"|"unconfigured"|"failed"|"mismatch"} status
 * @property {string} [cid]     what Pinata returned — only on "pinned" or "mismatch"
 * @property {string} [detail]  a sentence for a human, on every failing status
 */

/**
 * Uploads `bytes` verbatim and pins them.
 *
 * The bytes are sent exactly as given. They are never parsed and re-serialised on the
 * way: bundleBytes (cid.mjs) writes JSON in object order, so a round trip through an
 * object could move a key and with it the CID — the one number that must not move.
 *
 * @param {Uint8Array} bytes  the bundle, exactly as its CID was computed over
 * @param {string} cid        the CID computed locally; the pin is checked against it
 * @param {string} [jwt]      Pinata JWT. Absent means "not configured", not an error.
 * @returns {Promise<PinResult>}
 */
export async function pinToPinata(bytes, cid, jwt) {
  if (!jwt) {
    return { status: "unconfigured", detail: "PINATA_JWT is not set" };
  }

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "application/json" }), `${cid}.json`);
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: form,
    });
  } catch (error) {
    return { status: "failed", detail: `could not reach Pinata: ${error.message}` };
  }

  if (!response.ok) {
    return {
      status: "failed",
      detail: `Pinata answered HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`,
    };
  }

  const { IpfsHash } = await response.json();

  // A different CID is not a broken pin — it is a pin of something else. Saying "pinned"
  // here would imply cover that does not exist, so it gets its own status.
  if (IpfsHash !== cid) {
    return {
      status: "mismatch",
      cid: IpfsHash,
      detail: `Pinata pinned ${IpfsHash}, which is not ${cid} — this pin does not cover the CID on chain`,
    };
  }

  return { status: "pinned", cid: IpfsHash };
}
