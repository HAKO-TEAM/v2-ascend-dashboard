import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ASCEND Pilot Dashboard',
  description: 'Pilot Dashboard für kommunales Management der Hochrisikofälle in HzE',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="bg-slate-950 text-slate-100 antialiased">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
