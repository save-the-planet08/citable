import type { Provenance, Verdict } from "@/lib/verify";
import type { Statement } from "@/lib/chain";
import { describeQuery, type SearchResult } from "@/lib/search";
import { PositionComb } from "./PositionComb";
import { Stage3 } from "./Stage3";

export function ResultPanel({ result, claim }: { result: SearchResult; claim: string }) {
  switch (result.kind) {
    case "found":
      return (
        <>
          <VerdictPanel verdict={result.verdict} />
          {/* A no-match inside a single statement is the same situation as an absence
              across several: the words are not there verbatim, and the honest next
              question is whether they are there in another language. */}
          {result.verdict.kind === "no-match" && (
            <Stage3
              corpus={[{ root: result.root, texts: result.verdict.texts }]}
              claim={claim}
            />
          )}
        </>
      );

    case "no-statements":
      return (
        <Panel
          tone="plain"
          label="Nothing registered"
          claim={`${describeQuery(result.query)} has not registered any statement here.`}
        >
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Citable can only speak about what it holds. An empty registry says nothing about
            what was or was not said.
          </p>
        </Panel>
      );

    // The honest absence claim: it names its own denominator. Without that number this
    // panel would be an unqualified "no", which is exactly what this project refuses.
    case "absent":
      return (
        <>
        <Panel
          tone="plain"
          label="Not found"
          claim={`This quote is in none of the ${result.statements} statements registered by ${describeQuery(result.query)}.`}
        >
          <dl className="flex flex-wrap gap-x-10 gap-y-3">
            <Stat value={String(result.statements)} label="statements searched" />
            <Stat value={String(result.paragraphs)} label="paragraphs compared" />
          </dl>
          <p className="mt-6 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            That is a statement about this registry, not about the world. The words may well
            have been said somewhere Citable does not hold. Not registered is not invented.
          </p>
          {result.capped && (
            <p className="mt-3 text-sm" style={{ color: "var(--amber)" }}>
              Only the {result.statements} most recent statements were checked. There are
              more, so this count is a floor, not the full denominator.
            </p>
          )}
        </Panel>
        <Stage3 corpus={result.corpus} claim={claim} />
        </>
      );

    case "error":
      return (
        <Panel tone="alarm" label="Could not check" claim={result.message}>
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Nothing was proven and nothing was disproven.
          </p>
        </Panel>
      );
  }
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="font-mono text-2xl" style={{ color: "var(--ink)" }}>
        {value}
      </dd>
      <dt className="eyebrow mt-1">{label}</dt>
    </div>
  );
}

export function VerdictPanel({ verdict }: { verdict: Verdict }) {
  switch (verdict.kind) {
    case "proven":
      return (
        <Panel
          tone="seal"
          label="Proven"
          claim="This fragment stood at this position, word for word."
        >
          <PositionComb index={verdict.index} total={verdict.total} />

          <div className="mt-8 space-y-4">
            {verdict.before && <Neighbour text={verdict.before} where="before" />}
            <blockquote
              className="border-l-2 pl-5 font-display text-lg leading-relaxed"
              style={{ borderColor: "var(--seal)" }}
            >
              {verdict.segment}
            </blockquote>
            {verdict.after && <Neighbour text={verdict.after} where="after" />}
          </div>

          <Apparatus statement={verdict.statement} via={verdict.via}>
            <Row label="Merkle proof" value={`${verdict.proof.length} nodes, accepted on chain`} />
          </Apparatus>
        </Panel>
      );

    case "partial":
      return (
        <Panel
          tone="amber"
          label="Part of a paragraph"
          claim="The fragment is in the text, but it is not the whole paragraph."
        >
          <PositionComb index={verdict.index} total={verdict.total} tone="amber" />
          <p className="eyebrow mt-8">The paragraph in full</p>
          <blockquote
            className="mt-3 border-l-2 pl-5 font-display text-lg leading-relaxed"
            style={{ borderColor: "var(--amber)" }}
          >
            {verdict.full}
          </blockquote>
          <p className="mt-4 text-sm" style={{ color: "var(--ink-soft)" }}>
            A shortened quote can be accurate and still mislead. The rest of the paragraph is
            the context that was left out.
          </p>
          <Apparatus statement={verdict.statement} via={verdict.via} />
        </Panel>
      );

    case "no-match":
      return (
        <Panel
          tone="plain"
          label="No match"
          claim={`The fragment does not appear in any of the ${verdict.total} paragraphs of this statement.`}
        >
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            That says nothing about whether the words were said. It says they are not in{" "}
            <em>this</em> statement. Not registered is not the same as invented.
          </p>
          <Apparatus statement={verdict.statement} via={verdict.via} />
        </Panel>
      );

    case "unregistered":
      return (
        <Panel tone="plain" label="Not registered" claim="No statement exists under this root.">
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Check the root, or the statement was never registered. Citable can only speak
            about statements it holds.
          </p>
        </Panel>
      );

    case "bundle-mismatch":
      return (
        <Panel
          tone="alarm"
          label="Bundle does not match"
          claim="The content behind the CID does not rebuild this root."
        >
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Nothing from that bundle is shown, because nothing in it is anchored to the
            statement. Either the file was swapped after registration, or the CID points
            somewhere else entirely.
          </p>
          <pre
            className="mt-4 overflow-x-auto border p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap"
            style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}
          >
            {verdict.detail}
          </pre>
          <Apparatus statement={verdict.statement} />
        </Panel>
      );

    case "error":
      return (
        <Panel tone="alarm" label="Could not check" claim={verdict.message}>
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Nothing was proven and nothing was disproven.
          </p>
        </Panel>
      );
  }
}

