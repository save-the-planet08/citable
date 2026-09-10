// Registers a real second-level name on the ENSv2 ETHRegistry on Sepolia.
//
// Why this exists: the demo statement has to be registered with the name guard ARMED,
// otherwise the strongest sentence Citable can say — "this account was allowed to publish
// under this name" — is not actually demonstrated. The alternative in NIGHT.md was to
// switch the guard off for three transactions. This is better and costs the same gas.
//
// The registrar is a commit/reveal with ERC-20 payment. On Sepolia the payment token is a
// test USDC whose `mint` is public, so the whole flow costs testnet gas and nothing else.
//
//   node script/js/ens-register.mjs wochenzeitung            # simulate everything
//   node script/js/ens-register.mjs wochenzeitung --broadcast
//
// Needs PRIVATE_KEY and SEPOLIA_RPC_URL from .env.
import {
  createPublicClient,
  createWalletClient,
  http,
  labelhash,
  parseAbi,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { randomBytes } from "node:crypto";

/// Addresses read off the chain, not out of a document: script/js/ens-probe.mjs found the
/// registry, and the registrar is the operator that mints its tokens.
const ETH_REGISTRY = "0xBDC85dD5b15D7ecb354cd7cb6f2c50b4f2c4F0E2";
const REGISTRAR = "0xa88553F454b77203B0D036A05c894d555EAAa2Cc";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const NO_REFERRER = `0x${"0".repeat(64)}`;

const registrarAbi = parseAbi([
  "function isAvailable(string label) view returns (bool)",
  "function getRegisterPrice(string label, uint64 duration, address paymentToken) view returns (uint256 base, uint256 premium)",
  "function makeCommitment(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, bytes32 referrer) pure returns (bytes32)",
  "function commit(bytes32 commitment)",
  "function register(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, address paymentToken, bytes32 referrer) returns (uint256 tokenId)",
  "function MIN_COMMITMENT_AGE() view returns (uint64)",
]);

const registryAbi = parseAbi([
  "function getOwner(uint256 anyId) view returns (address)",
  "function roles(uint256 anyId, address account) view returns (uint256)",
]);

const erc20Abi = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
]);

const args = process.argv.slice(2);
const label = args.find((a) => !a.startsWith("--"));
const broadcast = args.includes("--broadcast");
const years = Number(args.find((a) => a.startsWith("--years="))?.slice(8) ?? 1);

if (!label) {
  console.error("usage: node script/js/ens-register.mjs <label> [--years=N] [--broadcast]");
  process.exit(1);
}

const rpc = process.env.SEPOLIA_RPC_URL;
const key = process.env.PRIVATE_KEY;
if (!rpc) fail("SEPOLIA_RPC_URL is not set — source .env first.");
if (!key) fail("PRIVATE_KEY is not set — source .env first.");

const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) });
const wallet = createWalletClient({ account, chain: sepolia, transport: http(rpc) });

const duration = BigInt(Math.round(years * 31536000));

console.log(`\nname       ${label}.eth`);
console.log(`owner      ${account.address}`);
console.log(`duration   ${years} year(s)`);
console.log(broadcast ? "mode       BROADCAST\n" : "mode       simulation only (add --broadcast)\n");

// ---------------------------------------------------------------------------
// 1. Is the name free, and what does it cost?
// ---------------------------------------------------------------------------

const available = await read(REGISTRAR, registrarAbi, "isAvailable", [label]);
if (!available) fail(`${label}.eth is not available.`);

// The payment token is not a constant here: it is read from the registrar's own price
// oracle by asking for a price, so a redeployment on Sepolia cannot silently break this.
const paymentToken = await findPaymentToken();
const [base, premium] = await read(REGISTRAR, registrarAbi, "getRegisterPrice", [
  label,
  duration,
  paymentToken,
]);
const price = base + premium;

const symbol = await read(paymentToken, erc20Abi, "symbol", []);
const decimals = await read(paymentToken, erc20Abi, "decimals", []);
console.log(`price      ${formatUnits(price, decimals)} ${symbol}  (${paymentToken})`);

// ---------------------------------------------------------------------------
// 2. Get the token and approve it
// ---------------------------------------------------------------------------

let balance = await read(paymentToken, erc20Abi, "balanceOf", [account.address]);
console.log(`balance    ${formatUnits(balance, decimals)} ${symbol}`);

if (balance < price) {
  const shortfall = price - balance;
  console.log(`\n→ mint ${formatUnits(shortfall, decimals)} ${symbol}`);
  await send(paymentToken, erc20Abi, "mint", [account.address, shortfall]);
  balance = broadcast ? await read(paymentToken, erc20Abi, "balanceOf", [account.address]) : price;
}

