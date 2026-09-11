import Link from "next/link";

/**
 * The mark is provisional: a frame, an opening quotation mark, and one filled square in the
 * corner for the position. It has to survive being 26 pixels wide in a screenshot, so it is
 * three shapes and no more.
 */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true" className="block">
      <rect x="1" y="1" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8.5h4.2v4.2c0 2.6-1.4 4.1-4.2 4.6v-1.9c1.4-.4 2.1-1.2 2.1-2.4H7z" fill="currentColor" />
      <path d="M14.8 8.5H19v4.2c0 2.6-1.4 4.1-4.2 4.6v-1.9c1.4-.4 2.1-1.2 2.1-2.4h-2.1z" fill="currentColor" />
      <rect x="17.5" y="17.5" width="7.5" height="7.5" fill="var(--seal)" />
    </svg>
  );
}

export function Masthead() {
  return (
    <header
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b pb-3.5"
      style={{ borderColor: "var(--rule-strong)" }}
    >
      <Link href="/" className="flex items-center gap-2.5 text-ink no-underline">
        <Mark />
        <b className="font-display text-[1.3rem] font-semibold sm:text-[1.5rem]">Citable</b>
      </Link>
      <nav
        className="ui flex gap-4 text-[0.8125rem] sm:gap-8 sm:text-[0.875rem]"
        style={{ color: "var(--ink-soft)" }}
      >
        <Link href="/#check" className="border-b border-transparent pb-0.5 hover:border-current">
          Check a quote
        </Link>
        <Link href="/#register" className="border-b border-transparent pb-0.5 hover:border-current">
          Register a statement
        </Link>
        <Link
          href="/#how"
          className="hidden border-b border-transparent pb-0.5 hover:border-current sm:inline"
        >
          How it holds
        </Link>
      </nav>
    </header>
  );
}
