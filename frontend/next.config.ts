import path from "node:path";
import type { NextConfig } from "next";

// The client library lives outside frontend/ on purpose: lib/citable/ is the single
// source of the leaf formula, shared by the frontend, the JS tests and the FFI entry
// points that test/ProofBridge.t.sol calls. Copying it here would be exactly the drift
// that test proves does not happen.
const citable = path.resolve(__dirname, "..", "lib", "citable");

const nextConfig: NextConfig = {
  // A fully static export: every route of this app is prerendered. Reading needs no
  // server — the chain and IPFS are read from the reader's own browser, and no route
  // here could answer differently for different people. "No service you have to trust"
  // (CONCEPT.md 5) is a claim about that path, and a pile of HTML on a CDN is the
  // strongest version of it.
  //
  // One thing does run server-side, and it is deliberately NOT here: api/pin.mjs, at the
  // repo root, which holds PINATA_JWT and pins a bundle so the CID an author registers
  // points at something. It is a Vercel function beside this export (vercel.json sets
  // framework: null), not a route of this app — an API route would force the whole thing
  // off `output: "export"` for one write-path call. It cannot forge anything either: a
  // bundle is anchored by verifyBundle against the root on chain, so that function buys
  // reachability and not trust.
  //
  // Practically it is also the only shape that deploys here. Vercel's Next builder looks
  // for `next` in the package.json at the deployment root, and the root of this repo is a
  // Foundry project. The root cannot move into frontend/ either — lib/citable/ lives
  // outside it, and Vercel refuses to reach past a root directory.
  output: "export",

  turbopack: {
    root: path.resolve(__dirname, ".."),
    resolveAlias: {
      "@citable": citable,
    },
  },
};

export default nextConfig;
