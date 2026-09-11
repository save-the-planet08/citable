"use client";

/**
 * What the author is actually committing to.
 *
 * The segmentation rule is one of the two invariants of the project and it is deliberately
 * dumb: split at a blank line, trim the ends, drop what is empty. Dumb rules are honest
 * only if you can see them working — an author who cannot see where the cuts fall cannot
 * tell that a stray blank line has just split one thought into two paragraphs, each with
 * its own position and its own proof.
 *
 * So this is not a preview in the decorative sense. It is the diff between what was typed
 * and what will be hashed.
 */
export function SegmentationPreview({
  segments,
  root,
  cid,
}: {
  segments: string[];
  root: `0x${string}`;
  cid: string;
}) {
  return (
    <div className="mt-6">
      <p className="eyebrow">
        {segments.length} {segments.length === 1 ? "paragraph" : "paragraphs"}, in this order
      </p>

      <ol className="mt-3 border-t" style={{ borderColor: "var(--rule)" }}>
        {segments.map((s, i) => (
          <li
            key={i}
            className="flex gap-4 border-b py-3"
            style={{ borderColor: "var(--rule)" }}
          >
            <span
              className="w-6 shrink-0 pt-1 text-right font-mono text-xs tabular-nums"
              style={{ color: "var(--ink-faint)" }}
            >
              {i + 1}
            </span>
            <p className="min-w-0 flex-1 font-display text-[15px] leading-relaxed">{s}</p>
          </li>
        ))}
      </ol>

      <dl className="mt-4 space-y-2 text-xs">
        <Line label="Root" value={root} />
        <Line label="CID" value={cid} />
      </dl>
      <p className="mt-3 max-w-xl text-xs leading-relaxed" style={{ color: "var(--ink-faint)" }}>
        Change one character and both of these change. That is the point, and it is also why a
        correction is a new registration rather than an edit.
      </p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-4">
      <dt className="eyebrow w-12 shrink-0">{label}</dt>
      <dd className="min-w-0 flex-1 font-mono break-all" style={{ color: "var(--ink-soft)" }}>
        {value}
      </dd>
    </div>
  );
}
