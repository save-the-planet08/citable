import path from "node:path";
import type { NextConfig } from "next";

// The client library lives outside frontend/ on purpose: lib/citable/ is the single
// source of the leaf formula, shared by the frontend, the JS tests and the FFI entry
// points that test/ProofBridge.t.sol calls. Copying it here would be exactly the drift
// that test proves does not happen.
const citable = path.resolve(__dirname, "..", "lib", "citable");

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
    resolveAlias: {
      "@citable": citable,
    },
  },
};

export default nextConfig;
