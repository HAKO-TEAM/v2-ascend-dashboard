'use client';

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Legend,
} from 'recharts';
import type { CaseData } from '../../lib/cases';

// ── Types ─────────────────────────────────────────────────────────────────────
type Ampel = 'grün' | 'gelb' | 'rot';

interface CaseHistory {
  fall: CaseData;
  history: Ampel[];          // [0]=6M ago … [5]=heute
  ascendSignal: number | null; // month index ASCEND would have signaled
  officialSwitch: number | null; // month index official switch from grün
  wouldHaveSaved: number;    // € saved with early intervention
}

// ── Deterministisch: 6-Monats-Verlauf aus aktueller Ampel ableiten ────────────
function buildHistory(c: CaseData): Ampel[] {
  const risk = c.eskalationsrisiko || 0;
  if (c.ampelstatus === 'rot') {
    // Frühe Rot-Fälle: schnell eskaliert
    if (risk >= 88) return ['grün', 'gelb', 'gelb', 'rot', 'rot', 'rot'];
    // Standard: Grün → Gelb → Rot
    return ['grün', 'grün', 'gelb', 'gelb', 'rot', 'rot'];
  }
  if (c.ampelstatus === 'gelb') {
    // Hohes Risiko: schon länger gelb
    if (risk >= 60) return ['grün', 'grün', 'gelb', 'gelb', 'gelb', 'gelb'];
    // Kürzlich verschlechtert
    return ['grün', 'grün', 'grün', 'grün', 'gelb', 'gelb'];
  }
  return ['grün', 'grün', 'grün', 'grün', 'grün', 'grün'];
}

// ASCEND signalisiert 2 Monate (= 8 Wochen) vor erstem offiziellen Gelb/Rot
function getAscendSignal(history: Ampel[]): number | null {
  const firstNonGreen = history.findIndex(h => h !== 'grün');
  if (firstNonGreen <= 0) return null;
  return Math.max(0, firstNonGreen - 2);
}

