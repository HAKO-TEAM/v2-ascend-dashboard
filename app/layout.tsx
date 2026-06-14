import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ASCEND · HzE-Steuerungsplattform',
  description: 'Kommunale Steuerungsplattform für Hilfen zur Erziehung – Echtzeit-Monitoring, Frühwarnung, Trägersteuerung.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="bg-slate-950 text-slate-100 antialiased">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
