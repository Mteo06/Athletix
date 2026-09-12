import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Athletix — Gestionale Impianti Sportivi",
  description:
    "Piattaforma multi-tenant per la gestione di piscine, campi padel, calcio e corsi sportivi: CRM, planner, accessi QR, staff e vendite.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
