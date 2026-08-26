import { pool } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendGuestLapsedEmail } from "@/lib/guestEmails";
import { isPastEastern } from "@/lib/dates";

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

  if (upcoming.length > 0) {
    const secret = process.env.PENDING_LIST_SECRET ?? "";
    const siteUrl = process.env.SITE_URL ?? "https://marcoskitchen.vercel.app";
    const pendingUrl = `${siteUrl}/pending/${secret}`;
    try {
      await sendEmail({
        to: process.env.STAFF_EMAIL ?? "",
        subject: `${upcoming.length} pending request${upcoming.length === 1 ? "" : "s"} awaiting review`,
        html: `<p>You have ${upcoming.length} pending request${upcoming.length === 1 ? "" : "s"} awaiting review.</p>
               <p><a href="${pendingUrl}">Review pending requests</a></p>`,
      });
    } catch (err) {
      console.error("Failed to send Marco's pending digest email:", err);
    }
  }

  return Response.json({ ok: true, lapsedCount, upcomingCount: upcoming.length });
}
