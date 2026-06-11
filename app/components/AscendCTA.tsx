'use client';

const CALENDLY = 'https://calendly.com/pvzeg/besprechung-kennenlernen?month=2026-06';

interface Props {
  context?: string; // e.g. "Frühwarnung" or "Leitung Jugendamt"
}

export default function AscendCTA({ context }: Props) {
  return (
    <div className="mx-6 mb-6">
      <div
        className="rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-slate-900 via-cyan-950/15 to-slate-900 p-6"
        style={{ borderTop: '2px solid #06b6d4' }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          {/* Text */}
          <div>
            <p className="text-[9px] font-bold tracking-[0.3em] text-cyan-500 mb-2 uppercase">
              ASCEND · PILOT-PROGRAMM 2026
            </p>
            <h3 className="text-lg font-bold text-slate-100">
              ASCEND für Ihre Stadt einrichten – Pilot in 3 Wochen.
            </h3>
            <p className="mt-1.5 text-sm text-slate-400 max-w-xl">
              {context === 'fruehwarnung'
                ? 'Sie haben gesehen, wie viel früher ASCEND warnt. Der nächste Schritt ist ein 30-Minuten-Gespräch – kein Auftrag, kein Risiko.'
                : context === 'leitung'
                ? 'Sie haben das Steuerungspotenzial gesehen. Sprechen Sie mit uns über einen Pilot für Ihr Jugendamt – in 3 Wochen einsatzbereit.'
                : 'Starten Sie mit ASCEND – kommunale HzE-Steuerung, sofort einsatzbereit.'}
            </p>
            <div className="flex flex-wrap gap-4 mt-3">
              {[
                { label: '10 €', sub: 'Fall / Monat' },
                { label: '3 Wochen', sub: 'bis Pilot live' },
                { label: 'Monatlich', sub: 'kündbar' },
                { label: 'Kein IT-Projekt', sub: 'kein Systemwechsel' },
              ].map(({ label, sub }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-sm font-black text-cyan-300">{label}</span>
                  <span className="text-xs text-slate-500">{sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <a
              href={CALENDLY}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-xl px-8 py-4 text-sm font-black tracking-[0.12em] uppercase transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #0e7490, #2563eb)',
                color: '#f0f9ff',
                boxShadow: '0 0 24px rgba(6,182,212,0.35), 0 4px 16px rgba(0,0,0,0.4)',
                textShadow: '0 0 10px rgba(6,182,212,0.5)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Termin anfragen →
            </a>
            <p className="text-[9px] text-slate-600 tracking-wider text-center">
              KOSTENLOSES ERSTGESPRÄCH · 30 MIN
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
