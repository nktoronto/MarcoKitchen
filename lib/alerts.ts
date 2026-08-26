import { pool } from "./db";
import { locations } from "./locations";
import { CONFIRMED_THRESHOLD } from "./constants";

type ReservationRow = {
  id: number;
  location: string;
  name: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
};

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

async function sendEmail({ subject, html }: { subject: string; html: string }): Promise<void> {
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

// Fires right after a large-party reservation is written as "pending".
// Re-fetches the row fresh from the database by id and re-checks the
// threshold independently — never trusts the value already in memory
// from the insert — before sending anything. This is a deterministic
// stand-in for a subagent re-verification pass: confirming a party size
// crosses a fixed number needs no judgment, just a second, separate read
// of the source of truth. Never touches `status` itself — that decision
// stays with Marco.
//
// Channel note: spec.md originally settled on SMS for this, but Twilio's
// trial account rejected every plain-body message outright ("trial
// accounts can only use predefined SMS templates" — not fixable from
// our side without either a Twilio-approved template or an account
// upgrade). Pivoted to email via the same Resend setup already working
// for the nightly list, rather than block on that.
export async function sendLargePartyAlert(reservationId: number): Promise<void> {
  const result = await pool.query<ReservationRow>(
    `SELECT id, location, name, party_size, reservation_date, reservation_time
     FROM reservations WHERE id = $1`,
    [reservationId]
  );
  const row = result.rows[0];
  if (!row) return;

  if (row.party_size <= CONFIRMED_THRESHOLD) {
    // Independent re-check did not confirm this is actually a large
    // party — do not alert.
    return;
  }

  const location = locations.find((l) => l.id === row.location);
  if (!location) return;

  const html = `<h2>Large Party Pending Review</h2>
    <p><strong>${row.name}</strong> — party of ${row.party_size}</p>
    <p>${formatDateLabel(row.reservation_date)} at ${formatTimeLabel(row.reservation_time)} — ${location.name}</p>
    <p>Reservation #${row.id}</p>
    <p>This request is waiting on your review — check the database to approve or decline.</p>`;

  await sendEmail({
    subject: `Large Party Pending — ${location.name}, ${formatDateLabel(row.reservation_date)}`,
    html,
  });
}
