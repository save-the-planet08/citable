/**
 * The idea, once, before anything is asked of the reader.
 *
 * It is a turn rather than a feature list: the hero has just spent three screens on a
 * problem nobody can solve — you cannot prove a quotation was never said — and this says
 * what can be done instead.
 */
export function Idea() {
  return (
    <section className="mt-28 sm:mt-36">
      <p className="eyebrow">The idea</p>
      <h2 className="mt-3 max-w-[20ch] font-display text-[clamp(1.9rem,3.8vw,2.9rem)] leading-[1.06]">
        Not{" "}
        <em className="font-normal italic" style={{ color: "var(--ink-soft)" }}>
          is this quote real?
        </em>
        <span className="mt-1 block" style={{ color: "var(--seal)" }}>
          Here is the proof that I quoted correctly.
        </span>
      </h2>

      <div className="mt-8 grid gap-x-14 gap-y-6 sm:grid-cols-2">
        <p
          className="max-w-[52ch] text-[1.0625rem] leading-relaxed"
          style={{ color: "var(--ink-soft)" }}
        >
          Nobody can prove a sentence was never said. The denominator is
          unknowable — nobody holds every word a person ever spoke. So Citable
          turns the burden around and arms the person quoting, not the person
          doubting.
        </p>
        <p
          className="max-w-[52ch] text-[1.0625rem] leading-relaxed"
          style={{ color: "var(--ink-soft)" }}
        >
          A statement is split at its blank lines. Every paragraph is bound to
          its position, and only the root of that tree goes on chain — 32 bytes.
          Quote from it and you can hand over the proof with the quote:{" "}
          <b className="font-medium" style={{ color: "var(--ink)" }}>
            this passage stood word for word at paragraph 5 of 7, here are its
            neighbours, here is the date.
          </b>
        </p>
      </div>

      <div
        className="mt-8 border-t pt-4"
        style={{ borderColor: "var(--rule)" }}
      >
        <p
          className="max-w-[70ch] text-[0.9375rem] leading-relaxed"
          style={{ color: "var(--ink-faint)" }}
        >
          No database, no server, no indexer. The text sits on IPFS, the tree is
          rebuilt in your browser, and the chain holds 32 bytes. There is
          deliberately no service here that you have to trust — including this
          one.
        </p>
      </div>
    </section>
  );
}
