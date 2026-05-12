import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KostIn — Cari Kost Berbasis AI",
  description: "Platform pencarian kost untuk mahasiswa di Malang, Indonesia.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
