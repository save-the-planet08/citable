// Pinning a bundle that already exists.
//
//   node script/js/pin.mjs <bundle.json> [...]
//
// publish.mjs pins as part of publishing. This is for the other case: a bundle that was
// built somewhere else — the register screen's download, a copy from a colleague — whose
// CID is already on chain and which no node is serving. Three statements under
// wochenzeitung.eth are in exactly that state.
//
// It refuses to pin anything whose CID it cannot reproduce from the bytes. A file that
// was touched on the way is a different file, and pinning it would put a live CID next to
// a dead one and call the problem solved.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { cidV1Raw } from "../../lib/citable/cid.mjs";
import { verifyBundle } from "../../lib/citable/bundle.mjs";
import { buildTree } from "../../lib/citable/tree.mjs";
import { pinToPinata } from "../../lib/citable/pinata.mjs";

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (files.length === 0) {
  console.error("usage: node script/js/pin.mjs <bundle.json> [...]");
  process.exit(1);
}

let failed = 0;

for (const file of files) {
  console.log(`\n${file}`);

  const bytes = new Uint8Array(readFileSync(file));
  const cid = cidV1Raw(bytes);
  console.log(`  cid        ${cid}`);

  // The register screen names its download <cid>.json. When that is still the name, it is
  // a free integrity check on the bytes — and when the name says otherwise, the download
  // was altered or renamed and the author should know which.
  const named = basename(file).replace(/\.json$/, "");
  if (/^bafkrei[a-z2-7]{52}$/.test(named) && named !== cid) {
    console.error(`  ✗ the filename says ${named}, the bytes say ${cid} — not pinning this`);
    failed++;
    continue;
  }

  // Not required for pinning, but it is the difference between "some JSON" and "a bundle
  // whose root someone could have registered". Reported, not enforced: a valid bundle
  // whose root is not on chain is still worth pinning.
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  const segments = [];
  for (const s of parsed?.segments ?? []) segments[s.index] = s.text;
  const { root } = buildTree(segments);
  console.log(`  root       ${root}  (${segments.length} paragraph${segments.length === 1 ? "" : "s"})`);
  if (!verifyBundle(parsed, root)) {
    console.error("  ✗ these bytes are not a well-formed bundle — not pinning this");
    failed++;
    continue;
  }

  const result = await pinToPinata(bytes, cid, process.env.PINATA_JWT);
  if (result.status !== "pinned") {
    console.error(`  ✗ ${result.detail}`);
    failed++;
    continue;
  }
  console.log("  pinata     pinned");

  // The same second source publish.mjs writes. It buys availability, not trust — the copy
  // has to clear verifyBundle like any gateway does.
  const publicDir = join(ROOT_DIR, "frontend", "public", "bundles");
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(join(publicDir, `${cid}.json`), bytes);
  console.log(`  copy       frontend/public/bundles/${cid}.json`);
}

console.log("");
if (failed > 0) {
  console.error(`✗ ${failed} of ${files.length} not pinned\n`);
  process.exit(1);
}
