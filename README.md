# Citable

**Verifiable publishing with position proofs — and an honest answer when there is no proof.**

ETHOnline 2026 · Track: Start Fresh · Sepolia

---

## The problem

Quoting out of context is the most common form of disinformation, and there is no
infrastructure against it. A link breaks when the original is deleted. A screenshot can be
forged by anyone. And the moment a quote crosses a language border, even a careful reader
has no way to check it.

Citable does not ask *"is this quote real?"* It answers a different question:
**"here is the proof that I quoted correctly."**

## How it works

A statement is split into paragraphs at blank lines. Each paragraph is bound to its
position and hashed into a merkle tree; only the 32-byte root goes on chain, together with
the author, an ENS node, a timestamp and the CID of an IPFS bundle holding the full text.

```
leaf = keccak256(keccak256(abi.encode(uint256 index, string segment)))
```

The index sits *inside* the leaf. `merkletreejs` sorts sibling pairs, which discards their
order — without the index in the leaf, a proof would show membership but not position, and
position is the entire point.

Verification runs as a cascade, and each stage answers a different question:

| Stage | Question | Nature |
|---|---|---|
| 1 · Wording | Is this paragraph in the statement, at which position? | **proof** |
| 2 · Excerpt | Is the fragment cut out of a paragraph? | **fact** |
| 3 · Coverage | Is the claim covered by the text, in any language? | **measurement** |

Stage 3 exists because translations and rewordings share no bytes with the original. It
uses embeddings to find candidates and an NLI model to judge whether the claim is actually
*covered* — not merely on the same topic. The distinction matters: measured on 16 cases,
plain similarity rated a distorted quote (0.880) higher than a faithful translation
(0.877). Entailment plus a deterministic value check separates them by 0.235.

A stage-3 percentage means **"no distorted quote in our test set reached this score"** —
not "83% true". The paragraph is always shown in full next to it, so the reader judges.

## Segmentation rule

Verifier and author must build the same tree, so the rule is fixed and deliberately dumb:

- split on `\n\n` (blank line) — paragraphs, not sentences
- trim whitespace at both ends of each segment
- drop empty segments
- UTF-8, no normalisation

Sentence boundary detection is language-dependent and two implementations disagree.
Paragraphs are unambiguous. This costs granularity and saves a day of debugging.

## Why a blockchain

Publicly readable, writable without permission, and not retroactively alterable by anyone.
A registry run by a company would introduce exactly the central authority this project
exists to avoid. There is no database and no server: the verifier fetches the text, rebuilds
the tree locally and produces the proof themselves.

## Identity: who may claim a name

`registerRoot` used to take an `ensNode` and never look at it — anyone could publish under
anyone's name. The check now sits behind `INameGuard`, and `ENSv2NameGuard` implements it
against the real ENSv2 registry on Sepolia.

It is not a pure ownership check. The name holder may publish, and so may anyone the holder
granted the publish role to. That is what a newsroom actually looks like: a volunteer
publishes under the newspaper's name without owning it. Every `.eth` registration on
Sepolia grants its holder `ROLE_SET_RESOLVER` together with the admin bit for it, so the
delegation is real and the fork test asserts it rather than assuming it.

Two details cost the most time and are worth writing down:

- **Token ids are not labelhashes.** ENSv2 keeps `tokenVersionId` in the lower 32 bits of
  the id, so `ownerOf(labelhash(name))` returns `0x0` for *every* name. A live name on
  Sepolia currently sits at version 9. The guard therefore never derives an id; it asks
  the registry, which resolves the version itself. `script/js/ens-probe.mjs` proves this
  against names it discovers from mint events.
- **`ensNode` is the ENSv2 id of a name — `labelhash(label)`, not an ENSv1 namehash.** A
  namehash cannot be turned back into a label, and without the label the registry finds no
  entry. Version 1 therefore covers the names of one registry; subnames would need a walk
  down `getSubregistry`.

## Status

Honest state of the repository, not a plan.

| | |
|---|---|
| Leaf hashing, JS ↔ Solidity parity proven | ✅ 6 tests |
| `CitableRegistry` with position proofs | ✅ 10 tests |
| Client library (segment, tree, bundle) | ✅ 41 JS tests |
| JS-built proofs accepted by the contract | ✅ 4 tests |
| ENSv2 token id derivation resolved | ✅ `script/js/ens-probe.mjs` |
| `INameGuard` gate on `registerRoot` | ✅ 9 tests |
| `ENSv2NameGuard` incl. Sepolia fork test | ✅ 15 + 5 tests |
| Layer 3 approach measured and chosen | ✅ 3 probe scripts |
| Deployment to Sepolia | ❌ script ready, not broadcast |
| Frontend | ❌ not yet |

## Run it

```bash
forge install
npm install          # required: the parity tests shell out to the JS implementation
forge test           # 44 tests; 5 more when SEPOLIA_RPC_URL is set
npm test             # 41 client library tests

cp .env.example .env # SEPOLIA_RPC_URL enables the ENSv2 fork test
node script/js/ens-probe.mjs          # ENSv2 reachability and token id derivation
node script/js/entailment-eval.mjs    # layer 3 evaluation, downloads a model on first run
```

## Deploy

```bash
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL                       # dry run
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY --broadcast --verify                                 # for real
```

It deploys `CitableRegistry`, then `ENSv2NameGuard`, wires them and writes
`deployments/<chainid>.json`. A dry run writes nothing.

| Contract | Sepolia |
|---|---|
| `CitableRegistry` | not deployed yet |
| `ENSv2NameGuard` | not deployed yet |
| ENSv2 `ETHRegistry` | `0xBDC85dD5b15D7ecb354cd7cb6f2c50b4f2c4F0E2` |

## Limitations

- **Stage 3 is a measurement, not a proof.** It can be wrong, and it is labelled as such.
- **Spanish is weak** (0.562 vs 0.821 for English) and would be rejected at threshold 0.80.
  A false negative — annoying, not dangerous.
- **16 test cases are a signal, not a validation.** Real confidence needs 50–100.
- **Irony and quote-within-quote are not handled.** Question-vs-claim is (0.087 vs 0.931).
- **Not registered ≠ fabricated.** Absence proves nothing about unregistered text.
- **The name check is off until a guard is set.** With `nameGuard` at `address(0)` anyone
  can still claim any name; the deploy script sets the guard in the same run.
- **The registry owner can switch the guard off again.** A known central point. It cannot
  alter statements already registered, and no proof depends on it.
- **The guard covers one registry, second-level names only.** Subnames need a walk down
  `getSubregistry` and are not built.
- **A name that changes hands takes its publishing right with it.** Statements already
  registered keep their recorded `ensNode`; the guard only governs new ones.
- **First registration wins.** Identical text yields an identical root, so someone can
  register another author's text first. Documented, not yet fixed.
- **The contract cannot check that the CID matches the root.** It never sees the text. A
  mismatch makes the statement unverifiable, so lying only hurts the author.
- Paragraph granularity, not sentence granularity.
- The cold start problem is unsolved. No hackathon project solves it.

## Prior art

C2PA / Content Credentials, Soft Binding Resolution, Numbers Protocol, Chainpoint.
Citable differs in two ways: the position proof *within* a statement, and the honest
fallback when no proof exists.

## AI usage

Contracts, scripts and tests were developed with Claude Code. Architecture, design
decisions and verification by the author. Declared honestly — AI use is permitted at
ETHGlobal, a false statement is not.

## License

MIT
