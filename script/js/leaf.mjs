// FFI entry point for test/Leaf.t.sol. The formula itself lives in lib/citable/leaf.mjs —
// a second copy here would be a second thing to keep in sync.
// Usage: node script/js/leaf.mjs <index> <segment>
import { leafOf } from "../../lib/citable/leaf.mjs";

const [index, segment] = process.argv.slice(2);
if (index === undefined || segment === undefined) {
  console.error("usage: node script/js/leaf.mjs <index> <segment>");
  process.exit(1);
}
process.stdout.write(leafOf(index, segment));
