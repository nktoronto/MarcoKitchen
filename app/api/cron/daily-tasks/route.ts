import { pool } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendGuestLapsedEmail, sendGuestReviewRequestEmail } from "@/lib/guestEmails";
import { isPastEastern } from "@/lib/dates";
import { getUpcomingConfirmed, getReservationsForReviewRequest } from "@/lib/decisions";

export const dynamic = "force-dynamic";

type PendingRow = {
  id: number;
  name: string;
  email: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  location: string;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await pool.query<PendingRow>(
    `SELECT id, name, email, party_size, reservation_date::text, reservation_time, location
     FROM reservations
     WHERE status = 'pending'`
  );

  const lapsed: PendingRow[] = [];
  const upcoming: PendingRow[] = [];
  for (const row of result.rows) {
    if (isPastEastern(row.reservation_date, row.reservation_time)) {
      lapsed.push(row);
    } else {
      upcoming.push(row);
    }
  }

  let lapsedCount = 0;
  for (const row of lapsed) {
    // Same atomic guard as every other mutation here: only a row still
    // actually pending gets flipped, so a concurrent approve/decline/cancel
    // always wins the race instead of being clobbered by this cron.
    const updateResult = await pool.query(
      `UPDATE reservations SET status = 'lapsed', updated_at = now() WHERE id = $1 AND status = 'pending'`,
      [row.id]
    );
    if (updateResult.rowCount === 0) continue;
    lapsedCount++;
    try {
      await sendGuestLapsedEmail(row);
    } catch (err) {
      console.error("Failed to send guest lapsed email:", err);
    }
  }

  // Post-visit review requests -- every confirmed booking from a day that's
  // fully passed, one email each, ever. The "review_requested_at IS NULL"
  // guard (checked again in the UPDATE below) is what makes this safe to
  // run daily without re-emailing the same guest.
  const reviewCandidates = await getReservationsForReviewRequest();
  let reviewRequestedCount = 0;
  for (const row of reviewCandidates) {
    const updateResult = await pool.query(
      `UPDATE reservations SET review_requested_at = now() WHERE id = $1 AND review_requested_at IS NULL`,
      [row.id]
    );
    if (updateResult.rowCount === 0) continue;
    reviewRequestedCount++;
    try {
      await sendGuestReviewRequestEmail(row);
    } catch (err) {
      console.error("Failed to send guest review-request email:", err);
    }
  }

  // Sent every day regardless of whether anything is pending, so Marco
  // always has a fresh link to the current-bookings page in his inbox --
  // not just on days there's something to review.
  const confirmedCount = (await getUpcomingConfirmed()).length;
  const secret = process.env.PENDING_LIST_SECRET ?? "";
  const siteUrl = process.env.SITE_URL ?? "https://marcoskitchen.vercel.app";
  const pendingUrl = `${siteUrl}/pending/${secret}`;
  const pendingLine =
    upcoming.length > 0
      ? `${upcoming.length} pending request${upcoming.length === 1 ? "" : "s"} awaiting review.`
      : "No pending requests right now.";
  const confirmedLine = `${confirmedCount} confirmed booking${confirmedCount === 1 ? "" : "s"} upcoming.`;

  try {
    await sendEmail({
      to: process.env.STAFF_EMAIL ?? "",
      subject:
        upcoming.length > 0
          ? `${upcoming.length} pending request${upcoming.length === 1 ? "" : "s"} awaiting review`
          : `Daily summary — ${confirmedCount} confirmed booking${confirmedCount === 1 ? "" : "s"} upcoming`,
      html: `<p>${pendingLine}</p>
             <p>${confirmedLine}</p>
             <p><a href="${pendingUrl}">View current bookings</a></p>`,
    });
  } catch (err) {
    console.error("Failed to send Marco's daily digest email:", err);
  }

  return Response.json({
    ok: true,
    lapsedCount,
    upcomingCount: upcoming.length,
    confirmedCount,
    reviewRequestedCount,
  });
}
