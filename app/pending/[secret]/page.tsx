import { getAllPending, getUpcomingConfirmed, type ConfirmedRow, type PendingRow } from "@/lib/decisions";
import { locations } from "@/lib/locations";
import { formatDateLabel, formatTimeLabel } from "@/lib/formatting";

export default async function PendingListPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;

  if (secret !== process.env.PENDING_LIST_SECRET) {
    return (
      <Shell>
        <p>Not found.</p>
      </Shell>
    );
  }

  const [pendingRows, confirmedRows] = await Promise.all([getAllPending(), getUpcomingConfirmed()]);

  return (
    <Shell>
      <h2 className="display" style={{ fontSize: "24px", color: "var(--ink)" }}>
        Reservations
      </h2>

      <h3 style={{ fontSize: "16px", marginTop: "24px" }}>
        Needs Review {pendingRows.length > 0 && `(${pendingRows.length})`}
      </h3>
      {pendingRows.length === 0 ? (
        <p style={{ marginTop: "8px" }}>Nothing pending right now.</p>
      ) : (
        <ul style={{ marginTop: "12px", listStyle: "none", padding: 0 }}>
          {pendingRows.map((r) => (
            <PendingItem key={r.id} row={r} />
          ))}
        </ul>
      )}

      <h3 style={{ fontSize: "16px", marginTop: "28px" }}>
        Upcoming — Confirmed {confirmedRows.length > 0 && `(${confirmedRows.length})`}
      </h3>
      {confirmedRows.length === 0 ? (
        <p style={{ marginTop: "8px" }}>No upcoming confirmed bookings.</p>
      ) : (
        <ul style={{ marginTop: "12px", listStyle: "none", padding: 0 }}>
          {confirmedRows.map((r) => (
            <ConfirmedItem key={r.id} row={r} />
          ))}
        </ul>
      )}
    </Shell>
  );
}

function PendingItem({ row }: { row: PendingRow }) {
  const locationName = locations.find((l) => l.id === row.location)?.name ?? row.location;
  const when = `${formatDateLabel(row.reservation_date)} at ${formatTimeLabel(row.reservation_time)}`;
  return (
    <li
      style={{
        marginBottom: "12px",
        padding: "12px 14px",
        background: "rgba(23,36,26,0.04)",
        border: "1px solid rgba(23,36,26,0.1)",
        borderRadius: "10px",
      }}
    >
      <p>
        <strong>{row.name}</strong> — party of {row.party_size}
      </p>
      <p>{locationName}, {when}</p>
      {row.notes && <p>Notes: {row.notes}</p>}
      <p style={{ marginTop: "6px" }}>
        <a href={`/review/${row.decision_token}`}>Review this request</a>
      </p>
    </li>
  );
}

function ConfirmedItem({ row }: { row: ConfirmedRow }) {
  const locationName = locations.find((l) => l.id === row.location)?.name ?? row.location;
  const when = `${formatDateLabel(row.reservation_date)} at ${formatTimeLabel(row.reservation_time)}`;
  return (
    <li
      style={{
        marginBottom: "12px",
        padding: "12px 14px",
        background: "rgba(56,142,60,0.06)",
        border: "1px solid rgba(23,36,26,0.1)",
        borderRadius: "10px",
      }}
    >
      <p>
        <strong>{row.name}</strong> — party of {row.party_size}
      </p>
      <p>{locationName}, {when}</p>
      {row.notes && <p>Notes: {row.notes}</p>}
    </li>
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
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>{children}</div>
    </main>
  );
}
