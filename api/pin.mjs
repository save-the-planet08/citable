// The one thing the register screen cannot do itself: keep the bytes.
//
// A CID on chain is a promise that somebody is serving those bytes. The register screen
// computes the CID in the browser and has no key to make good on that promise, so until
// now it made the author download the bundle and pin it by hand. They did not. Three
// statements stand on chain under wochenzeitung.eth whose CIDs no node serves.
//
// This function closes that gap. It holds PINATA_JWT, which never reaches a browser, and
// it pins a bundle on the author's behalf BEFORE the transaction is offered.
//
// Why this is not a service you have to trust:
//
//   Reading is untouched. A verifier still fetches the bundle, rebuilds the tree and
//   compares against the root on chain (lib/citable/bundle.mjs, verifyBundle). This
//   function can make a bundle reachable or fail to — it cannot make a false one pass.
//   Tampered bytes lose the race in frontend/src/lib/ipfs.ts instead of being believed.
//
//   It is still a second point of centralisation next to the registry owner, and the
//   README says so rather than talking around it.
//
// Why it lives in api/ at the repo root and not in frontend/: frontend/next.config.ts is
// output: "export", which has no route handlers at all. vercel.json sets framework: null,
// and Vercel then builds this directory as a standalone function beside the static export.
import { cidV1Raw } from "../lib/citable/cid.mjs";
import { verifyBundle } from "../lib/citable/bundle.mjs";
import { pinToPinata } from "../lib/citable/pinata.mjs";

/** The header the client states its expected root in. */
export const ROOT_HEADER = "x-citable-root";

/**
 * Is this a bundle, and is it the bundle the client says it is?
 *
 * The check exists to keep this endpoint from being a free file host. It is a gate, not a
 * security boundary: anyone can build a well-formed bundle over any text. What it does
 * rule out is uploading arbitrary bytes through it.
 *
 * @param {Uint8Array} bytes  the body, exactly as received
 * @param {string} root       the root the client expects these bytes to rebuild
 * @returns {{ok: true, cid: string} | {ok: false, reason: string}}
 */
export function checkBundle(bytes, root) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(root ?? "")) {
    return { ok: false, reason: `${ROOT_HEADER} must be a 32-byte hex root` };
  }

  // Throws past 256 KB rather than returning a CID that would point nowhere — see
  // lib/citable/cid.mjs. A bundle that large is a dag-pb tree and this whole path is wrong
  // for it, so the error is the right answer.
  let cid;
  try {
    cid = cidV1Raw(bytes);
  } catch (error) {
    return { ok: false, reason: error.message };
  }

  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return { ok: false, reason: "the body is not UTF-8 JSON" };
  }

  if (!verifyBundle(parsed, root)) {
    return { ok: false, reason: "these bytes do not rebuild the root they claim" };
  }

  return { ok: true, cid };
}

/**
 * Reads the body as bytes, without a round trip through an object.
 *
 * bundleBytes (lib/citable/cid.mjs) serialises JSON in object order, so parsing and
 * re-serialising here could move a key and with it the CID. Everything downstream —
 * the pin, the chain, the verifier — hangs off those exact bytes.
 */
async function readBody(req) {
  if (Buffer.isBuffer(req.body)) return new Uint8Array(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return new Uint8Array(Buffer.concat(chunks));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST a bundle here." });
  }

  const bytes = await readBody(req);
  if (bytes.length === 0) {
    return res.status(400).json({ error: "empty body" });
  }

  const check = checkBundle(bytes, req.headers[ROOT_HEADER]);
  if (!check.ok) {
    return res.status(400).json({ error: check.reason });
  }

  const result = await pinToPinata(bytes, check.cid, process.env.PINATA_JWT);

  // Three failures that mean three different things to the author, so they do not share a
  // status code. Unconfigured is this deployment's fault and nothing is wrong with the
  // bundle; the screen falls back to the download for it.
  if (result.status === "unconfigured") {
    return res.status(503).json({ error: "This deployment has no pinning key.", cid: check.cid });
  }
  if (result.status === "failed") {
    return res.status(502).json({ error: result.detail, cid: check.cid });
  }
  if (result.status === "mismatch") {
    return res.status(502).json({ error: result.detail, cid: check.cid });
  }

  return res.status(200).json({ cid: check.cid });
}
