import { pool } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { formatDateLabel, formatTimeLabel } from "@/lib/formatting";
import { tomorrowDateString } from "@/lib/dates";

export const dynamic = "force-dynamic";

type RawRow = {
  location: string;
  name: string;
  party_size: number;
  reservation_time: string;
  status: string;
};

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
      to: process.env.STAFF_EMAIL ?? "",
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

  await sendEmail({ to: process.env.STAFF_EMAIL ?? "", subject: `Tonight's Table List — ${dateLabel}`, html });

  return Response.json({ ok: true, date: tomorrow, rowCount: rows.length, jsComputed });
}
