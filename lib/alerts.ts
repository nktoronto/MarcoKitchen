import { pool } from "./db";
import { locations } from "./locations";
import { CONFIRMED_THRESHOLD } from "./constants";
import { sendEmail } from "./email";
import { formatDateLabel, formatTimeLabel } from "./formatting";

type ReservationRow = {
  id: number;
  location: string;
  name: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  decision_token: string;
};

function siteUrl(): string {
  return process.env.SITE_URL ?? "https://marcoskitchen.vercel.app";
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
    `SELECT id, location, name, party_size, reservation_date::text, reservation_time, decision_token
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

  const reviewUrl = `${siteUrl()}/review/${row.decision_token}`;

  const html = `<h2>Large Party Pending Review</h2>
    <p><strong>${row.name}</strong> — party of ${row.party_size}</p>
    <p>${formatDateLabel(row.reservation_date)} at ${formatTimeLabel(row.reservation_time)} — ${location.name}</p>
    <p>Reservation #${row.id}</p>
    <p><a href="${reviewUrl}">Review this request</a></p>`;

  await sendEmail({
    to: process.env.STAFF_EMAIL ?? "",
    subject: `Large Party Pending — ${location.name}, ${formatDateLabel(row.reservation_date)}`,
    html,
  });
}
