"use client";

import { useEffect, useState } from "react";
import { CheckTool } from "@/components/CheckTool";
import { RegisterTool } from "@/components/RegisterTool";

type Door = "check" | "register";

const DOORS: { id: Door; title: string; line: string }[] = [
  {
    id: "check",
    title: "Check a quote",
    line: "Somebody was quoted. Find out whether they said it, and where it stood.",
  },
  {
    id: "register",
    title: "Put one on the record",
    line: "You said something. Make every paragraph of it quotable with a proof attached.",
  },
];

/**
 * Both halves of the product, on one page, in one frame.
 *
 * They are deliberately the same size and sit at the same height. A register where reading
 * is the front door and writing is buried three clicks down is a register nobody writes to,
 * and a register nobody writes to proves nothing about anything.
 */
export function Doors() {
  const [door, setDoor] = useState<Door>("check");

  // The hash is the address of a door, so the nav above and a pasted link both work, and
  // so the choice survives a reload.
  useEffect(() => {
    const fromHash = () => {
      const hash = location.hash.slice(1);
      if (hash === "check" || hash === "register") setDoor(hash);
    };
    fromHash();
    addEventListener("hashchange", fromHash);
    return () => removeEventListener("hashchange", fromHash);
  }, []);

  function pick(id: Door) {
    setDoor(id);
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <section className="mt-24 sm:mt-32">
      {/* Anchors for the nav, so the browser scrolls here on its own. */}
      <span id="check" className="block scroll-mt-6" />
      <span id="register" className="block scroll-mt-6" />

      <p className="eyebrow">Two doors, the same size</p>

      <div
        className="mt-5 grid gap-px sm:grid-cols-2"
        style={{ background: "var(--rule-strong)" }}
      >
        {DOORS.map((d) => {
          const open = d.id === door;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => pick(d.id)}
              aria-pressed={open}
              onMouseEnter={(e) => {
                if (!open) e.currentTarget.style.background = "#ffffff";
              }}
              onMouseLeave={(e) => {
                if (!open)
                  e.currentTarget.style.background = "var(--paper-raised)";
              }}
              className="group px-6 py-6 text-left transition-colors sm:px-8 sm:py-7"
              style={{
                background: open ? "var(--seal)" : "var(--paper-raised)",
                color: open ? "var(--paper-raised)" : "var(--ink)",
              }}
            >
              <span className="flex items-baseline gap-3 font-display text-[clamp(1.25rem,2vw,1.6rem)] leading-tight">
                {d.title}
                {/* The closed door says it can be opened; the open one has nowhere to go. */}
                {!open && (
                  <span
                    aria-hidden
                    className="text-base transition-transform group-hover:translate-x-1"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    →
                  </span>
                )}
              </span>
              <span
                className="mt-2 block max-w-[34ch] text-[13.5px] leading-relaxed"
                style={{ color: open ? "var(--seal-tint)" : "var(--ink-soft)" }}
              >
                {d.line}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="border border-t-0 px-6 py-8 sm:px-10 sm:py-10"
        style={{ borderColor: "var(--rule-strong)" }}
      >
        {door === "check" ? <CheckTool /> : <RegisterTool />}
      </div>
    </section>
  );
}
