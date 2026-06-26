'use client';

import { useMemo, useState } from 'react';
import { konkreteHandlungsschritte, type Ampelstatus } from '../../lib/cases';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { CaseData } from '../../lib/cases';
import AscendCTA from './AscendCTA';

// ── Helpers ──────────────────────────────────────────────────────────────────

// Use the pre-computed monatKostenGesamt – avoids recomputing from kostenstellen
// which can produce NaN if localStorage data is stale or kostenstellen is malformed.
function getKosten(c: CaseData): number {
  return Number(c.monatKostenGesamt) || 0;
}

function fmt(n: number): string {
  return n.toLocaleString('de-DE');
}

// ── Half-Circle Gauge SVG ─────────────────────────────────────────────────────

function HalbkreisGauge({ score }: { score: number }) {
  const W = 260, H = 152, cx = 130, cy = 138, r = 108;
  const circ = 2 * Math.PI * r;
  const half = Math.PI * r;
  const fill = (score / 100) * half;
  const col = score >= 80 ? '#ef4444' : score >= 60 ? '#f59e0b' : '#22c55e';
  const glow = score >= 80 ? '#f87171' : score >= 60 ? '#fbbf24' : '#4ade80';
  const label = score >= 80 ? 'KRITISCH' : score >= 60 ? 'WARNUNG' : 'STABIL';
  const z60 = (60 / 100) * half;
  const z80 = (80 / 100) * half;

  const needleAngle = Math.PI + (score / 100) * Math.PI;
  const nx = cx + Math.cos(needleAngle) * (r - 6);
  const ny = cy + Math.sin(needleAngle) * (r - 6);

  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <filter id="gauge-glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* BG arc */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={22}
        strokeDasharray={`${half} ${circ}`} transform={`rotate(180 ${cx} ${cy})`} />
      {/* Green zone */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(34,197,94,0.22)" strokeWidth={22}
        strokeDasharray={`${z60} ${circ}`} transform={`rotate(180 ${cx} ${cy})`} />
      {/* Amber zone */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(245,158,11,0.22)" strokeWidth={22}
        strokeDasharray={`${z80 - z60} ${circ}`} strokeDashoffset={-z60}
        transform={`rotate(180 ${cx} ${cy})`} />
      {/* Red zone */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(239,68,68,0.22)" strokeWidth={22}
        strokeDasharray={`${half - z80} ${circ}`} strokeDashoffset={-z80}
        transform={`rotate(180 ${cx} ${cy})`} />
      {/* Score fill */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={22}
        strokeDasharray={`${fill} ${circ}`} transform={`rotate(180 ${cx} ${cy})`}
        strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${glow})` }} />
      {/* Tick labels */}
      {ticks.map(v => {
        const a = Math.PI + (v / 100) * Math.PI;
        const lx = cx + Math.cos(a) * (r + 16);
        const ly = cy + Math.sin(a) * (r + 16);
        return (
          <text key={v} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fill="#475569" fontSize={9} fontFamily="monospace">{v}</text>
        );
      })}
      {/* Center score */}
      <text x={cx} y={cy - 30} textAnchor="middle" fill={col} fontSize={52} fontWeight={800}
        fontFamily="monospace" style={{ filter: `drop-shadow(0 0 14px ${glow})` }}>{score}</text>
      <text x={cx} y={cy - 8} textAnchor="middle" fill={col} fontSize={11} fontWeight={700}
        fontFamily="monospace" letterSpacing={3}>{label}</text>
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={col} strokeWidth={3} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${glow})` }} />
      <circle cx={cx} cy={cy} r={6} fill={col} style={{ filter: `drop-shadow(0 0 10px ${glow})` }} />
    </svg>
  );
}

