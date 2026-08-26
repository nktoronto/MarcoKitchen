import { getReservationByToken, getSameDayContext } from "@/lib/decisions";
import { locations } from "@/lib/locations";
import { formatDateLabel, formatTimeLabel } from "@/lib/formatting";
import { approveReservationAction, declineReservationAction } from "./actions";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const reservation = await getReservationByToken(token);

  if (!reservation) {
    return (
      <Shell>
        <p>This link isn&rsquo;t valid.</p>
      </Shell>
    );
  }

  const location = locations.find((l) => l.id === reservation.location);
  const locationName = location?.name ?? reservation.location;
  const when = `${formatDateLabel(reservation.reservation_date)} at ${formatTimeLabel(reservation.reservation_time)}`;

  if (reservation.status !== "pending") {
    return (
      <Shell>
        <h2 className="display" style={{ fontSize: "24px", color: "var(--gold-pale)" }}>
          Already handled
        </h2>
        <p>
          {reservation.name} — party of {reservation.party_size} — {locationName}, {when}
        </p>
        <p>
          Current status: <strong>{reservation.status}</strong>
        </p>
        {reservation.decline_reason && <p>Reason: {reservation.decline_reason}</p>}
      </Shell>
    );
  }

  const context = await getSameDayContext(reservation.location, reservation.reservation_date, reservation.id);

  return (
    <Shell>
      <h2 className="display" style={{ fontSize: "24px", color: "var(--gold-pale)" }}>
        Large Party Pending Review
      </h2>

      <div style={{ marginTop: "16px" }}>
        <p>
          <strong>{reservation.name}</strong> — party of {reservation.party_size}
        </p>
        <p>{locationName}, {when}</p>
        <p>Email: {reservation.email}</p>
        {reservation.phone && <p>Phone: {reservation.phone}</p>}
        {reservation.notes && <p>Notes: {reservation.notes}</p>}
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "12px 14px",
          background: "rgba(23,36,26,0.04)",
          border: "1px solid rgba(23,36,26,0.1)",
          borderRadius: "10px",
        }}
      >
        <p style={{ fontWeight: 700, marginBottom: "6px" }}>
          Also booked at {locationName} that day
        </p>
        {context.rows.length === 0 ? (
          <p>Nothing else booked that day.</p>
        ) : (
          <ul>
            {context.rows.map((r, i) => (
              <li key={i}>
                {r.name} — {formatTimeLabel(r.reservation_time)} — party of {r.party_size} — {r.status}
              </li>
            ))}
          </ul>
        )}
        <p style={{ marginTop: "8px" }}>
          Confirmed covers: {context.confirmedTotal} &middot; Pending covers: {context.pendingTotal} &middot; Capacity: {context.capacity}
        </p>
      </div>

      <form action={approveReservationAction} style={{ marginTop: "20px" }}>
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="btn-primary">
          Approve
        </button>
      </form>

      <form action={declineReservationAction} style={{ marginTop: "16px" }}>
        <input type="hidden" name="token" value={token} />
        <span className="field-label">Decline reason (optional)</span>
        <textarea name="reason" className="field-input" placeholder="e.g. fully booked that night" />
        <button type="submit" className="btn-primary" style={{ marginTop: "10px" }}>
          Decline
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        background: "var(--cream)",
        color: "var(--ink)",
        minHeight: "100vh",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>{children}</div>
    </main>
  );
}
