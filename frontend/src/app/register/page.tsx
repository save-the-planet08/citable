import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { RegisterTool } from "@/components/RegisterTool";

/**
 * The writing door lives on the front page now, next to the reading one. This route is
 * kept so links that were handed out before still land somewhere that works.
 */
export const metadata = {
  title: "Citable — put a statement on the record",
};

export default function RegisterScreen() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pt-5 pb-14 sm:px-8 sm:pt-8 sm:pb-20">
      <Masthead />
      <header className="mt-10">
        <p className="eyebrow">Citable · Sepolia · Register</p>
        <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
          Put a statement on the record.
        </h1>
        <Link
          href="/#check"
          className="mt-4 inline-block text-sm underline underline-offset-2"
          style={{ color: "var(--seal)" }}
        >
          ← Check a quote instead
        </Link>
      </header>
      <div className="mt-8">
        <RegisterTool />
      </div>
    </div>
  );
}
