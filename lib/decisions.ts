import { pool } from "./db";
import { locations } from "./locations";
import { sendGuestConfirmedEmail, sendGuestDeclinedEmail } from "./guestEmails";
import { sendEmail } from "./email";
import { formatDateLabel, formatTimeLabel } from "./formatting";
import { currentEasternDateTimeParts } from "./dates";

export type ReservationDetail = {
  id: number;
  location: string;
  name: string;
  email: string;
  phone: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  notes: string | null;
  status: string;
  decline_reason: string | null;
  cancel_token: string;
  decision_token: string;
};

const DETAIL_COLUMNS = `id, location, name, email, phone, party_size, reservation_date::text, reservation_time, notes, status, decline_reason, cancel_token, decision_token`;

export async function getReservationByToken(token: string): Promise<ReservationDetail | null> {
  const result = await pool.query<ReservationDetail>(
    `SELECT ${DETAIL_COLUMNS} FROM reservations WHERE decision_token = $1`,
    [token]
  );
  return result.rows[0] ?? null;
}

export async function getReservationByCancelToken(token: string): Promise<ReservationDetail | null> {
  const result = await pool.query<ReservationDetail>(
    `SELECT ${DETAIL_COLUMNS} FROM reservations WHERE cancel_token = $1`,
    [token]
  );
  return result.rows[0] ?? null;
}

// Same atomic-guard pattern as approve/decline: only a still confirmed/
// pending row can be cancelled, and only the first action of any kind
// (approve, decline, or this) ever changes the row.
export async function cancelByToken(token: string): Promise<DecisionResult> {
  const result = await pool.query<ReservationDetail>(
    `UPDATE reservations
     SET status = 'cancelled', updated_at = now()
     WHERE cancel_token = $1 AND status IN ('confirmed', 'pending')
     RETURNING ${DETAIL_COLUMNS}`,
    [token]
  );
  const row = result.rows[0];
  if (!row) return { ok: false };

  try {
    const location = locations.find((l) => l.id === row.location);
    await sendEmail({
      to: process.env.STAFF_EMAIL ?? "",
      subject: `Cancelled by guest — ${location?.name ?? row.location}`,
      html: `<p>${row.name}, party of ${row.party_size}, ${formatDateLabel(row.reservation_date)} at ${formatTimeLabel(row.reservation_time)} at ${location?.name ?? row.location} — cancelled by guest.</p>
             <p>Reservation #${row.id}</p>`,
    });
  } catch (err) {
    console.error("Failed to send cancellation notice to Marco:", err);
  }

  return { ok: true, reservation: row };
}

export type SameDayRow = {
  name: string;
  party_size: number;
  reservation_time: string;
  status: string;
};

export type SameDayContext = {
  rows: SameDayRow[];
  confirmedTotal: number;
  pendingTotal: number;
  capacity: number;
};

// Other bookings that day at the same location, for Marco to judge capacity
// against — deliberately never includes email/phone (privacy: this page
// shows one guest's own request plus *other* guests' names/times only).
export async function getSameDayContext(
  location: string,
  date: string,
  excludeId: number
): Promise<SameDayContext> {
  const rowsResult = await pool.query<SameDayRow>(
    `SELECT name, party_size, reservation_time, status
     FROM reservations
     WHERE location = $1 AND reservation_date = $2 AND id != $3 AND status IN ('confirmed', 'pending')
     ORDER BY reservation_time`,
    [location, date, excludeId]
  );

  const totalsResult = await pool.query<{ status: string; total: string }>(
    `SELECT status, COALESCE(SUM(party_size), 0) AS total
     FROM reservations
     WHERE location = $1 AND reservation_date = $2 AND status IN ('confirmed', 'pending')
     GROUP BY status`,
    [location, date]
  );

  let confirmedTotal = 0;
  let pendingTotal = 0;
  for (const r of totalsResult.rows) {
    if (r.status === "confirmed") confirmedTotal = Number(r.total);
    if (r.status === "pending") pendingTotal = Number(r.total);
  }

  const loc = locations.find((l) => l.id === location);

  return { rows: rowsResult.rows, confirmedTotal, pendingTotal, capacity: loc?.capacity ?? 0 };
}

export type PendingRow = {
  id: number;
  location: string;
  name: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  notes: string | null;
  decision_token: string;
};

export async function getAllPending(): Promise<PendingRow[]> {
  const result = await pool.query<PendingRow>(
    `SELECT id, location, name, party_size, reservation_date::text, reservation_time, notes, decision_token
     FROM reservations
     WHERE status = 'pending'
     ORDER BY reservation_date, reservation_time`
  );
  return result.rows;
}

export type ConfirmedRow = {
  id: number;
  location: string;
  name: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  notes: string | null;
};

// Today onward only -- confirmed bookings that already happened aren't
// "current" from Marco's point of view, and this list would otherwise grow
// without bound.
export async function getUpcomingConfirmed(): Promise<ConfirmedRow[]> {
  const { date: today } = currentEasternDateTimeParts();
  const result = await pool.query<ConfirmedRow>(
    `SELECT id, location, name, party_size, reservation_date::text, reservation_time, notes
     FROM reservations
     WHERE status = 'confirmed' AND reservation_date >= $1
     ORDER BY reservation_date, reservation_time`,
    [today]
  );
  return result.rows;
}

export type DecisionResult = { ok: true; reservation: ReservationDetail } | { ok: false };

// The "WHERE ... AND status = 'pending'" guard on both mutations below is
// the entire first-click-wins mechanism: a second click (or a concurrent
// one, from any source -- approve, decline, or a future cancel) affects
// zero rows atomically. No extra locking, no separate "already handled"
// flag needed.

export async function approveByToken(token: string): Promise<DecisionResult> {
  const result = await pool.query<ReservationDetail>(
    `UPDATE reservations
     SET status = 'confirmed', updated_at = now()
     WHERE decision_token = $1 AND status = 'pending'
     RETURNING ${DETAIL_COLUMNS}`,
    [token]
  );
  const row = result.rows[0];
  if (!row) return { ok: false };

  try {
    await sendGuestConfirmedEmail(row);
  } catch (err) {
    console.error("Failed to send guest confirmation email:", err);
  }

  return { ok: true, reservation: row };
}

export async function declineByToken(token: string, reason: string): Promise<DecisionResult> {
  const trimmedReason = reason.trim();
  const result = await pool.query<ReservationDetail>(
    `UPDATE reservations
     SET status = 'declined', decline_reason = $2, updated_at = now()
     WHERE decision_token = $1 AND status = 'pending'
     RETURNING ${DETAIL_COLUMNS}`,
    [token, trimmedReason || null]
  );
  const row = result.rows[0];
  if (!row) return { ok: false };

  try {
    await sendGuestDeclinedEmail(row, row.decline_reason);
  } catch (err) {
    console.error("Failed to send guest decline email:", err);
  }

  return { ok: true, reservation: row };
}
