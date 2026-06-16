"use client";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSDate(d: Date) {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export default function AddToCalendar({
  title,
  startsAt,
  body,
}: {
  title: string;
  startsAt: string;
  body: string | null;
}) {
  function download() {
    const start = new Date(startsAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // default 1 hour

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Mikata//EN",
      "BEGIN:VEVENT",
      `UID:${Date.now()}@mikata`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${(body || "").replace(/\r?\n/g, " ")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="text-sm rounded-full px-5 py-2 border border-ink/15 hover:border-cobalt hover:text-cobalt transition"
    >
      Add to calendar
    </button>
  );
}

