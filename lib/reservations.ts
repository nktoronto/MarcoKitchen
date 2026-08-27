import { pool } from "./db";
import { locations, isWithinHours } from "./locations";
import { sendLargePartyAlert } from "./alerts";
import { sendGuestConfirmedEmail, sendGuestPendingEmail } from "./guestEmails";
import { CONFIRMED_THRESHOLD } from "./constants";
import { isPastEastern } from "./dates";

export type ReservationInput = {
  locationId: string;
  name: string;
  email: string;
  phone?: string;
  partySize: number;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM", 24h
  notes?: string;
};

export type ReservationResult =
  | { ok: true; status: "confirmed" | "pending"; id: number; date: string; time: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function getBookedCovers(
  locationId: string,
  date: string,
  time: string
): Promise<number> {
  const result = await pool.query<{ total: string | null }>(
    `SELECT COALESCE(SUM(party_size), 0) AS total
     FROM reservations
     WHERE location = $1 AND reservation_date = $2 AND reservation_time = $3 AND status = 'confirmed'`,
    [locationId, date, time]
  );
  return Number(result.rows[0]?.total ?? 0);
}

export async function createReservation(
  input: ReservationInput
): Promise<ReservationResult> {
  const fieldErrors: Record<string, string> = {};

  const location = locations.find((l) => l.id === input.locationId);
  if (!location) {
    return { ok: false, error: "Please choose a valid location." };
  }

  if (!input.name?.trim()) fieldErrors.name = "Name is required.";
  if (!input.email?.trim()) {
    fieldErrors.email = "Email is required.";
  } else if (!isValidEmail(input.email.trim())) {
    fieldErrors.email = "Enter a valid email address.";
  }
  if (!input.date) fieldErrors.date = "Date is required.";
  if (!input.time) fieldErrors.time = "Time is required.";
  if (!Number.isInteger(input.partySize) || input.partySize < 1) {
    fieldErrors.partySize = "Party size must be at least 1.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
  if (!dateMatch) {
    return {
      ok: false,
      error: "Please enter a valid date.",
      fieldErrors: { date: "Invalid date" },
    };
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  const timeMatch = /^(\d{2}):(\d{2})$/.exec(input.time);
  if (!timeMatch) {
    return {
      ok: false,
      error: "Please enter a valid time.",
      fieldErrors: { time: "Invalid time" },
    };
  }
  const hh = Number(timeMatch[1]);
  const mm = Number(timeMatch[2]);

  // Built from validated numeric parts rather than parsed from a
  // concatenated string, so there's no dependence on Date's string-parsing
  // behavior. Used only for calendar-validity (does Feb 30 roll over?) and
  // day-of-week — both self-consistent regardless of the server's own
  // timezone, since the same components go in as come out.
  const requestedDateTime = new Date(year, month - 1, day, hh, mm);
  const isRealCalendarDate =
    requestedDateTime.getFullYear() === year &&
    requestedDateTime.getMonth() === month - 1 &&
    requestedDateTime.getDate() === day &&
    hh >= 0 &&
    hh <= 23 &&
    mm >= 0 &&
    mm <= 59;
  if (!isRealCalendarDate) {
    return {
      ok: false,
      error: "Please enter a valid date and time.",
      fieldErrors: { date: "Invalid date/time" },
    };
  }

  // The restaurant's own local wall-clock time is always Eastern — compared
  // as Eastern here too (not the server's own timezone, which on Vercel is
  // UTC), the same Eastern-aware check the digest cron already uses.
  if (isPastEastern(input.date, input.time)) {
    return {
      ok: false,
      error: "That date/time has already passed — please choose a future time.",
      fieldErrors: { date: "Past date/time" },
    };
  }

  const timeMinutes = hh * 60 + mm;
  if (!isWithinHours(location, requestedDateTime, timeMinutes)) {
    return {
      ok: false,
      error: `${location.name} is closed at that time — please pick a time within opening hours.`,
      fieldErrors: { time: "Outside operating hours" },
    };
  }

  const partySize = input.partySize;
  const isSmallParty = partySize <= CONFIRMED_THRESHOLD;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Serialize concurrent bookings for the exact same slot, so two
    // simultaneous small-party submissions can't both slip past the cap
    // (a plain check-then-insert has a race window; this closes it).
    const lockKey = `${location.id}|${input.date}|${input.time}`;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [lockKey]);

    let status: "confirmed" | "pending" = "pending";

    if (isSmallParty) {
      const alreadyBooked = await getBookedCovers(
        location.id,
        input.date,
        input.time
      );
      if (alreadyBooked + partySize > location.capacity) {
        await client.query("ROLLBACK");
        return {
          ok: false,
          error: "That time is fully booked — please choose another time.",
        };
      }
      status = "confirmed";
    }

    const insertResult = await client.query<{ id: number; cancel_token: string }>(
      `INSERT INTO reservations
         (location, name, email, phone, party_size, reservation_date, reservation_time, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, cancel_token`,
      [
        location.id,
        input.name.trim(),
        input.email.trim(),
        input.phone?.trim() || null,
        partySize,
        input.date,
        input.time,
        input.notes?.trim() || null,
        status,
      ]
    );

    await client.query("COMMIT");

    const newId = insertResult.rows[0].id;
    const cancelToken = insertResult.rows[0].cancel_token;
    const guestEmailPayload = {
      id: newId,
      name: input.name.trim(),
      email: input.email.trim(),
      party_size: partySize,
      reservation_date: input.date,
      reservation_time: input.time,
      location: location.id,
      cancel_token: cancelToken,
    };

    // Best-effort for all of the below: none of these failing should ever
    // surface as a booking failure to the guest. Awaited (not
    // fire-and-forget) so they actually complete before this serverless
    // invocation ends.
    try {
      if (status === "confirmed") {
        await sendGuestConfirmedEmail(guestEmailPayload);
      } else {
        await sendGuestPendingEmail(guestEmailPayload);
      }
    } catch (err) {
      console.error("Failed to send guest submission email:", err);
    }

    if (status === "pending") {
      try {
        await sendLargePartyAlert(newId);
      } catch (err) {
        console.error("Failed to send large-party alert:", err);
      }
    }

    return { ok: true, status, id: newId, date: input.date, time: input.time };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
