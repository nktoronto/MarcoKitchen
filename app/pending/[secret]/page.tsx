import { getAllPending } from "@/lib/decisions";
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

  const rows = await getAllPending();

  return (
    <Shell>
      <h2 className="display" style={{ fontSize: "24px", color: "var(--ink)" }}>
        Pending Requests
      </h2>

      {rows.length === 0 ? (
        <p style={{ marginTop: "16px" }}>Nothing pending right now.</p>
      ) : (
        <ul style={{ marginTop: "16px", listStyle: "none", padding: 0 }}>
          {rows.map((r) => {
            const locationName = locations.find((l) => l.id === r.location)?.name ?? r.location;
            const when = `${formatDateLabel(r.reservation_date)} at ${formatTimeLabel(r.reservation_time)}`;
            return (
              <li
                key={r.id}
                style={{
                  marginBottom: "12px",
                  padding: "12px 14px",
                  background: "rgba(23,36,26,0.04)",
                  border: "1px solid rgba(23,36,26,0.1)",
                  borderRadius: "10px",
                }}
              >
                <p>
                  <strong>{r.name}</strong> — party of {r.party_size}
                </p>
                <p>{locationName}, {when}</p>
                {r.notes && <p>Notes: {r.notes}</p>}
                <p style={{ marginTop: "6px" }}>
                  <a href={`/review/${r.decision_token}`}>Review this request</a>
                </p>
              </li>
            );
          })}
        </ul>
      )}
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
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>{children}</div>
    </main>
  );
}
