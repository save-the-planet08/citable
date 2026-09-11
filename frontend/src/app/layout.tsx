import type { Metadata } from "next";
import { Fraunces, Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Fraunces carries the whole editorial voice: headlines, quotations, the paragraphs the
// page asks you to actually read. It has an optical-size axis, so the display cut sharpens
// on its own as the type grows instead of being one shape stretched across ten sizes.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
});

// The apparatus around the text — labels, buttons, captions. A grotesque with newspaper
// manners rather than another interface sans.
const archivo = Archivo({
  variable: "--font-ui",
  subsets: ["latin"],
});

// Hashes, addresses, indices. Anything the reader might compare character by character.
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Citable — check a quotation",
  description:
    "Paste a fragment and a statement root. Citable proves which paragraph it was, and where.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
