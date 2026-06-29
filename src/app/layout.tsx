import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirFTP — Server-to-Server File Transfer",
  description:
    "Transfer massive files directly between servers. No downloads, no local storage, no limits. Stream gigabytes in minutes.",
};

const themeInitScript = `
(function () {
  var theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
