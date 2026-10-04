import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evidence Portal",
  description: "A secure place to organise project evidence.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
