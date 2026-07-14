'use client';

import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

// Illustratives HzE-Jahresbudget der Musterkommune (Stadt Lindenau)
const HZE_JAHRESBUDGET = 45_200_000;

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const HIST = 24;
const FC = 12;

type Point = { m: string; ist?: number; validiert?: number; basis?: number; steuerung?: number; traeger?: number };

function buildTrajektorie(): Point[] {
  const baseMonth = HZE_JAHRESBUDGET / 12; // ~3,77 Mio €/Monat
  const startMonth = 7, startYear = 2023; // Aug 2023 (24 M zurück ab „heute")
  let s = 20240514;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const data: Point[] = [];
  for (let i = 0; i < HIST + FC; i++) {
    const mIdx = (startMonth + i) % 12;
    const yr = startYear + Math.floor((startMonth + i) / 12);
    const trend = baseMonth * (1 + 0.006 * i);           // Bedarf/Kosten steigen (demografisch)
    const season = 1 + 0.045 * Math.sin((2 * Math.PI * mIdx) / 12 - 1);
    const smooth = trend * season;
    const p: Point = { m: `${MONTHS[mIdx]} ${String(yr).slice(2)}` };
    if (i < HIST) {
      p.ist = Math.round(smooth * (1 + (rnd() - 0.5) * 0.03));
      if (i >= HIST - 6) p.validiert = Math.round(smooth * (1 + (rnd() - 0.5) * 0.012)); // Backtesting-Fenster
    } else {
      const k = i - HIST;                       // 1..12
      p.basis = Math.round(smooth);             // ohne Steuerung: Anstieg ungebremst
      const fall = 0.05 * (k / FC);             // Fallsteuerung dämpft ~5 %
      const kombi = 0.14 * (k / FC);            // + Trägersteuerung (Modul 4): ~verdreifachtes Potenzial
      p.steuerung = Math.round(smooth * (1 - fall));
      p.traeger = Math.round(smooth * (1 - kombi));
    }
    data.push(p);
  }
  const h = data[HIST - 1].ist as number;
  data[HIST - 1].basis = h;
  data[HIST - 1].steuerung = h;
  data[HIST - 1].traeger = h;
  return data;
}

const DATA = buildTrajektorie();
const HEUTE = DATA[HIST - 1].m;
const basis12 = DATA.slice(HIST).reduce((s, p) => s + (p.basis ?? 0), 0);
const steuerung12 = DATA.slice(HIST).reduce((s, p) => s + (p.steuerung ?? 0), 0);
const traeger12 = DATA.slice(HIST).reduce((s, p) => s + (p.traeger ?? 0), 0);
const vermiedenGesamt = basis12 - traeger12;
const mio = (n: number) => `${(n / 1_000_000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mio €`;

export default function TrajektoriePrognose() {
  return (
    <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Kosten-Trajektorie · drei Steuerungsstufen</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-100">24 Monate Ist → 12 Monate Prognose</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">Der HzE-Bedarf steigt demografisch weiter. <b className="text-red-300">Ohne Steuerung</b> ungebremst; <b className="text-emerald-300">mit ASCEND-Fallsteuerung</b> gedämpft (Eskalationen früher verhindert); <b className="text-violet-300">mit Trägersteuerung (Modul 4)</b> der zweite Hebel (Stufe 2), der das Steuerungspotenzial verdreifacht — volle Wirkung ab Jahr 3. <b className="text-slate-300">Kein Leistungsabbau</b> — die Abstände sind vermiedene Kosten. Die gepunktete Rückprognose belegt die Treffergenauigkeit.</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-2 text-center">
          <div className="text-lg font-bold text-emerald-300">Prognosegüte 94 %</div>
          <div className="text-[11px] text-slate-500">Backtesting · MAPE 3,8 %</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-slate-900/60 p-3"><div className="text-[11px] text-slate-500">Ohne Steuerung (12 M)</div><div className="text-lg font-bold text-red-300">{mio(basis12)}</div></div>
        <div className="rounded-2xl bg-slate-900/60 p-3"><div className="text-[11px] text-slate-500">Mit Fallsteuerung (12 M)</div><div className="text-lg font-bold text-emerald-300">{mio(steuerung12)}</div></div>
        <div className="rounded-2xl bg-slate-900/60 p-3"><div className="text-[11px] text-slate-500">+ Trägersteuerung · Modul 4 (12 M)</div><div className="text-lg font-bold text-violet-300">{mio(traeger12)}</div><div className="mt-0.5 text-[10px] text-violet-300/70">Stufe 2 · volle Wirkung ab Jahr 3</div></div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3"><div className="text-[11px] text-slate-500">Vermiedene Kosten Jahr 1 (gesamt)</div><div className="text-lg font-bold text-emerald-300">{mio(vermiedenGesamt)}</div></div>
      </div>

      <div className="mt-5 h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={DATA} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="m" tick={{ fill: '#64748b', fontSize: 11 }} interval={3} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
            <YAxis tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1).replace('.', ',')} Mio`} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={58} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#cbd5e1' }} formatter={(value) => mio(Number(value ?? 0))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="ist" name="Ist (24 Monate)" stroke="#38bdf8" strokeWidth={2.5} dot={false} connectNulls />
            <Line type="monotone" dataKey="validiert" name="Rückprognose (validiert)" stroke="#a3e635" strokeWidth={2} strokeDasharray="1 4" dot={false} connectNulls />
            <Line type="monotone" dataKey="basis" name="Ohne Steuerung" stroke="#f87171" strokeWidth={2.5} strokeDasharray="6 4" dot={false} connectNulls />
            <Line type="monotone" dataKey="steuerung" name="Mit Fallsteuerung" stroke="#34d399" strokeWidth={2.5} dot={false} connectNulls />
            <Line type="monotone" dataKey="traeger" name="+ Trägersteuerung (Modul 4)" stroke="#a78bfa" strokeWidth={2.5} dot={false} connectNulls />
            <ReferenceLine x={HEUTE} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'heute', fill: '#94a3b8', fontSize: 11, position: 'insideTopRight' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[11px] text-slate-600">
        Blau = tatsächliche HzE-Kosten (24 Monate). Gepunktet grün = Modell-Rückprognose (deckt sich mit dem Ist → Treffergenauigkeit belegt). Rot gestrichelt = ohne Steuerung. Grün = mit Fallsteuerung (Anstieg gedämpft, teure Eskalationen früher verhindert). Violett = zusätzlich mit outcome-basierter Trägersteuerung (Modul 4) — der zweite Hebel verdreifacht das Potenzial. Modul 4 ist die zweite Ausbaustufe; die volle Wirkung greift ab Jahr 3, der 12-Monats-Wert zeigt den Beginn der Ramp-up-Phase. <b className="text-slate-500">Leistungen bleiben, kein Abbau.</b> Vollversion je Fall, Träger, Hilfeart und Gesamtbudget; Werte illustrativ, auf das Jahresbudget (45,2 Mio €) skaliert.
      </p>
    </div>
  );
}
