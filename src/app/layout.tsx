import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreamTransfer — Server-to-Server File Transfer",
  description:
    "Transfer massive files directly between servers. No downloads, no local storage, no limits. Stream gigabytes in minutes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