const TONES = {
  seal: { accent: "var(--seal)", tint: "var(--seal-tint)", border: "var(--seal)" },
  amber: { accent: "var(--amber)", tint: "var(--amber-tint)", border: "var(--amber)" },
  alarm: { accent: "var(--alarm)", tint: "transparent", border: "var(--alarm)" },
  plain: { accent: "var(--ink-soft)", tint: "transparent", border: "var(--rule-strong)" },
} as const;

function Panel({
  tone,
  label,
  claim,
  children,
}: {
  tone: keyof typeof TONES;
  label: string;
  claim: string;
  children?: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <section
      className="rise mt-10 border"
      style={{ borderColor: t.border, background: "var(--paper-raised)" }}
    >
      <header
        className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-6 py-4 sm:px-8"
        style={{ borderColor: t.border, background: t.tint }}
      >
        <h2
          className="font-ui text-sm font-semibold tracking-wide uppercase"
          style={{ color: t.accent }}
        >
          {label}
        </h2>
        <p className="font-display text-lg" style={{ color: "var(--ink)" }}>
          {claim}
        </p>
      </header>
      <div className="px-6 py-7 sm:px-8">{children}</div>
    </section>
  );
}

function Neighbour({ text, where }: { text: string; where: "before" | "after" }) {
  return (
    <div className="pl-5" style={{ color: "var(--ink-faint)" }}>
      <p className="eyebrow mb-1">Paragraph {where}</p>
      <p className="font-display text-base leading-relaxed line-clamp-3">{text}</p>
    </div>
  );
}

function Apparatus({
  statement,
  via,
  children,
}: {
  statement: Statement;
  via?: Provenance;
  children?: React.ReactNode;
}) {
  const registered = new Date(Number(statement.timestamp) * 1000);
  return (
    <dl
      className="mt-8 border-t pt-5 text-sm space-y-2"
      style={{ borderColor: "var(--rule)" }}
    >
      <Row label="Registered" value={registered.toISOString().slice(0, 10)} />
      <Row label="Author" value={statement.author} mono />
      <Row label="CID" value={statement.cid} mono />
      {via && (
        <Row
          label="Bundle from"
          value={
            via.local
              ? `${via.source} — no public gateway answered, so the copy this app ships was used. It had to rebuild the root like any other source.`
              : via.source
          }
        />
      )}
      {statement.withdrawn && (
        <Row
          label="Withdrawn"
          value="The author withdrew this statement. The proof stands regardless."
        />
      )}
      {children}
    </dl>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-4">
      <dt className="eyebrow w-28 shrink-0 pt-0.5">{label}</dt>
      <dd
        className={`min-w-0 flex-1 break-all ${mono ? "font-mono text-xs" : ""}`}
        style={{ color: "var(--ink-soft)" }}
      >
        {value}
      </dd>
    </div>
  );
}