const allowance = await read(paymentToken, erc20Abi, "allowance", [account.address, REGISTRAR]);
if (allowance < price) {
  console.log(`→ approve ${formatUnits(price, decimals)} ${symbol} to the registrar`);
  await send(paymentToken, erc20Abi, "approve", [REGISTRAR, price]);
}

// ---------------------------------------------------------------------------
// 3. Commit, wait, register
// ---------------------------------------------------------------------------

// The secret binds the commitment to this run. It is generated here and never leaves the
// process — a commitment someone else can reproduce can be front-run.
const secret = `0x${randomBytes(32).toString("hex")}`;

// subregistry and resolver stay empty. The guard reads getOwner and roles only
// (src/ENSv2NameGuard.sol), and the holder passes on ownership alone.
const commitment = await read(REGISTRAR, registrarAbi, "makeCommitment", [
  label,
  account.address,
  secret,
  ZERO_ADDRESS,
  ZERO_ADDRESS,
  duration,
  NO_REFERRER,
]);
console.log(`\ncommitment ${commitment}`);
await send(REGISTRAR, registrarAbi, "commit", [commitment]);

const minAge = await read(REGISTRAR, registrarAbi, "MIN_COMMITMENT_AGE", []);
if (broadcast) {
  const wait = Number(minAge) + 5;
  console.log(`→ waiting ${wait}s for the commitment to mature`);
  await new Promise((r) => setTimeout(r, wait * 1000));
}

// `register` is the one call a dry run cannot check. It reads the commitment out of the
// registrar's storage, and in simulation nothing was committed — so it reverts with
// CommitmentTooOld no matter how correct the arguments are. Saying that is better than a
// dry run that looks like it proved something it could not.
await send(
  REGISTRAR,
  registrarAbi,
  "register",
  [label, account.address, secret, ZERO_ADDRESS, ZERO_ADDRESS, duration, paymentToken, NO_REFERRER],
  { needsCommitment: true },
);

// ---------------------------------------------------------------------------
// 4. Prove it, against the chain and against the guard's own rule
// ---------------------------------------------------------------------------

const ensNode = labelhash(label);
console.log(`\nensNode    ${ensNode}   (labelhash, NOT the v1 namehash)`);

if (!broadcast) {
  console.log("\nSimulation passed. Nothing was sent. Re-run with --broadcast.\n");
  process.exit(0);
}

const holder = await read(ETH_REGISTRY, registryAbi, "getOwner", [BigInt(ensNode)]);
const roles = await read(ETH_REGISTRY, registryAbi, "roles", [BigInt(ensNode), account.address]);
console.log(`holder     ${holder}`);
console.log(`roles      0x${roles.toString(16)}`);

if (holder.toLowerCase() !== account.address.toLowerCase()) {
  fail("registered, but getOwner does not return this account — do not rely on it");
}
console.log(`\n${label}.eth is held by this account. The guard will let it publish.\n`);

// ---------------------------------------------------------------------------

function read(address, abi, functionName, args) {
  return publicClient.readContract({ address, abi, functionName, args });
}

/// Simulates every call and only sends it with --broadcast. A revert therefore surfaces
/// before anything is spent, and a dry run exercises the identical code path.
async function send(address, abi, functionName, args, { needsCommitment = false } = {}) {
  if (!broadcast && needsCommitment) {
    console.log(`   ${functionName}: not simulated — needs a commitment that is really on chain`);
    return null;
  }
  const { request } = await publicClient.simulateContract({
    address,
    abi,
    functionName,
    args,
    account,
  });
  if (!broadcast) {
    console.log(`   simulated ok: ${functionName}`);
    return null;
  }
  const hash = await wallet.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   ${functionName} → ${hash}  (${receipt.status}, gas ${receipt.gasUsed})`);
  if (receipt.status !== "success") fail(`${functionName} reverted`);
  return receipt;
}

/// The registrar refuses an unsupported token with PaymentTokenNotSupported, so the token
/// is found by asking rather than by hardcoding: the last registration on chain names it.
async function findPaymentToken() {
  const event = parseAbi([
    "event NameRegistered(uint256 indexed tokenId, string label, address owner, address subregistry, address resolver, uint64 duration, address paymentToken, bytes32 indexed referrer, uint256 base, uint256 premium)",
  ])[0];
  const head = await publicClient.getBlockNumber();
  for (const span of [5000n, 20000n, 45000n]) {
    const logs = await publicClient.getLogs({
      address: REGISTRAR,
      event,
      fromBlock: head - span,
      toBlock: head,
    });
    if (logs.length) return logs[logs.length - 1].args.paymentToken;
  }
  fail("no recent registration found — cannot tell which payment token the registrar takes");
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}