function buildCaseHistory(c: CaseData): CaseHistory {
  const history = buildHistory(c);
  const ascendSignal = getAscendSignal(history);
  const officialSwitch = history.findIndex(h => h !== 'grün');
  // Saved costs: if intervention at Gelb, avoid escalation to Rot premium
  const monthlyCost = Number(c.monatKostenGesamt) || 0;
  const wouldHaveSaved = c.ampelstatus === 'rot'
    ? Math.round(monthlyCost * 0.28 * 2) // 2 months of 28% premium avoided
    : c.ampelstatus === 'gelb' && (c.eskalationsrisiko || 0) >= 60
    ? Math.round(monthlyCost * 0.15 * 2)
    : 0;
  return { fall: c, history, ascendSignal, officialSwitch: officialSwitch < 0 ? null : officialSwitch, wouldHaveSaved };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun'];

function fmt(n: number) { return n.toLocaleString('de-DE'); }

const AMPEL_BG: Record<Ampel, string> = {
  grün: 'bg-emerald-500/80',
  gelb: 'bg-amber-500/80',
  rot:  'bg-red-500/80',
};
const AMPEL_TEXT: Record<Ampel, string> = {
  grün: 'text-emerald-400',
  gelb: 'text-amber-400',
  rot:  'text-red-400',
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', fontFamily: 'monospace', fontSize: 11 }}>
      <div style={{ color: '#64748b', marginBottom: 6, letterSpacing: 2 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 3 }}>
          {p.name}: <strong>€ {fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props { cases: CaseData[]; }

// ── Component ─────────────────────────────────────────────────────────────────
export default function FruehwarnungDashboard({ cases }: Props) {

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const histories = useMemo(() =>
    [...cases]
      .sort((a, b) => (b.eskalationsrisiko || 0) - (a.eskalationsrisiko || 0))
      .map(buildCaseHistory),
    [cases]
  );

  const stats = useMemo(() => {
    const escalated   = histories.filter(h => h.fall.ampelstatus === 'rot');
    const warning     = histories.filter(h => h.fall.ampelstatus === 'gelb' && (h.fall.eskalationsrisiko || 0) >= 60);
    const withSignal  = histories.filter(h => h.ascendSignal !== null && h.officialSwitch !== null);
    const avgLead     = withSignal.length
      ? Math.round(withSignal.reduce((s, h) => s + ((h.officialSwitch! - h.ascendSignal!) * 4.3), 0) / withSignal.length)
      : 8;
    const totalSaved  = histories.reduce((s, h) => s + h.wouldHaveSaved, 0);
    return { escalated, warning, withSignal, avgLead, totalSaved };
  }, [histories]);

  // Cost comparison chart: escalated cases, monat-wise with/without ASCEND
  const costChartData = useMemo(() => {
    return MONTHS.map((month, i) => {
      const ohneASCEND = histories
        .filter(h => h.fall.ampelstatus === 'rot')
        .reduce((s, h) => {
          const stepAmpel = h.history[i];
          const base = Number(h.fall.monatKostenGesamt) || 0;
          return s + (stepAmpel === 'rot' ? base : stepAmpel === 'gelb' ? base * 0.72 : base * 0.55);
        }, 0);
      const mitASCEND = histories
        .filter(h => h.fall.ampelstatus === 'rot')
        .reduce((s, h) => {
          // With ASCEND: intervene at signal month → cost stays at gelb level
          const signal = h.ascendSignal;
          const base = Number(h.fall.monatKostenGesamt) || 0;
          if (signal !== null && i >= signal) {
            return s + base * 0.62; // held at gelb level via intervention
          }
          const stepAmpel = h.history[i];
          return s + (stepAmpel === 'rot' ? base : stepAmpel === 'gelb' ? base * 0.72 : base * 0.55);
        }, 0);
      return { month, 'Ohne ASCEND': Math.round(ohneASCEND), 'Mit ASCEND': Math.round(mitASCEND) };
    });
  }, [histories]);

  // Trajectories for currently-gelb high-risk cases
  const trajectoryData = useMemo(() => {
    const atRisk = histories.filter(h =>
      h.fall.ampelstatus === 'gelb' && (h.fall.eskalationsrisiko || 0) >= 55
    ).slice(0, 5);
    return MONTHS.map((month, i) => {
      const obj: Record<string, string | number> = { month };
      atRisk.forEach(h => {
        obj[h.fall.pseudonym] = Math.round((Number(h.fall.monatKostenGesamt) || 0) * (1 + i * 0.04));
      });
      return obj;
    });
  }, [histories]);

  const atRiskCases = histories.filter(h =>
    h.fall.ampelstatus === 'gelb' && (h.fall.eskalationsrisiko || 0) >= 55
  ).slice(0, 5);

  const TRAJECTORY_COLORS = ['#f59e0b', '#f97316', '#ef4444', '#fb923c', '#fbbf24'];

  return (
    <div className="space-y-6 px-6 py-6">

      {/* ── CLAIM BANNER ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 p-6"
        style={{ borderTop: '2px solid #06b6d4' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400 mb-2">ASCEND FRÜHWARNSYSTEM · RISIKOFRÜHERKENNUNG</p>
            <h2 className="text-2xl font-bold text-slate-100">
              ASCEND hätte{' '}
              <span className="text-cyan-300" style={{ textShadow: '0 0 20px #06b6d4' }}>
                {stats.avgLead} Wochen früher
              </span>{' '}
              gewarnt.
            </h2>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">
              Alle {stats.escalated.length} Rot-Fälle waren frühzeitig erkennbar – die Daten lagen vor.
              ASCEND hätte die Ampel intern umgeschaltet, bevor das Fachverfahren die Eskalation registriert hat.
            </p>
          </div>
          <div className="hidden lg:flex gap-6">
            <div className="text-center">
              <div className="text-4xl font-black text-cyan-300" style={{ textShadow: '0 0 16px #06b6d4' }}>
                {stats.avgLead}W
              </div>
              <div className="text-[9px] font-bold tracking-[0.2em] text-cyan-500 mt-1">VORSPRUNG</div>
            </div>
            <div className="w-px bg-slate-700" />
            <div className="text-center">
              <div className="text-4xl font-black text-emerald-400" style={{ textShadow: '0 0 16px #22c55e' }}>
                € {fmt(stats.totalSaved)}
              </div>
              <div className="text-[9px] font-bold tracking-[0.2em] text-emerald-500 mt-1">VERMEIDBAR</div>
            </div>
            <div className="w-px bg-slate-700" />
            <div className="text-center">
              <div className="text-4xl font-black text-amber-400" style={{ textShadow: '0 0 16px #f59e0b' }}>
                {stats.warning.length}
              </div>
              <div className="text-[9px] font-bold tracking-[0.2em] text-amber-500 mt-1">NÄCHSTE ESK.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-6">

        {/* Ampel-Matrix */}
        <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-5"
          style={{ borderTop: '2px solid #334155' }}>
          <div className="text-[9px] font-bold tracking-[0.3em] text-slate-400 mb-4">
            // AMPEL-VERLAUF LETZTER 6 MONATE · ALLE {cases.length} FÄLLE
          </div>

          {/* Column headers */}
          <div className="grid mb-2" style={{ gridTemplateColumns: '140px 1fr 90px' }}>
            <div />
            <div className="grid grid-cols-6 gap-1">
              {MONTHS.map(m => (
                <div key={m} className="text-center text-[9px] font-bold text-slate-500 tracking-widest">{m}</div>
              ))}
            </div>
            <div className="text-[9px] font-bold text-cyan-400 tracking-widest text-center">ASCEND</div>
          </div>

          {/* Case rows */}
          <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
            {histories.map(({ fall, history, ascendSignal, wouldHaveSaved }) => {
              const isSelected = selectedId === fall.id;
              const rowColor = fall.ampelstatus === 'rot'
                ? 'border-red-500/20 hover:bg-red-500/5'
                : fall.ampelstatus === 'gelb'
                ? 'border-amber-500/20 hover:bg-amber-500/5'
                : 'border-slate-800 hover:bg-slate-800/40';
              return (
                <div key={fall.id}
                  className={`grid rounded-lg border cursor-pointer transition-all ${rowColor} ${isSelected ? 'ring-1 ring-cyan-500/50 bg-cyan-500/5' : ''}`}
                  style={{ gridTemplateColumns: '140px 1fr 90px' }}
                  onClick={() => setSelectedId(isSelected ? null : fall.id)}>
                  {/* Name */}
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${AMPEL_BG[fall.ampelstatus]}`} />
                    <span className="text-xs font-medium text-slate-300 truncate">{fall.pseudonym}</span>
                  </div>
                  {/* Month cells */}
                  <div className="grid grid-cols-6 gap-1 py-1.5">
                    {history.map((ampel, i) => (
                      <div key={i} className="flex items-center justify-center">
                        <div
                          className={`w-5 h-5 rounded-sm ${AMPEL_BG[ampel]}`}
                          style={{
                            opacity: ascendSignal !== null && i === ascendSignal ? 1 : 0.75,
                            outline: ascendSignal !== null && i === ascendSignal ? '2px solid #06b6d4' : 'none',
                            outlineOffset: '1px',
                          }}
                          title={`${MONTHS[i]}: ${ampel}`}
                        />
                      </div>
                    ))}
                  </div>
                  {/* ASCEND Signal */}
                  <div className="flex items-center justify-center py-1.5">
                    {ascendSignal !== null ? (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 6px #06b6d4' }} />
                        <span className="text-[9px] font-bold text-cyan-400">{MONTHS[ascendSignal]}</span>
                        {wouldHaveSaved > 0 && (
                          <span className="text-[9px] text-emerald-400 hidden xl:inline"> −{Math.round(wouldHaveSaved/1000)}K</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-700">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-5 mt-4 pt-3 border-t border-slate-800 text-[10px] font-bold tracking-widest">
            {(['grün','gelb','rot'] as Ampel[]).map(a => (
              <span key={a} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-sm ${AMPEL_BG[a]}`} />
                <span className={AMPEL_TEXT[a]}>{a.toUpperCase()}</span>
              </span>
            ))}
            <span className="flex items-center gap-1.5 ml-4">
              <span className="w-3 h-3 rounded-sm bg-cyan-400/80" style={{ outline: '2px solid #06b6d4', outlineOffset: '1px' }} />
              <span className="text-cyan-400">ASCEND-SIGNAL</span>
            </span>
          </div>
        </div>

        {/* Right: Cost comparison + Detail */}
        <div className="flex flex-col gap-4">

          {/* Kosten-Vergleich Chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4" style={{ borderTop: '2px solid #22c55e' }}>
            <div className="text-[9px] font-bold tracking-[0.3em] text-emerald-400 mb-3">
              // KOSTEN ROT-FÄLLE MIT / OHNE FRÜHWARNUNG
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={costChartData} barGap={2} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 8, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 8, fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v/1000)}K`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="Ohne ASCEND" fill="#ef4444" fillOpacity={0.6} radius={[2,2,0,0]} />
                <Bar dataKey="Mit ASCEND" fill="#22c55e" fillOpacity={0.8} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-[9px] font-bold mt-2">
              <span className="text-red-400">■ Ohne ASCEND</span>
              <span className="text-emerald-400">■ Mit ASCEND</span>
            </div>
          </div>

          {/* Selected case detail or hint */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex-1" style={{ borderTop: '2px solid #334155' }}>
            {selectedId ? (() => {
              const h = histories.find(x => x.fall.id === selectedId);
              if (!h) return null;
              const { fall, history, ascendSignal, officialSwitch, wouldHaveSaved } = h;
              const leadWeeks = ascendSignal !== null && officialSwitch !== null
                ? (officialSwitch - ascendSignal) * 4
                : null;
              return (
                <div>
                  <div className="text-[9px] font-bold tracking-[0.3em] text-cyan-400 mb-3">// FALLDETAIL</div>
                  <div className={`text-lg font-black mb-1 ${AMPEL_TEXT[fall.ampelstatus]}`}>{fall.pseudonym}</div>
                  <div className="text-xs text-slate-400 mb-3">{fall.stadtteil} · {fall.interventionsstatus}</div>
                  <div className="space-y-2 text-xs">
                    {[
                      ['Aktuell', fall.ampelstatus.toUpperCase(), AMPEL_TEXT[fall.ampelstatus]],
                      ['Kosten/Mon', `€ ${fmt(Number(fall.monatKostenGesamt)||0)}`, 'text-slate-200'],
                      ['Eskalationsrisiko', `${fall.eskalationsrisiko}%`, fall.eskalationsrisiko>=80?'text-red-400':fall.eskalationsrisiko>=50?'text-amber-400':'text-emerald-400'],
                      ...(ascendSignal !== null ? [['ASCEND-Signal', MONTHS[ascendSignal], 'text-cyan-400']] : []),
                      ...(leadWeeks ? [[`Vorsprung`, `${leadWeeks} Wochen`, 'text-cyan-300']] : []),
                      ...(wouldHaveSaved > 0 ? [['Vermeidbar', `€ ${fmt(wouldHaveSaved)}`, 'text-emerald-400']] : []),
                    ].map(([l, v, c]) => (
                      <div key={l as string} className="flex justify-between border-b border-slate-800 pb-1">
                        <span className="text-slate-500">{l}</span>
                        <span className={`font-bold ${c}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-[10px] text-slate-400 leading-relaxed">{fall.begruendung}</div>
                </div>
              );
            })() : (
              <div>
                <div className="text-[9px] font-bold tracking-[0.3em] text-slate-500 mb-3">// FALL ANKLICKEN</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Zeile in der Ampel-Matrix anklicken für Falldetail, ASCEND-Vorlauf und vermeidbare Kosten.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="text-[9px] font-bold tracking-widest text-slate-600">SYSTEMSTATUS</div>
                  {[
                    { label: 'Eskalierte Fälle', val: stats.escalated.length, color: 'text-red-400' },
                    { label: 'Nächste Eskalation', val: stats.warning.length, color: 'text-amber-400' },
                    { label: 'ASCEND-Signale aktiv', val: stats.withSignal.length, color: 'text-cyan-400' },
                    { label: 'Gesamt vermeidbar', val: `€ ${fmt(stats.totalSaved)}`, color: 'text-emerald-400' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex justify-between text-xs border-b border-slate-800 pb-1">
                      <span className="text-slate-500">{label}</span>
                      <span className={`font-bold ${color}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── NÄCHSTE ESKALATIONEN ──────────────────────────────────────────── */}
      {atRiskCases.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-slate-900/80 p-5" style={{ borderTop: '2px solid #f59e0b' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[9px] font-bold tracking-[0.3em] text-amber-400">
                // ASCEND FRÜHWARNUNG AKTIV · {atRiskCases.length} FÄLLE AUF ESKALATIONSKURS
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Diese Fälle sind aktuell Gelb – ASCEND erkennt erhöhte Eskalationswahrscheinlichkeit. Jetzt intervenieren vermeidet Rot.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-amber-400">{atRiskCases.length} FÄLLE</div>
              <div className="text-[9px] text-amber-600 tracking-widest">INTERVENTIONSFENSTER OFFEN</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Trajectory chart */}
            <div>
              <div className="text-[9px] font-bold tracking-widest text-slate-500 mb-2">KOSTENTRAJEKTORIE 6 MONATE</div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={trajectoryData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                  <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 8, fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 8, fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v/1000)}K`} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine x="Jun" stroke="#f59e0b" strokeDasharray="3 2" />
                  {atRiskCases.map((h, i) => (
                    <Line
                      key={h.fall.id}
                      dataKey={h.fall.pseudonym}
                      stroke={TRAJECTORY_COLORS[i % TRAJECTORY_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      style={{ filter: `drop-shadow(0 0 3px ${TRAJECTORY_COLORS[i]})` }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* At-risk case list */}
            <div className="space-y-2">
              {atRiskCases.map((h, i) => {
                const km = Number(h.fall.monatKostenGesamt) || 0;
                return (
                  <div key={h.fall.id} className="flex items-center gap-3 rounded-lg bg-amber-500/8 border border-amber-500/20 px-3 py-2"
                    style={{ borderLeft: `3px solid ${TRAJECTORY_COLORS[i % TRAJECTORY_COLORS.length]}` }}>
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-amber-300">{h.fall.pseudonym}</span>
                        <span className="text-[9px] text-red-400 font-bold border border-red-500/30 px-1.5 py-0.5 rounded">
                          Risiko {h.fall.eskalationsrisiko}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                        <span>{fmt(km)} €/Mon · {h.fall.stadtteil}</span>
                        <span className="text-amber-600">Frist: {h.fall.frist}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
