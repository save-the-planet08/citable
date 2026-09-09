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

## Status

Honest state of the repository, not a plan.

| | |
|---|---|
| Leaf hashing, JS ↔ Solidity parity proven | ✅ 6 tests |
| `CitableRegistry` with position proofs | ✅ 10 tests |
| Layer 3 approach measured and chosen | ✅ 3 probe scripts |
| Deployment to Sepolia | ❌ not yet |
| Client library (segment, tree, bundle) | ❌ not yet |
| Frontend | ❌ not yet |

## Run it

```bash
forge install
npm install          # required: the leaf parity test shells out to the JS implementation
forge test           # 16 tests

node script/js/entailment-eval.mjs    # layer 3 evaluation, downloads a model on first run
```

## Limitations

- **Stage 3 is a measurement, not a proof.** It can be wrong, and it is labelled as such.
- **Spanish is weak** (0.562 vs 0.821 for English) and would be rejected at threshold 0.80.
  A false negative — annoying, not dangerous.
- **16 test cases are a signal, not a validation.** Real confidence needs 50–100.
- **Irony and quote-within-quote are not handled.** Question-vs-claim is (0.087 vs 0.931).
- **Not registered ≠ fabricated.** Absence proves nothing about unregistered text.
- **`ensNode` is unverified by the contract** — anyone can claim any name until the ENS
  layer closes that hole.
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
