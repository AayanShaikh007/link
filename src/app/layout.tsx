import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Forge — Custom software, commissioned",
  description:
    "Find a developer for game mods, plugins, scripts, and useful software commissions.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
