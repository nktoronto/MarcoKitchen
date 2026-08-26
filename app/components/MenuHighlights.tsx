import Image from "next/image";
import { menuHighlights } from "@/lib/menu";

export default function MenuHighlights() {
  return (
    <section
      id="menu"
      style={{ background: "var(--bg-panel)", padding: "56px 20px 60px" }}
    >
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <h2 className="display" style={{ fontSize: "28px", color: "var(--gold-pale)" }}>
            A Taste of the Menu
          </h2>
          <p style={{ fontSize: "15px", color: "var(--cream)", opacity: 0.8, margin: "8px 0 0" }}>
            A few favorites &mdash; reserve a table for the rest.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "28px" }}>
          {menuHighlights.map((item) => (
            <div
              key={item.name}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(239,219,161,0.18)",
                borderRadius: "16px",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "relative", width: "100%", height: "160px" }}>
                <Image src={item.image} alt={item.alt} fill style={{ objectFit: "cover" }} />
              </div>
              <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <h3 className="display" style={{ fontSize: "19px", color: "var(--gold-pale)" }}>
                  {item.name}
                </h3>
                <p style={{ fontSize: "14px", lineHeight: 1.5, color: "var(--cream)", opacity: 0.85, margin: 0 }}>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
