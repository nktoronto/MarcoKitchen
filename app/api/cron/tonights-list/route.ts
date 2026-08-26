import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

type RawRow = {
  location: string;
  name: string;
  party_size: number;
  reservation_time: string;
  status: string;
};

// Eastern-time "today" as {year, month, day}, using Intl (handles DST
// correctly) rather than string-parsing tricks.
function getEasternDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

// "Tomorrow" as a YYYY-MM-DD string. Anchored at UTC noon before adding a
// day so the arithmetic never lands on a DST-crossing midnight edge case.
function tomorrowDateString(): string {
  const { year, month, day } = getEasternDateParts(new Date());
  const todayNoonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  const tomorrowNoonUtc = new Date(todayNoonUtc.getTime() + 24 * 60 * 60 * 1000);
  const y = tomorrowNoonUtc.getUTCFullYear();
  const m = String(tomorrowNoonUtc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tomorrowNoonUtc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTimeLabel(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

async function sendEmail({ subject, html }: { subject: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Marco's Kitchen <onboarding@resend.dev>",
      to: [process.env.STAFF_EMAIL],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error: ${res.status} ${text}`);
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tomorrow = tomorrowDateString();

  // Path A: raw rows — this is what builds the actual list.
  const rowsResult = await pool.query<RawRow>(
    `SELECT location, name, party_size, reservation_time, status
     FROM reservations
     WHERE reservation_date = $1 AND status IN ('confirmed', 'pending')
     ORDER BY location, reservation_time`,
    [tomorrow]
  );
  const rows = rowsResult.rows;

  // Path B: a separate, independently-issued aggregate query — the
  // double-check. If summing the raw rows ourselves ever disagrees with
  // this, something is wrong and nothing gets sent to staff.
  const aggResult = await pool.query<{ status: string; total: string }>(
    `SELECT status, COALESCE(SUM(party_size), 0) AS total
     FROM reservations
     WHERE reservation_date = $1 AND status IN ('confirmed', 'pending')
     GROUP BY status`,
    [tomorrow]
  );

  const jsComputed: Record<string, number> = { confirmed: 0, pending: 0 };
  for (const row of rows) {
    jsComputed[row.status] = (jsComputed[row.status] ?? 0) + row.party_size;
  }

  const dbComputed: Record<string, number> = { confirmed: 0, pending: 0 };
  for (const r of aggResult.rows) {
    dbComputed[r.status] = Number(r.total);
  }

  const verified =
    jsComputed.confirmed === dbComputed.confirmed && jsComputed.pending === dbComputed.pending;

  if (!verified) {
    await sendEmail({
      subject: "Tonight's Table List — verification failed",
      html: `<p>The nightly table list for ${tomorrow} could not be verified: two independently-derived totals didn't match.</p>
             <p>From raw rows: confirmed=${jsComputed.confirmed}, pending=${jsComputed.pending}</p>
             <p>From database aggregate: confirmed=${dbComputed.confirmed}, pending=${dbComputed.pending}</p>
             <p>Please check the reservations table directly rather than trust either number.</p>`,
    });
    return Response.json({ ok: false, reason: "verification_mismatch", jsComputed, dbComputed });
  }

  const byLocation: Record<string, RawRow[]> = {};
  for (const row of rows) {
    (byLocation[row.location] ??= []).push(row);
  }

  const dateLabel = formatDateLabel(tomorrow);
  let html = `<h2>Tonight's Table List — ${dateLabel}</h2>`;

  if (rows.length === 0) {
    html += `<p>No reservations for tomorrow.</p>`;
  } else {
    for (const [location, locationRows] of Object.entries(byLocation)) {
      const label = location.charAt(0).toUpperCase() + location.slice(1);
      html += `<h3>${label}</h3><ul>`;
      for (const r of locationRows) {
        html += `<li>${r.name} — ${formatTimeLabel(r.reservation_time)} — party of ${r.party_size} — <strong>${r.status}</strong></li>`;
      }
      html += `</ul>`;
      const confirmedTotal = locationRows
        .filter((r) => r.status === "confirmed")
        .reduce((s, r) => s + r.party_size, 0);
      const pendingTotal = locationRows
        .filter((r) => r.status === "pending")
        .reduce((s, r) => s + r.party_size, 0);
      html += `<p>Confirmed covers: ${confirmedTotal} &middot; Pending covers: ${pendingTotal}</p>`;
    }
    html += `<p><strong>Grand total confirmed: ${jsComputed.confirmed} &middot; Grand total pending: ${jsComputed.pending}</strong></p>`;
  }

  await sendEmail({ subject: `Tonight's Table List — ${dateLabel}`, html });

  return Response.json({ ok: true, date: tomorrow, rowCount: rows.length, jsComputed });
}
