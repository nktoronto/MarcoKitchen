// Placeholder copy — draft only, swap in Marco's real catering details
// (offerings, minimum group size, lead time, contact method) before launch.
export default function Catering() {
  return (
    <section style={{ background: "var(--bg-deep)", padding: "48px 20px" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", textAlign: "center" }}>
        <h2 className="display" style={{ fontSize: "24px", color: "var(--gold-pale)" }}>
          Catering
        </h2>
        <p
          style={{
            fontSize: "15px",
            lineHeight: 1.6,
            color: "var(--cream)",
            opacity: 0.85,
            margin: "12px auto 0",
            maxWidth: "380px",
          }}
        >
          Planning something bigger? Café de Khan caters private events and
          large gatherings with the same menu you love. Reach out to talk
          through your event and we&rsquo;ll help you plan the spread.
        </p>
      </div>
    </section>
  );
}
