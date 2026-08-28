import type { Metadata } from "next";
import { Bevan, Karla } from "next/font/google";
import "./globals.css";

const bevan = Bevan({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const karla = Karla({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Café de Khan — Reserve a Table",
  description:
    "Book a table at Café de Khan, a Pakistani eatery est. 1952. Small parties confirmed instantly, large groups confirmed personally.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bevan.variable} ${karla.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
