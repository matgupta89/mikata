import "./globals.css";
import type { ReactNode } from "react";
import RoleSwitcher from "@/components/RoleSwitcher";
import { getCurrentMember, getAllMembers } from "@/lib/auth";

export const metadata = {
  title: "Mikata — Members' Platform",
  description: "A private members' platform operated by Vitruvian Partners IR.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await getCurrentMember();
  const members = await getAllMembers();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Source+Sans+3:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-paper text-ink font-sans min-h-screen flex flex-col">
        <header className="border-b border-ink/10 bg-paper/90 backdrop-blur sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
            <a href="/" className="flex items-baseline gap-2">
              <span className="font-display text-2xl tracking-tight">Mikata</span>
              <span className="hidden sm:inline text-[11px] uppercase tracking-[0.25em] text-ink/40 mt-1">
                Members&apos; Platform
              </span>
            </a>
            <RoleSwitcher members={members} current={me} />
          </div>
        </header>

        <main className="flex-1 w-full max-w-5xl mx-auto px-5 py-10">
          {children}
        </main>

        <footer className="border-t border-ink/10 mt-8">
          <div className="max-w-5xl mx-auto px-5 py-6 text-[12px] leading-relaxed text-ink/45">
            <p className="mb-1">
              <span className="font-display text-ink/70">Mikata</span> · A private members&apos; platform operated by Vitruvian Partners Investor Relations. Confidential.
            </p>
            <p>
              This platform is for information only. Nothing here is an offer, solicitation, or financial promotion. Fund content is restricted to eligible investors and subject to compliance sign-off.{" "}
              <span className="italic">Demo prototype — not a live system.</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
