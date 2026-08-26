import { getReservationByCancelToken } from "@/lib/decisions";
import { locations } from "@/lib/locations";
import { formatDateLabel, formatTimeLabel } from "@/lib/formatting";
import { cancelReservationAction } from "./actions";

export default async function CancelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const reservation = await getReservationByCancelToken(token);

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

  if (reservation.status !== "confirmed" && reservation.status !== "pending") {
    return (
      <Shell>
        <h2 className="display" style={{ fontSize: "24px", color: "var(--ink)" }}>
          Nothing to cancel
        </h2>
        <p>
          {reservation.name} — party of {reservation.party_size} — {locationName}, {when}
        </p>
        <p>
          Current status: <strong>{reservation.status}</strong>
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h2 className="display" style={{ fontSize: "24px", color: "var(--ink)" }}>
        Cancel Reservation
      </h2>
      <p style={{ marginTop: "12px" }}>
        {reservation.name} — party of {reservation.party_size} — {locationName}, {when}
      </p>
      <p>
        Current status: <strong>{reservation.status}</strong>
      </p>
      <form action={cancelReservationAction} style={{ marginTop: "20px" }}>
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="btn-primary">
          Yes, cancel this reservation
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
