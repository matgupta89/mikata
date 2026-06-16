"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

// Formats grouped by the tier they belong to (from the Scope of Works).
// The editor picks a format; the tier is set automatically.
const FORMATS: { name: string; tier: string }[] = [
  { name: "Capsule", tier: "Signal" },
  { name: "Anatomy of a Pass", tier: "Signal" },
  { name: "The Quarterly Read", tier: "Signal" },
  { name: "Marginalia", tier: "Signal" },
  { name: "The Long Table", tier: "Belonging" },
  { name: "Off the Clock", tier: "Belonging" },
  { name: "Three Things", tier: "Belonging" },
  { name: "In Conversation", tier: "Belonging" },
  { name: "The Address Book", tier: "Reference" },
];

const inputClass =
  "w-full rounded-xl border border-ink/15 px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-cobalt focus:ring-1 focus:ring-cobalt";

export default function PublishForm({ authorId }: { authorId: number }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState(FORMATS[0].name);
  const [visibility, setVisibility] = useState("member");
  const [shareable, setShareable] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tier = FORMATS.find((f) => f.name === format)?.tier ?? "Signal";

  async function publish() {
    if (!title.trim() || !body.trim()) {
      setError("Give it a title and some body text first.");
      return;
    }
    setBusy(true);
    setError(null);

    const sb = getSupabase();
    const { data, error } = await sb
      .from("content_items")
      .insert({
        title: title.trim(),
        format,
        tier,
        body: body.trim(),
        visibility,
        shareable,
        is_canon: false,
        published_at: new Date().toISOString(),
        author_id: authorId,
      })
      .select("id")
      .single();

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    // Straight to the piece you just published.
    router.push(`/library/${data.id}`);
  }

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm text-ink/60 mb-1.5">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. The case we nearly missed"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-ink/60 mb-1.5">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className={inputClass}
          >
            {FORMATS.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink/40 mt-1.5">
            Filed under <span className="text-cobalt">{tier}</span>
          </p>
        </div>

        <div>
          <label className="block text-sm text-ink/60 mb-1.5">Visible to</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className={inputClass}
          >
            <option value="prospect">Prospects &amp; everyone</option>
            <option value="member">Members</option>
            <option value="editor">Editors only</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-ink/60 mb-1.5">Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          placeholder="Write the piece here…"
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2.5 text-sm text-ink/70">
        <input
          type="checkbox"
          checked={shareable}
          onChange={(e) => setShareable(e.target.checked)}
          className="w-4 h-4 accent-cobalt"
        />
        Allow this to be shared via gift link
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={publish}
        disabled={busy}
        className={`rounded-full bg-cobalt text-white text-sm px-6 py-2.5 hover:bg-cobalt/90 transition ${
          busy ? "opacity-50" : ""
        }`}
      >
        {busy ? "Publishing…" : "Publish"}
      </button>
    </div>
  );
}

