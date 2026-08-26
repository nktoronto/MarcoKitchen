import Image from "next/image";

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--bg-deep)",
        padding: "40px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Image src="/images/logo.png" alt="Café de Khan crest" width={56} height={50} style={{ opacity: 0.9 }} />
    </footer>
  );
}
