import { Hero } from "@/components/Hero";
import { Idea } from "@/components/Idea";
import { Doors } from "@/components/Doors";
import { HowItHolds } from "@/components/HowItHolds";
import { Cascade } from "@/components/Cascade";
import { Limits } from "@/components/Limits";
import { REGISTRY } from "@/lib/chain";

export default function Home() {
  return (
    <>
      {/* The hero pins itself and carries the masthead, so it owns the top of the page
          outright rather than sitting in the column below. */}
      <Hero />

      <main className="mx-auto w-full max-w-5xl px-5 pb-14 sm:px-8 sm:pb-20">
        <Idea />
        <Doors />
        <HowItHolds />
        <Cascade />
        <Limits />

        <footer
          className="mt-24 border-t pt-6 text-xs leading-relaxed"
          style={{ borderColor: "var(--rule)", color: "var(--ink-faint)" }}
        >
          <p>
            Registry{" "}
            <a
              className="font-mono underline underline-offset-2"
              href={`https://sepolia.etherscan.io/address/${REGISTRY}#code`}
              target="_blank"
              rel="noreferrer"
            >
              {REGISTRY}
            </a>{" "}
            on Sepolia, verified on Etherscan.
          </p>
        </footer>
      </main>
    </>
  );
}
