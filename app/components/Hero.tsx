"use client";

import Image from "next/image";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Hero() {
  return (
    <section
      style={{
        position: "relative",
        padding: "56px 24px 64px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 400 400"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-60px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "520px",
          height: "520px",
          opacity: 0.16,
          zIndex: 0,
        }}
      >
        <circle cx="200" cy="200" r="188" fill="none" stroke="#EFDBA1" strokeWidth="1.5" />
        <path
          d="M 90 260 Q 90 140 200 120 Q 310 140 310 260"
          fill="none"
          stroke="#EFDBA1"
          strokeWidth="1.5"
        />
        <circle cx="200" cy="70" r="4" fill="#EFDBA1" />
      </svg>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
          maxWidth: "480px",
          margin: "0 auto",
        }}
      >
        <Image src="/images/logo.png" alt="Café de Khan crest" width={108} height={97} />

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <h1 className="display" style={{ fontSize: "40px", color: "var(--gold-pale)", lineHeight: 1.05 }}>
            Café de Khan
          </h1>
          <div
            style={{
              fontSize: "13px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--gold-rich)",
              fontWeight: 600,
            }}
          >
            Pakistani Eatery &middot; Est. 1952
          </div>
        </div>

        <p style={{ fontSize: "17px", lineHeight: 1.5, color: "var(--cream)", margin: 0, maxWidth: "360px" }}>
          Book your table in under a minute &mdash; no phone tag, no waiting on hold.
        </p>

        <button
          type="button"
          className="btn-primary"
          style={{ marginTop: "8px", border: "none" }}
          onClick={() => scrollToId("reserve")}
        >
          Reserve a Table
        </button>
        <span
          style={{ fontSize: "14px", color: "var(--gold-pale)", opacity: 0.85, cursor: "pointer" }}
          onClick={() => scrollToId("menu")}
        >
          See what&rsquo;s cooking &darr;
        </span>
      </div>
    </section>
  );
}
