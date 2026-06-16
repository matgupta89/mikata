"use client";

import { useState } from "react";
import Link from "next/link";
import RoleSwitcher from "./RoleSwitcher";
import type { Member } from "@/lib/auth";

export default function SiteNav({
  me,
  members,
  isEditor,
}: {
  me: Member | null;
  members: Member[];
  isEditor: boolean;
}) {
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Home" },
    { href: "/library", label: "Library" },
    { href: "/yomi", label: "The Yomi" },
    { href: "/invitations", label: "Invitations" },
    { href: "/funds", label: "Funds" },
    ...(isEditor ? [{ href: "/publish", label: "Publish" }] : []),
  ];

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-6 min-w-0">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-baseline gap-2 shrink-0"
          >
            <span className="font-display text-xl sm:text-2xl tracking-tight">
              Mikata
            </span>
            <span className="hidden lg:inline text-[11px] uppercase tracking-[0.25em] text-ink/40 mt-1">
              Members&apos; Platform
            </span>
          </Link>

          {/* Desktop: inline links */}
          <nav className="hidden md:flex items-center gap-5 text-sm text-ink/55">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hover:text-cobalt transition"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <RoleSwitcher members={members} current={me} />
          {/* Mobile: hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="md:hidden w-9 h-9 inline-flex items-center justify-center rounded-full border border-ink/15 text-ink/60 hover:border-cobalt hover:text-cobalt transition"
          >
            {open ? (
              <span className="text-base leading-none">✕</span>
            ) : (
              <span className="flex flex-col gap-[3px]">
                <span className="block w-4 h-[1.5px] bg-current" />
                <span className="block w-4 h-[1.5px] bg-current" />
                <span className="block w-4 h-[1.5px] bg-current" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile: dropdown panel */}
      {open && (
        <nav className="md:hidden mt-3 pt-3 border-t border-ink/10 flex flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-2.5 text-ink/70 hover:text-cobalt transition"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

