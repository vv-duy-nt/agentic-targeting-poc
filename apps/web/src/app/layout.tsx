import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vietvang | AI Customer Targeting",
  description: "AI customer targeting proof of concept",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
