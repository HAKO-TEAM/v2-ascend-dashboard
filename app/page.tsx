'use client';

const CALENDLY = 'https://calendly.com/pvzeg/besprechung-kennenlernen?month=2026-06';
const CITY = 'Lindenau';
const YEAR = 2026;

const kpis = [
  { value: '220 k', label: 'Einwohner', sub: 'Stadt Lindenau' },
  { value: '45,2 Mio. €', label: 'HzE-Budget', sub: 'Haushalt 2026' },
  { value: '580', label: 'Aktive Fälle', sub: 'Stand Juni 2026' },
  { value: '18', label: 'Träger', sub: 'im Netzwerk' },
];

const steps = [
  { n: '01', title: 'Datenzugang', body: 'ASCEND greift auf Ihre bestehende Fallsoftware zu – kein Systemwechsel, kein IT-Projekt.' },
  { n: '02', title: 'Pilot live in 3 Wochen', body: 'Wir konfigurieren die Plattform für Lindenau. Nach drei Wochen sehen Sie die ersten Frühwarnsignale.' },
  { n: '03', title: 'Steuerung & Reporting', body: 'Monatliche §79a-Berichte, Träger-Controlling und Budgetprognosen – alles in einem Dashboard.' },
];

const panels = [
  {
    title: 'Fallübersicht',
    sub: '580 Fälle · Juni 2026',
    accent: '#06b6d4',
    content: (
      <div className="p-3 space-y-1.5 text-xs font-mono">
        {[
          { id: 'LIN-0042', typ: 'A', ampel: 'rot', kosten: '2.840 €', traeger: 'AWO Lindenau' },
          { id: 'LIN-0117', typ: 'B', ampel: 'gelb', kosten: '1.490 €', traeger: 'Caritas Nord' },
          { id: 'LIN-0203', typ: 'A', ampel: 'rot', kosten: '3.120 €', traeger: 'SKF Lindenau' },
          { id: 'LIN-0318', typ: 'C', ampel: 'grün', kosten: '680 €', traeger: 'DRK Süd' },
          { id: 'LIN-0401', typ: 'B', ampel: 'gelb', kosten: '1.250 €', traeger: 'AWO Lindenau' },
        ].map(r => (
          <div key={r.id} className="flex items-center gap-2 bg-slate-900/80 rounded px-2 py-1.5">
            <span className="text-slate-500 w-16">{r.id}</span>
            <span className="text-slate-300 w-4">{r.typ}</span>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.ampel === 'rot' ? 'bg-red-500' : r.ampel === 'gelb' ? 'bg-amber-400' : 'bg-emerald-500'}`} />
            <span className="text-cyan-300 w-14 text-right">{r.kosten}</span>
            <span className="text-slate-500 truncate">{r.traeger}</span>
          </div>
        ))}
        <div className="text-slate-600 text-center pt-1">… 575 weitere Fälle</div>
      </div>
    ),
  },
  {
    title: 'Budget-Forecast',
    sub: 'Hochrechnung 2026',
    accent: '#2563eb',
    content: (
      <div className="p-3">
        <div className="flex items-end gap-1.5 h-24 mb-2">
          {[
            { m: 'Jan', v: 62, actual: true },
            { m: 'Feb', v: 68, actual: true },
            { m: 'Mrz', v: 71, actual: true },
            { m: 'Apr', v: 74, actual: true },
            { m: 'Mai', v: 78, actual: true },
            { m: 'Jun', v: 81, actual: true },
            { m: 'Jul', v: 83, actual: false },
            { m: 'Aug', v: 85, actual: false },
            { m: 'Sep', v: 87, actual: false },
            { m: 'Okt', v: 89, actual: false },
            { m: 'Nov', v: 91, actual: false },
            { m: 'Dez', v: 94, actual: false },
          ].map(b => (
            <div key={b.m} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-t"
                style={{
                  height: `${b.v}%`,
                  background: b.actual
                    ? 'linear-gradient(to top, #1d4ed8, #2563eb)'
                    : 'linear-gradient(to top, #1e3a5f55, #2563eb33)',
                  border: b.actual ? 'none' : '1px dashed #2563eb55',
                }}
              />
              <span className="text-slate-600 text-[8px]">{b.m}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[9px] mt-1">
          <span className="text-slate-500">Ist-Ausgaben</span>
          <span className="text-red-400 font-bold">Prognose: 47,6 Mio. € (+5,3%)</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Trägersteuerung',
    sub: '18 aktive Träger',
    accent: '#06b6d4',
    content: (
      <div className="p-3 grid grid-cols-2 gap-1.5 text-[10px]">
        {[
          { name: 'AWO Lindenau', faelle: 142, budget: '12,4 M', status: 'ok' },
          { name: 'Caritas Nord', faelle: 98, budget: '8,7 M', status: 'ok' },
          { name: 'SKF Lindenau', faelle: 76, budget: '7,1 M', status: 'warn' },
          { name: 'DRK Süd', faelle: 54, budget: '4,2 M', status: 'ok' },
          { name: 'Diakonie West', faelle: 43, budget: '3,9 M', status: 'warn' },
          { name: 'IJH Mitte', faelle: 31, budget: '2,8 M', status: 'ok' },
        ].map(t => (
          <div key={t.name} className="bg-slate-900/80 rounded p-1.5 flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 truncate font-medium">{t.name}</span>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            </div>
            <div className="flex justify-between text-slate-500">
              <span>{t.faelle} Fälle</span>
              <span className="text-cyan-400">{t.budget}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Reporting §79a',
    sub: 'Qualitätssicherung',
    accent: '#2563eb',
    content: (
      <div className="p-3 space-y-2 text-[10px]">
        <div className="bg-slate-900/80 rounded p-2">
          <div className="text-slate-500 mb-1">Planungsquote erreicht</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '87%' }} />
            </div>
            <span className="text-emerald-400 font-bold">87%</span>
          </div>
        </div>
        <div className="bg-slate-900/80 rounded p-2">
          <div className="text-slate-500 mb-1">Hilfeplanfristen (§36 SGB VIII)</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: '74%' }} />
            </div>
            <span className="text-amber-300 font-bold">74%</span>
          </div>
        </div>
        <div className="bg-slate-900/80 rounded p-2">
          <div className="text-slate-500 mb-1">Dokumentationskonformität</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full" style={{ width: '93%' }} />
            </div>
            <span className="text-cyan-300 font-bold">93%</span>
          </div>
        </div>
        <div className="text-slate-600 text-center pt-0.5">Exportbereit als PDF · KJHG-konform</div>
      </div>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded flex items-center justify-center text-white font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #0e7490, #2563eb)' }}
            >
              A
            </div>
            <span className="font-bold tracking-wider text-slate-100">ASCEND</span>
            <span className="text-slate-700 hidden sm:inline">·</span>
            <span className="text-slate-500 text-sm hidden sm:inline">HzE-Steuerungsplattform</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors hidden sm:inline"
            >
              Demo-Dashboard
            </a>
            <a
              href={CALENDLY}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #0e7490, #2563eb)', color: '#f0f9ff' }}
            >
              Termin anfragen
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(6,182,212,0.12) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-12 relative">
          <div className="flex items-center gap-2 mb-5">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.25em] uppercase px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Pilot-Demonstrator · {CITY} · {YEAR}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] mb-5 max-w-4xl">
            HzE-Steuerung,{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #06b6d4, #2563eb)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              die wirkt.
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mb-8 leading-relaxed">
            ASCEND zeigt Ihrem Jugendamt in Echtzeit, welche Fälle eskalieren werden –
            bevor sie es tun. Trägercontrolling, Budgetprognose und §79a-Reporting
            in einer kommunalen Plattform.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-black tracking-wide transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #0e7490, #2563eb)',
                color: '#f0f9ff',
                boxShadow: '0 0 32px rgba(6,182,212,0.3), 0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              Zum Dashboard →
            </a>
            <a
              href={CALENDLY}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-800 border border-slate-700 text-slate-300"
            >
              Termin vereinbaren
            </a>
          </div>
        </div>
      </section>

      {/* KPI Strip */}
      <section className="border-y border-slate-800/60 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {kpis.map(k => (
            <div key={k.label} className="text-center sm:text-left">
              <div
                className="text-2xl font-black mb-0.5"
                style={{ background: 'linear-gradient(90deg, #06b6d4, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                {k.value}
              </div>
              <div className="text-slate-300 text-sm font-semibold">{k.label}</div>
              <div className="text-slate-600 text-xs">{k.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Previews */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold tracking-[0.3em] text-cyan-500 uppercase mb-3">
            Live-Demonstrator · Stadt {CITY}
          </p>
          <h2 className="text-3xl font-black text-slate-100 mb-3">
            Vier Ansichten. Ein System.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm">
            Alle Daten fließen in eine Plattform – für ASD, Controlling und Amtsleitung.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {panels.map(panel => (
            <div
              key={panel.title}
              className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/50"
              style={{ borderTop: `2px solid ${panel.accent}` }}
            >
              <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
                <div>
                  <div className="text-slate-100 font-bold text-sm">{panel.title}</div>
                  <div className="text-slate-600 text-[10px]">{panel.sub}</div>
                </div>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                </div>
              </div>
              {panel.content}
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
          >
            Vollständiges Dashboard öffnen →
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-800/60 bg-slate-900/20">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-slate-100 mb-2">In drei Schritten einsatzbereit</h2>
            <p className="text-slate-500 text-sm">Kein IT-Projekt. Kein Systemwechsel.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map(s => (
              <div key={s.n} className="relative">
                <div
                  className="text-5xl font-black mb-3 leading-none"
                  style={{ color: 'rgba(6,182,212,0.15)' }}
                >
                  {s.n}
                </div>
                <h3 className="text-slate-100 font-bold text-base mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div
          className="rounded-2xl p-8 sm:p-10 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(14,116,144,0.15) 0%, rgba(37,99,235,0.10) 100%)',
            border: '1px solid rgba(6,182,212,0.2)',
            borderTop: '2px solid #06b6d4',
          }}
        >
          <p className="text-[10px] font-bold tracking-[0.3em] text-cyan-500 uppercase mb-4">
            ASCEND · Pilot-Programm {YEAR}
          </p>
          <h2 className="text-3xl font-black text-slate-100 mb-3">
            ASCEND für {CITY} einrichten.
          </h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto mb-6 leading-relaxed">
            30 Minuten Gespräch genügen. Kein Auftrag, kein Risiko –
            nur ein realistischer Blick, was ASCEND für Ihr Jugendamt leisten kann.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              { label: '10 €', sub: 'je Fall / Monat' },
              { label: '3 Wochen', sub: 'bis Pilot live' },
              { label: 'Monatlich', sub: 'kündbar' },
              { label: 'Kein IT-Projekt', sub: 'kein Systemwechsel' },
            ].map(({ label, sub }) => (
              <div key={label} className="flex items-center gap-1.5 bg-slate-900/60 rounded-lg px-3 py-1.5">
                <span className="text-sm font-black text-cyan-300">{label}</span>
                <span className="text-xs text-slate-500">{sub}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={CALENDLY}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-sm font-black tracking-wide transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #0e7490, #2563eb)',
                color: '#f0f9ff',
                boxShadow: '0 0 32px rgba(6,182,212,0.35), 0 4px 20px rgba(0,0,0,0.5)',
                textShadow: '0 0 10px rgba(6,182,212,0.4)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Termin anfragen →
            </a>
            <a
              href="/dashboard"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors font-semibold"
            >
              Erst das Dashboard ansehen →
            </a>
          </div>
          <p className="text-[10px] text-slate-700 tracking-wider mt-4">
            KOSTENLOSES ERSTGESPRÄCH · 30 MIN · KEIN AUFTRAG
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-white font-black text-xs"
              style={{ background: 'linear-gradient(135deg, #0e7490, #2563eb)' }}
            >
              A
            </div>
            <span className="text-slate-600 text-xs">
              © {YEAR} HAKO Beteiligungsgesellschaft mbH Dresden
            </span>
          </div>
          <div className="flex gap-4">
            <a href="https://hako.team" target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:text-slate-400 text-xs transition-colors">
              hako.team
            </a>
            <a href="/dashboard" className="text-slate-700 hover:text-slate-400 text-xs transition-colors">
              Dashboard
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