// ── Custom Chart Tooltip ──────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px', fontFamily: 'monospace', fontSize: 11 }}>
      <div style={{ color: '#64748b', marginBottom: 6, letterSpacing: 2 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 3 }}>
          {p.name}: <strong>€ {fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  cases: CaseData[];
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LeitungJugendamt({ cases }: Props) {
  const [ampelFilter, setAmpelFilter] = useState<Ampelstatus | null>(null);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  // ── Derived KPIs from real cases ──────────────────────────────────────────
  const stats = useMemo(() => {
    const totalMonthly = cases.reduce((s, c) => s + getKosten(c), 0);
    const rot = cases.filter(c => c.ampelstatus === 'rot');
    const gelb = cases.filter(c => c.ampelstatus === 'gelb');
    const gruen = cases.filter(c => c.ampelstatus === 'grün');

    const avgRisk = cases.length
      ? Math.round(cases.reduce((s, c) => s + (c.eskalationsrisiko || 0), 0) / cases.length)
      : 0;

    // Risk index: weighted avg (rot cases count double)
    const weightedRisk = Math.min(99, Math.round(
      rot.length / cases.length * 100 * 0.55 +
      gelb.length / cases.length * 100 * 0.28 +
      avgRisk * 0.17
    ));

    const hocheEskalation = cases.filter(c => (c.eskalationsrisiko || 0) > 60).length;
    const jahresPotenzial = Math.round(cases.reduce((s, c) => s + (c.erwarteteKostensenkung || 0), 0) * 12);

    // Top 3 by eskalationsrisiko
    const top3 = [...cases]
      .sort((a, b) => (b.eskalationsrisiko || 0) - (a.eskalationsrisiko || 0))
      .slice(0, 3);

    // Stadtteile verteilung
    const srMap: Record<string, { n: number; km: number }> = {};
    cases.forEach(c => {
      if (!srMap[c.stadtteil]) srMap[c.stadtteil] = { n: 0, km: 0 };
      srMap[c.stadtteil].n++;
      srMap[c.stadtteil].km += getKosten(c);
    });
    const sozialraum = Object.entries(srMap).sort((a, b) => b[1].km - a[1].km);

    return {
      totalMonthly,
      rot,
      gelb,
      gruen,
      avgRisk,
      weightedRisk,
      hocheEskalation,
      jahresPotenzial,
      top3,
      sozialraum,
    };
  }, [cases]);

  // ── Chart data: 12 hist + 7 projected ────────────────────────────────────
  const chartData = useMemo(() => {
    const base = stats.totalMonthly;
    const months = ['Jul','Aug','Sep','Okt','Nov','Dez','Jan','Feb','Mär','Apr','Mai','Jun',
                    'Jul+','Aug+','Sep+','Okt+','Nov+','Dez+','Jan+'];
    // Historical: ramp up to current
    const histRatio = [0.745, 0.778, 0.807, 0.821, 0.854, 0.879, 0.908, 0.931, 0.950, 0.974, 0.988, 1.0];
    // Projections from current month onward
    const woProjRatio = [1.0, 1.020, 1.053, 1.098, 1.142, 1.196, 1.258];
    const wiProjRatio = [1.0, 0.980, 0.951, 0.912, 0.878, 0.843, 0.815];

    return months.map((m, i): Record<string, string | number> => {
      const label = m.replace('+', '');
      if (i < 12) {
        return { month: label, Historisch: Math.round(base * histRatio[i]) };
      }
      const pi = i - 11;
      return {
        month: label,
        'Ohne ASCEND': Math.round(base * woProjRatio[pi]),
        'Mit ASCEND': Math.round(base * wiProjRatio[pi]),
      };
    });
  }, [stats.totalMonthly]);

  const risikoColor = stats.weightedRisk >= 80 ? 'text-red-400' : stats.weightedRisk >= 60 ? 'text-amber-400' : 'text-emerald-400';
  const risikoGlow = stats.weightedRisk >= 80 ? '#ef4444' : stats.weightedRisk >= 60 ? '#f59e0b' : '#22c55e';
  const lage = stats.rot.length >= 5 ? 'KRITISCH' : stats.rot.length >= 3 ? 'WARNUNG' : 'ERHÖHT';
  const lageColor = stats.rot.length >= 5 ? 'text-red-400' : 'text-amber-400';
  const lageBorder = stats.rot.length >= 5 ? 'border-red-500/40' : 'border-amber-500/40';
  const lageBg = stats.rot.length >= 5 ? 'bg-red-500/10' : 'bg-amber-500/10';

  return (
    <div className="space-y-0">

      {/* ── LAGE BANNER ─────────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-4 px-6 py-3 ${lageBg} border-b ${lageBorder} text-sm font-bold tracking-[0.2em] uppercase`}>
        <span className={`${lageColor} animate-pulse text-base`}>▮</span>
        <span className={lageColor}>SYSTEMLAGE: {lage}</span>
        <span className="text-slate-600">·</span>
        <span className="text-amber-400">{stats.rot.length} FÄLLE ROT · {stats.gelb.length} FÄLLE GELB</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-400">{stats.hocheEskalation} FÄLLE ESKALATIONSRISIKO &gt;60%</span>
        <div className="ml-auto">
          <span className={`text-xs px-3 py-1 rounded border ${lageBorder} ${lageColor}`}>
            ASCEND-POTENZIAL: € {fmt(stats.jahresPotenzial)} /J.
          </span>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* ── KPI ROW ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-4">
          {/* Budget */}
          <div className="rounded-2xl border border-blue-500/20 bg-slate-900/80 p-5 relative overflow-hidden" style={{ borderTop: '3px solid #3b82f6' }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full" style={{ background: 'radial-gradient(circle at top right, rgba(59,130,246,0.15), transparent)' }} />
            <div className="text-4xl font-black tabular-nums text-blue-300" style={{ textShadow: '0 0 20px #2563eb' }}>
              {fmt(Math.round(stats.totalMonthly / 1000))}K
            </div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-blue-400 mt-2">€ / MONAT · HZE-BUDGET</div>
            <div className="text-xs text-slate-500 mt-1">{cases.length} Fälle · aktiver Bestand</div>
          </div>

          {/* ROT Fälle */}
          <div className="rounded-2xl border border-red-500/30 bg-slate-900/80 p-5 relative overflow-hidden" style={{ borderTop: '3px solid #ef4444' }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full" style={{ background: 'radial-gradient(circle at top right, rgba(239,68,68,0.18), transparent)' }} />
            <div className="text-4xl font-black text-red-400 animate-pulse" style={{ textShadow: '0 0 22px #ef4444' }}>
              {stats.rot.length}
            </div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-red-400 mt-2">FÄLLE ROT · SOFORT</div>
            <div className="text-xs text-slate-500 mt-1">Ø {fmt(Math.round(stats.rot.reduce((s,c)=>s+getKosten(c),0)/(stats.rot.length||1)))} €/Mon</div>
          </div>

          {/* Eskalation */}
          <div className="rounded-2xl border border-orange-500/20 bg-slate-900/80 p-5 relative overflow-hidden" style={{ borderTop: '3px solid #f97316' }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full" style={{ background: 'radial-gradient(circle at top right, rgba(249,115,22,0.15), transparent)' }} />
            <div className="text-4xl font-black text-orange-400" style={{ textShadow: '0 0 18px #f97316' }}>
              {stats.hocheEskalation}
            </div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-orange-400 mt-2">ESKALATIONSRISIKO &gt;60%</div>
            <div className="text-xs text-slate-500 mt-1">Prognose 12 Monate</div>
          </div>

          {/* Risiko-Index */}
          <div className="rounded-2xl border border-amber-500/20 bg-slate-900/80 p-5 relative overflow-hidden" style={{ borderTop: '3px solid #f59e0b' }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full" style={{ background: 'radial-gradient(circle at top right, rgba(245,158,11,0.15), transparent)' }} />
            <div className={`text-4xl font-black tabular-nums ${risikoColor}`} style={{ textShadow: `0 0 18px ${risikoGlow}` }}>
              {stats.weightedRisk}
            </div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-amber-400 mt-2">SYSTEM-RISIKO-INDEX</div>
            <div className="text-xs text-slate-500 mt-1">0 = optimal · 100 = kritisch</div>
          </div>

          {/* ASCEND Potenzial */}
          <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/80 p-5 relative overflow-hidden" style={{ borderTop: '3px solid #22c55e' }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full" style={{ background: 'radial-gradient(circle at top right, rgba(34,197,94,0.15), transparent)' }} />
            <div className="text-4xl font-black tabular-nums text-emerald-400" style={{ textShadow: '0 0 18px #22c55e' }}>
              {fmt(Math.round(stats.jahresPotenzial / 1000))}K
            </div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 mt-2">€/J. · ASCEND-POTENZIAL</div>
            <div className="text-xs text-slate-500 mt-1">sofort aktivierbar</div>
          </div>
        </div>

        {/* ── MAIN GRID: CHART + GAUGE + TOP 3 ─────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Kostenverlauf Chart */}
          <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-5" style={{ borderTop: '2px solid #3b82f6' }}>
            <div className="text-[9px] font-bold tracking-[0.3em] text-blue-400 mb-4">
              // KOSTENVERLAUF & ASCEND-PROJEKTION · {cases.length} FÄLLE
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'monospace' }} tickLine={false} axisLine={{ stroke: '#334155' }} />
                <YAxis tick={{ fill: '#475569', fontSize: 9, fontFamily: 'monospace' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => `${Math.round(v/1000)}K`} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine x="Jun" stroke="#f59e0b" strokeDasharray="4 3" label={{ value: 'HEUTE', fill: '#f59e0b', fontSize: 9, fontFamily: 'monospace' }} />
                <Area dataKey="Historisch" stroke="#3b82f6" fill="rgba(59,130,246,0.08)"
                  strokeWidth={2} dot={false} connectNulls={false} />
                <Line dataKey="Ohne ASCEND" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3"
                  dot={false} connectNulls={false} style={{ filter: 'drop-shadow(0 0 4px #f87171)' }} />
                <Line dataKey="Mit ASCEND" stroke="#22c55e" strokeWidth={2.5}
                  dot={false} connectNulls={false} style={{ filter: 'drop-shadow(0 0 6px #4ade80)' }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex gap-6 mt-3 text-[9px] font-bold tracking-[0.15em]">
              <span className="flex items-center gap-2 text-blue-400">
                <span className="block w-6 h-0.5 bg-blue-500" />HISTORISCH
              </span>
              <span className="flex items-center gap-2 text-red-400">
                <span className="block w-6 h-0.5 bg-red-500 opacity-70" style={{ borderTop: '2px dashed #ef4444', background: 'transparent' }} />OHNE ASCEND
              </span>
              <span className="flex items-center gap-2 text-emerald-400">
                <span className="block w-6 h-0.5 bg-emerald-500" />MIT ASCEND
              </span>
            </div>
          </div>

          {/* Gauge + Top 3 */}
          <div className="flex flex-col gap-4">

            {/* Gauge */}
            <div className="rounded-2xl border border-amber-500/20 bg-slate-900/80 p-4 text-center" style={{ borderTop: '2px solid #f59e0b' }}>
              <div className="text-[9px] font-bold tracking-[0.3em] text-amber-400 mb-2 text-left">
                // SYSTEM-RISIKO-INDEX
              </div>
              <div className="flex justify-center">
                <HalbkreisGauge score={stats.weightedRisk} />
              </div>
              <div className="text-[9px] text-slate-500 tracking-widest -mt-1">0 = OPTIMAL · 100 = KRITISCH</div>
            </div>
          </div>
        </div>

        {/* ── TOP 3 SOFORTMASSNAHMEN + SOZIALRAUM + SZENARIEN ──────────────── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Top 3 Sofortmaßnahmen */}
          <div className="rounded-2xl border border-red-500/25 bg-slate-900/80 p-5" style={{ borderTop: '2px solid #ef4444' }}>
            <div className="text-[9px] font-bold tracking-[0.3em] text-red-400 mb-4">
              // SOFORTMASSNAHMEN · TOP {stats.top3.length}
            </div>
            <div className="space-y-3">
              {stats.top3.map((c, i) => {
                const km = getKosten(c);
                const colDot = c.ampelstatus === 'rot' ? 'bg-red-500' : 'bg-amber-500';
                const colText = c.ampelstatus === 'rot' ? 'text-red-400' : 'text-amber-400';
                const border = c.ampelstatus === 'rot' ? 'border-red-500/30' : 'border-amber-500/30';
                const bg = c.ampelstatus === 'rot' ? 'bg-red-500/8' : 'bg-amber-500/8';
                return (
                  <div key={c.id} className={`rounded-lg border ${border} ${bg} p-3`}
                    style={{ borderLeft: `3px solid ${c.ampelstatus === 'rot' ? '#ef4444' : '#f59e0b'}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-black text-sm ${colText} tracking-wider`}>
                        #{i + 1} · {c.pseudonym}
                      </span>
                      <span className={`text-[9px] font-bold ${colDot === 'bg-red-500' ? 'text-red-400' : 'text-amber-400'} border ${border} px-2 py-0.5 rounded`}>
                        {c.ampelstatus.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mb-1.5 leading-snug">{c.massnahmenvorschlag}</div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{fmt(km)} €/Mon</span>
                      <span>Risiko {c.eskalationsrisiko}%</span>
                      <span>Frist: {c.frist}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sozialraum */}
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-5" style={{ borderTop: '2px solid #06b6d4' }}>
            <div className="text-[9px] font-bold tracking-[0.3em] text-cyan-400 mb-4">
              // SOZIALRAUM-BELASTUNG
            </div>
            <div className="space-y-3">
              {stats.sozialraum.map(([sr, d]) => {
                const pct = Math.round(d.km / stats.totalMonthly * 100);
                const barColor = pct >= 30 ? '#ef4444' : pct >= 20 ? '#f97316' : '#3b82f6';
                return (
                  <div key={sr}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-200 font-semibold">{sr}</span>
                      <span className="text-slate-500 tabular-nums">{d.n}F · {fmt(d.km)} €/Mon · {pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 6px ${barColor}` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ampel-Verteilung */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <div className="text-[9px] font-bold tracking-[0.3em] text-blue-400 mb-3">
                // AMPELVERTEILUNG · <span className="text-slate-500 normal-case tracking-normal font-normal">Filter anklicken</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {([
                  { status: 'rot' as Ampelstatus, label: 'ROT', count: stats.rot.length, color: '#ef4444' },
                  { status: 'gelb' as Ampelstatus, label: 'GELB', count: stats.gelb.length, color: '#f59e0b' },
                  { status: 'grün' as Ampelstatus, label: 'GRÜN', count: stats.gruen.length, color: '#22c55e' },
                ]).map(({ status, label, count, color }) => {
                  const active = ampelFilter === status;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => { setAmpelFilter(active ? null : status); setSelectedCase(null); }}
                      className="rounded-lg bg-slate-800/60 p-2 transition-all hover:bg-slate-700/60"
                      style={active ? { outline: `2px solid ${color}`, outlineOffset: '2px', background: `${color}18` } : {}}
                    >
                      <div className="text-2xl font-black" style={{ color, textShadow: `0 0 12px ${color}` }}>{count}</div>
                      <div className="text-[9px] font-bold tracking-widest mt-0.5" style={{ color }}>{label}</div>
                      {active && <div className="text-[8px] text-slate-400 mt-0.5">✕ Filter</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Szenarien */}
          <div className="flex flex-col gap-3">
            {/* Ohne ASCEND */}
            <div className="rounded-2xl border border-red-500/30 bg-slate-900/80 p-4 flex-1 text-center" style={{ borderTop: '3px solid #ef4444' }}>
              <div className="text-[8px] font-black tracking-[0.25em] text-red-400 mb-2">SZENARIO A · OHNE ASCEND</div>
              <div className="text-3xl font-black text-red-400 tabular-nums" style={{ textShadow: '0 0 18px #ef4444' }}>
                +{fmt(Math.round(stats.totalMonthly * 0.33))} €
              </div>
              <div className="text-[9px] font-bold tracking-widest text-red-400 mt-1">MEHRKOSTEN IN 12M</div>
              <div className="text-[10px] text-slate-500 mt-2 leading-snug">
                Unkontrolliertes Wachstum · {stats.rot.length} Rot-Fälle ohne Steuerung · Politisches Risiko steigt
              </div>
              <div className="mt-3 text-[9px] px-3 py-1 rounded border border-red-500/40 text-red-400 inline-block font-bold tracking-widest">
                STATUS QUO · INAKZEPTABEL
              </div>
            </div>

            {/* Mit ASCEND Komplett */}
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-4 flex-1 text-center" style={{ borderTop: '3px solid #22c55e' }}>
              <div className="text-[8px] font-black tracking-[0.25em] text-emerald-400 mb-2">SZENARIO B · MIT ASCEND</div>
              <div className="text-3xl font-black text-emerald-400 tabular-nums" style={{ textShadow: '0 0 18px #22c55e' }}>
                −{fmt(Math.round(stats.jahresPotenzial))} €
              </div>
              <div className="text-[9px] font-bold tracking-widest text-emerald-400 mt-1">EINSPARUNG JAHR 1</div>
              <div className="text-[10px] text-slate-500 mt-2 leading-snug">
                Vollständige Fallsteuerung · Alle {cases.length} Fälle optimiert · 10 €/Fall/Mon · ROI in 3–5 Wochen
              </div>
              <div className="mt-3 text-[9px] px-3 py-1 rounded border border-emerald-500/40 text-emerald-400 inline-block font-bold tracking-widest">
                EMPFOHLEN · MAXIMALER ROI
              </div>
            </div>
          </div>
        </div>

        {/* ── ALLE FÄLLE KOMPAKTÜBERSICHT ───────────────────────────────────── */}
        {(() => {
          const visible = [...cases]
            .filter(c => !ampelFilter || c.ampelstatus === ampelFilter)
            .sort((a, b) => (b.eskalationsrisiko || 0) - (a.eskalationsrisiko || 0));
          const activeCase = selectedCase ? cases.find(c => c.id === selectedCase) ?? null : null;

          return (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5" style={{ borderTop: '2px solid #334155' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[9px] font-bold tracking-[0.3em] text-slate-400">
                  // {ampelFilter
                    ? `${visible.length} FÄLLE · ${ampelFilter.toUpperCase()} · GEFILTERT`
                    : `ALLE ${cases.length} FÄLLE · GESAMTÜBERSICHT`}
                </div>
                {ampelFilter && (
                  <button
                    type="button"
                    onClick={() => { setAmpelFilter(null); setSelectedCase(null); }}
                    className="text-[9px] text-slate-500 hover:text-slate-300 border border-slate-700 rounded px-2 py-0.5 transition-colors"
                  >
                    ✕ Filter aufheben
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-x-8 gap-y-0">
                {visible.map(c => {
                  const km = getKosten(c);
                  const dotColor = c.ampelstatus === 'rot' ? '#ef4444' : c.ampelstatus === 'gelb' ? '#f59e0b' : '#22c55e';
                  const textColor = c.ampelstatus === 'rot' ? 'text-red-400' : c.ampelstatus === 'gelb' ? 'text-amber-300' : 'text-emerald-400';
                  const isSelected = selectedCase === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCase(isSelected ? null : c.id)}
                      className="flex items-center gap-2 py-1.5 border-b border-slate-800/60 text-left w-full hover:bg-slate-800/40 rounded px-1 transition-colors"
                      style={isSelected ? { background: `${dotColor}12`, borderBottom: `1px solid ${dotColor}40` } : {}}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor, boxShadow: `0 0 5px ${dotColor}` }} />
                      <span className={`font-mono text-xs font-semibold ${textColor} w-20 flex-shrink-0`}>{c.pseudonym}</span>
                      <span className="text-slate-500 text-[10px] tabular-nums flex-shrink-0">{fmt(km)} €/M</span>
                      <div className="flex-1 h-1 rounded-full bg-slate-800 min-w-0">
                        <div className="h-full rounded-full" style={{ width: `${c.eskalationsrisiko}%`, background: dotColor, opacity: 0.7 }} />
                      </div>
                      <span className="text-slate-600 text-[10px] tabular-nums flex-shrink-0">{c.eskalationsrisiko}%</span>
                    </button>
                  );
                })}
              </div>

              {/* Detail-Panel für ausgewählten Fall */}
              {activeCase && (() => {
                const dotColor = activeCase.ampelstatus === 'rot' ? '#ef4444' : activeCase.ampelstatus === 'gelb' ? '#f59e0b' : '#22c55e';
                const textColor = activeCase.ampelstatus === 'rot' ? 'text-red-400' : activeCase.ampelstatus === 'gelb' ? 'text-amber-300' : 'text-emerald-400';
                return (
                  <div className="mt-4 rounded-xl border p-4 space-y-3" style={{ borderColor: `${dotColor}40`, background: `${dotColor}08` }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} />
                        <span className={`font-mono font-black text-sm ${textColor}`}>{activeCase.pseudonym}</span>
                        <span className="text-slate-500 text-xs">{activeCase.interventionsstatus}</span>
                        <span className="text-slate-600 text-xs">·</span>
                        <span className="text-slate-400 text-xs">{activeCase.stadtteil}</span>
                      </div>
                      <button type="button" onClick={() => setSelectedCase(null)} className="text-slate-600 hover:text-slate-300 text-xs flex-shrink-0">✕</button>
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed">
                      <span className="text-slate-500">Maßnahme: </span>{activeCase.massnahmenvorschlag}
                    </div>
                    <div className="rounded-lg border border-cyan-500/30 bg-slate-900/60 p-3">
                      <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-cyan-300">Konkrete Handlungsschritte — jetzt</div>
                      <ol className="space-y-1.5">
                        {konkreteHandlungsschritte(activeCase).map((s, i) => (
                          <li key={i} className="flex gap-2 text-[11px] leading-snug text-slate-200">
                            <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-cyan-500/20 text-[9px] font-bold text-cyan-300">{i + 1}</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                      {[
                        { label: 'Kosten/Mon', value: `€ ${fmt(getKosten(activeCase))}` },
                        { label: 'Eskalationsrisiko', value: `${activeCase.eskalationsrisiko} %` },
                        { label: 'Frist', value: activeCase.frist },
                        { label: 'Nächste Prüfung', value: activeCase.naechsterPrueftermin },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-slate-800/60 px-3 py-2">
                          <div className="text-slate-500 mb-0.5">{label}</div>
                          <div className="text-slate-200 font-semibold">{value}</div>
                        </div>
                      ))}
                    </div>
                    {activeCase.naechsteMassnahme && (
                      <div className="text-[10px] text-slate-400">
                        <span className="text-slate-600">Nächste Maßnahme: </span>{activeCase.naechsteMassnahme}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

      </div>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <AscendCTA context="leitung" />

    </div>
  );
}
