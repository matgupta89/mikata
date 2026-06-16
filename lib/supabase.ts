"use client";

import { useState } from "react";
import type { Member } from "@/lib/auth";

export default function RoleSwitcher({
  members,
  current,
}: {
  members: Member[];
  current: Member | null;
}) {
  const [open, setOpen] = useState(false);

  // "Signing in" is just storing the chosen person's id in a cookie, then
  // reloading so the server re-renders everything from their point of view.
  function signIn(id: number) {
    document.cookie = `mikata_member=${id}; path=/; max-age=31536000`;
    window.location.reload();
  }

  function signOut() {
    document.cookie = "mikata_member=; path=/; max-age=0";
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-3">
      {current && (
        <span className="hidden sm:inline text-sm text-ink/55">
          Viewing as{" "}
          <span className="text-ink/80 font-medium">{current.display_name}</span>
        </span>
      )}

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="text-sm border border-ink/15 rounded-full px-3.5 py-1.5
                     hover:border-cobalt hover:text-cobalt transition
                     flex items-center gap-1.5"
        >
          {current ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-cobalt" />
              {current.role.charAt(0).toUpperCase() + current.role.slice(1)}
            </>
          ) : (
            "Sign in"
          )}
          <span className="text-ink/30">▾</span>
        </button>

        {open && (
          <div
            className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl
                       ring-1 ring-ink/10 overflow-hidden z-30"
          >
            <div className="px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] text-ink/40 bg-paper">
              Sign in as
            </div>

            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => signIn(m.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5
                            text-sm hover:bg-cobalt/5 ${
                              current?.id === m.id ? "bg-cobalt/5" : ""
                            }`}
              >
                <span>{m.display_name}</span>
                <span className="text-[11px] text-ink/45 capitalize">
                  {m.role}
                </span>
              </button>
            ))}

            {current && (
              <button
                onClick={signOut}
                className="w-full text-left px-4 py-2.5 text-sm text-ink/55
                           hover:bg-ink/5 border-t border-ink/10"
              >
                Sign out
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
