import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shock of the Week",
  description:
    "Shock of the Week is a collaborative medical education platform featuring weekly ECGs, imaging, POCUS, and clinical reasoning challenges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
