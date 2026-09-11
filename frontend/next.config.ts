import path from "node:path";
import type { NextConfig } from "next";

// The client library lives outside frontend/ on purpose: lib/citable/ is the single
// source of the leaf formula, shared by the frontend, the JS tests and the FFI entry
// points that test/ProofBridge.t.sol calls. Copying it here would be exactly the drift
// that test proves does not happen.
const citable = path.resolve(__dirname, "..", "lib", "citable");

const nextConfig: NextConfig = {
  // A fully static export: every route of this app is prerendered, because there is
  // nothing for a server to do. No API route, no server-side data, no secret — the chain
  // and IPFS are read from the reader's own browser.
  //
  // It is also what makes the deployment honest. "No service you have to trust" is the
  // claim in CONCEPT.md 5, and a pile of HTML on a CDN is the strongest version of it:
  // there is no runtime that could answer differently for different people.
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
