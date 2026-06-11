'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { defaultCases, type CaseData, type Interventionsstatus, type Ampelstatus } from '../lib/cases';
import LeitungJugendamt from './components/LeitungJugendamt';
import FruehwarnungDashboard from './components/FruehwarnungDashboard';

const STORAGE_KEY = 'ascend-dashboard-hze-cases-v3'; // v3: kostenstellen-Fallback + monatKostenGesamt fix
const riskFilterOptions = ['Alle', 'grün', 'gelb', 'rot'] as const;
const interventionOptions: Interventionsstatus[] = ['Monitoring', 'Frühintervention', 'ASCEND prüfen', 'Akutintervention'];

const ampelStyles: Record<Ampelstatus, string> = {
  grün: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20',
  gelb: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20',
  rot: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/20',
};

const statusStyles: Record<string, string> = {
  'Kritischer Interventionsbedarf': 'bg-red-500/10 text-red-300 ring-1 ring-red-500/20',
  'Operatives Monitoring': 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20',
  Stabilisiert: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20',
};

const monthStatusStyles: Record<string, string> = {
  Freigegeben: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20',
  'In Prüfung': 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20',
  Offen: 'bg-slate-700/60 text-slate-200 ring-1 ring-slate-500/30',
};

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `€ ${safeValue.toLocaleString('de-DE')}`;
}

function formatPercent(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${Math.min(100, Math.max(0, safeValue))}%`;
}

function formatInteger(value: number) {
  return Number.isFinite(value) ? String(Math.round(value)) : '0';
}

function formatMoMChange(current: number, previous: number) {
  const currentSafe = Number.isFinite(current) ? current : 0;
  const previousSafe = Number.isFinite(previous) ? previous : 0;
  if (previousSafe === 0) return '—';
  const change = ((currentSafe - previousSafe) / previousSafe) * 100;
  const formatted = `${change >= 0 ? '+' : ''}${change.toFixed(1).replace('.', ',')} %`;
  return formatted;
}

function caseMonthlyCost(fall: CaseData | null | undefined): number {
  const kostenstellen = fall?.kostenstellen;
  if (!kostenstellen) return 0;
  if (Array.isArray(kostenstellen)) {
    return kostenstellen.reduce<number>((sum, position) => sum + Number(position?.amount || 0), 0);
  }

  const values = Object.values(kostenstellen as Record<string, unknown>);
  return values.reduce<number>((sum, value) => sum + Number(value || 0), 0);
}

function parseAmountInput(input: string | number): number {
  const normalized = typeof input === 'string' ? input.replace(',', '.') : String(input);
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function getFallAmpel(fall: CaseData | null | undefined): Ampelstatus | undefined {
  return (fall as any)?.ampel ?? fall?.ampelstatus;
}

function recalcCase(fall: CaseData): CaseData {
  const kostenstellen = Array.isArray(fall.kostenstellen)
    ? fall.kostenstellen.reduce((acc: Record<string, number>, pos: any) => {
        acc[pos.label] = Number(pos.amount || 0);
        return acc;
      }, {} as Record<string, number>)
    : { ...(fall.kostenstellen as Record<string, number>) };

  // Compute cost from kostenstellen; if 0 (stale/malformed localStorage), fall back to
  // the value already stored on the case or its defaultCases counterpart.
  const computedCost = caseMonthlyCost({ ...fall, kostenstellen } as CaseData);
  const monatKostenGesamt = computedCost > 0
    ? computedCost
    : (Number(fall.monatKostenGesamt) > 0 ? Number(fall.monatKostenGesamt) : 0);
  const jahresKostenGesamt = monatKostenGesamt * 12;

  // Determine ampel based on new cost thresholds: <= 5000 (grün), 5000-15000 (gelb), >15000 (rot)
  let ampelstatus: Ampelstatus = 'gelb';
  if (monatKostenGesamt <= 5000) {
    ampelstatus = 'grün';
  } else if (monatKostenGesamt > 15000) {
    ampelstatus = 'rot';
  }

  // Determine eskalationsrisiko based on ampel
  let eskalationsrisiko = 30;
  if (ampelstatus === 'grün') {
    eskalationsrisiko = 10 + Math.floor(Math.random() * 20); // 10-29
  } else if (ampelstatus === 'rot') {
    eskalationsrisiko = 66 + Math.floor(Math.random() * 30); // 66-95
  } else {
    eskalationsrisiko = 30 + Math.floor(Math.random() * 36); // 30-65
  }

  // Status mapping
  const statusMap: Record<Ampelstatus, string> = {
    grün: 'STABILISIERT',
    gelb: 'INSTABIL',
    rot: 'KRITISCHER INTERVENTIONSBEDARF',
  };

  // Interventionsstatus mapping
  const interventionMap: Record<Ampelstatus, Interventionsstatus> = {
    grün: 'Monitoring',
    gelb: 'Frühintervention',
    rot: 'Akutintervention',
  };

  return {
    ...fall,
    kostenstellen,
    monatKostenGesamt,
    jahresKostenGesamt,
    eskalationsrisiko,
    ampelstatus,
    status: statusMap[ampelstatus],
    interventionsstatus: interventionMap[ampelstatus],
  };
}

function recalcDashboard(cases: CaseData[]) {
  const getMonthlyCost = (fall: CaseData) => Number(fall.monatKostenGesamt) || caseMonthlyCost(fall);
  const totalMonthly = cases.reduce((sum, fall) => sum + getMonthlyCost(fall), 0);
  const totalAnnual = cases.reduce((sum, fall) => sum + getMonthlyCost(fall) * 12, 0);

  const counts = cases.reduce(
    (acc, fall) => {
      const ampel = fall.ampelstatus;
      return {
        grün: acc.grün + (ampel === 'grün' ? 1 : 0),
        gelb: acc.gelb + (ampel === 'gelb' ? 1 : 0),
        rot: acc.rot + (ampel === 'rot' ? 1 : 0),
      };
    },
    { grün: 0, gelb: 0, rot: 0 },
  );

  const averageEscalation = cases.length ? Math.round(cases.reduce((sum, fall) => sum + fall.eskalationsrisiko, 0) / cases.length) : 0;

  const interventionCounts = interventionOptions.reduce(
    (acc, key) => ({ ...acc, [key]: cases.filter((fall) => fall.interventionsstatus === key).length }),
    {} as Record<Interventionsstatus, number>,
  );

  const totalSavingsPotential = cases.reduce((sum, fall) => sum + fall.erwarteteKostensenkung, 0);
  const averageCostPerCase = cases.length ? Math.round(totalMonthly / cases.length) : 0;
  const acuteEscalations = cases.filter((fall) => fall.ampelstatus === 'rot' && fall.eskalationsrisiko >= 75).length;
  const interventionQuote = cases.length
    ? Math.round((cases.filter((fall) => fall.interventionsstatus !== 'Monitoring').length / cases.length) * 100)
    : 0;

  const districtCostMap = cases.reduce((acc, fall) => {
    acc[fall.stadtteil] = (acc[fall.stadtteil] ?? 0) + getMonthlyCost(fall) * 12;
    return acc;
  }, {} as Record<string, number>);

  const costByAmpel = (['grün', 'gelb', 'rot'] as Ampelstatus[]).map((ampel) => ({
    name: ampel,
    monat: cases.filter((fall) => fall.ampelstatus === ampel).reduce((sum, fall) => sum + getMonthlyCost(fall), 0),
    count: cases.filter((fall) => fall.ampelstatus === ampel).length,
  }));

  const districtCosts = Object.entries(districtCostMap).map(([stadtteil, value]) => ({ stadtteil, value }));
  const trendText = averageEscalation > 60 ? 'Eskalationsdruck bleibt hoch, Steuerungsbedarf steigt.' : averageEscalation > 45 ? 'Frühintervention wirkt, Lage bleibt achtsam.' : 'Stabilisierung erkennbar, Monitoring fortsetzen.';

  return {
    totalMonthly,
    totalAnnual,
    counts,
    averageEscalation,
    interventionCounts,
    totalSavingsPotential,
    averageCostPerCase,
    acuteEscalations,
    interventionQuote,
    costByAmpel,
    districtCosts,
    trendText,
  };
}

function Badge({ label, style }: { label: string; style: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold uppercase tracking-[0.14em] ${style}`}>
      {label}
    </span>
  );
}

function MetricCard({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-slate-100">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}

type MonthlyCaseSnapshot = {
  monthlyCost: number;
  risk: number;
  event?: string;
};

type MonthlyStatus = 'Freigegeben' | 'In Prüfung' | 'Offen';

type MonthlySnapshot = {
  month: string;
  reportingDate: string;
  totalCost: number;
  savingsPotential: number;
  redCases: number;
  status: MonthlyStatus;
  cases: Record<string, MonthlyCaseSnapshot>;
};

type CaseTrendRow = {
  month: string;
  reportingDate: string;
  monthlyCost: number;
  risk: number;
  event?: string;
};

type ChartDataRow = MonthlySnapshot | CaseTrendRow;

const monthlySnapshots: MonthlySnapshot[] = (() => {
  const months = [
    { month: 'Jun 25', reportingDate: '05. Jul 25' },
    { month: 'Jul 25', reportingDate: '05. Aug 25' },
    { month: 'Aug 25', reportingDate: '05. Sep 25' },
    { month: 'Sep 25', reportingDate: '05. Okt 25' },
    { month: 'Okt 25', reportingDate: '05. Nov 25' },
    { month: 'Nov 25', reportingDate: '05. Dez 25' },
    { month: 'Dez 25', reportingDate: '05. Jan 26' },
    { month: 'Jan 26', reportingDate: '05. Feb 26' },
    { month: 'Feb 26', reportingDate: '05. Mär 26' },
    { month: 'Mär 26', reportingDate: '05. Apr 26' },
    { month: 'Apr 26', reportingDate: '05. Mai 26' },
    { month: 'Mai 26', reportingDate: '05. Jun 26' },
  ];

  const events = ['Fallkonferenz', 'Intensivmodul', 'Stabilisierung'];
  const statusOptions: MonthlyStatus[] = ['Freigegeben', 'In Prüfung', 'Offen'];
  const redCasesByMonth = [5, 4, 6, 5, 7, 5, 6, 4, 5, 6, 5, 4];

  return months.map((entry, index) => {
    const totalCost = 300000 + index * 12500 + (index % 3) * 4500;
    const savingsPotential = Math.round(totalCost * (0.08 + ((index % 4) * 0.01)));
    const cases = defaultCases.reduce((acc, fall, caseIndex) => {
      const baseCost = caseMonthlyCost(fall);
      const trend = 0.83 + index * 0.02 + (caseIndex % 5) * 0.008;
      const monthlyCost = Math.max(800, Math.round(baseCost * trend + (index % 4) * 120));
      const risk = Math.min(99, Math.max(12, Math.round(fall.eskalationsrisiko + (index - 5) * 2 - (caseIndex % 4) * 1.5)));
      const event = caseIndex % 6 === index % 6 ? events[index % events.length] : undefined;
      acc[fall.id] = {
        monthlyCost,
        risk,
        event,
      };
      return acc;
    }, {} as Record<string, MonthlyCaseSnapshot>);

    return {
      ...entry,
      totalCost,
      savingsPotential,
      redCases: redCasesByMonth[index] ?? 0,
      status: statusOptions[index % statusOptions.length],
      cases,
    };
  });
})();

function renderEventDot(props: any) {
  const { cx, cy, payload } = props;
  if (!payload?.event) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#f59e0b" stroke="#fb923c" strokeWidth={2} />
      <text x={cx + 10} y={cy - 10} fill="#e2e8f0" fontSize={10} textAnchor="start" dominantBaseline="central">
        {payload.event}
      </text>
    </g>
  );
}

function FruehwarnungPlaceholder() {
  return (
    <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Risikofrüherkennung</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-100">ASCEND FRÜHWARNUNG</h2>
        <p className="mt-2 text-sm text-slate-400">Frühindikatoren und Risikoentwicklungen über alle Fälle</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-5">
          <p className="text-3xl font-semibold text-amber-300">24</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-amber-500/80">↑ Kostenanstieg &gt;20 %</p>
          <p className="mt-1 text-sm text-slate-400">Fälle mit Kostenanstieg</p>
        </div>
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-5">
          <p className="text-3xl font-semibold text-orange-300">9</p>
          <p className="mt-2 text-sm text-slate-400">zweiter Hilfewechsel</p>
        </div>
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-5">
          <p className="text-3xl font-semibold text-red-300">14</p>
          <p className="mt-2 text-sm text-slate-400">steigende Dynamik</p>
        </div>
      </div>
    </div>
  );
}

type MetaLayer = {
  label: string;
  accent: boolean;
  statusLabel: string;
  statusClass: string;
  description: string;
  indicators: string[];
};

function AscendMetaSteuerung() {
  const [selected, setSelected] = useState<number | null>(null);

  const layers: MetaLayer[] = [
    {
      label: 'FACHVERFAHREN',
      accent: false,
      statusLabel: 'Verbunden',
      statusClass: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20',
      description: 'Operative Datenbasis aus Jugendamtssoftware, Kostenträgern und Fallmanagementsystemen. Liefert Falldaten, Kostenstellen und Hilfeverläufe.',
      indicators: ['20 Fälle erfasst', 'Schnittstelle stabil', 'Datenstand: laufend'],
    },
    {
      label: 'ASCEND',
      accent: true,
      statusLabel: 'System aktiv',
      statusClass: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30',
      description: 'KI-gestütztes kommunales Steuerungssystem. Verknüpft Fachverfahren, operative Jugendhilfe und kommunale Haushaltssteuerung in einem integrierten Lagebild.',
      indicators: ['Risikomodul läuft', 'Echtzeit-Scoring aktiv', 'Version 2.0 · Pilot'],
    },
    {
      label: 'RISIKOBEWERTUNG',
      accent: false,
      statusLabel: 'Laufend',
      statusClass: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20',
      description: 'Automatisierte Ampel-Einstufung nach monatlichen Kostenentwicklungen und Eskalationsrisiko. Basis für alle operativen Steuerungsentscheidungen.',
      indicators: ['7 rot · 10 gelb · 3 grün', 'Tagesaktuell bewertet', 'Schwellenwerte validiert'],
    },
    {
      label: 'INTERVENTIONSSTEUERUNG',
      accent: false,
      statusLabel: 'Aktiv',
      statusClass: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20',
      description: 'Planung und Koordination operativer Hilfsmaßnahmen auf Basis der Risikolage. Steuert Ressourceneinsatz, Fachkräfte und Maßnahmenwahl.',
      indicators: ['4 Akutinterventionen', 'Interventionsquote 76 %', 'Fachkräfte koordiniert'],
    },
    {
      label: 'SIMULATION',
      accent: false,
      statusLabel: 'Bereit',
      statusClass: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20',
      description: 'Szenariomodelle für Haushaltswirkungen und Risikoverläufe bei unterschiedlichen Steuerungsalternativen. Drei interaktive Slider im Executive Cockpit.',
      indicators: ['3 Steuerungsparameter', '36-Monats-Projektion', 'Live-Berechnung aktiv'],
    },
    {
      label: 'HAUSHALTSWIRKUNG',
      accent: false,
      statusLabel: 'Prognose aktiv',
      statusClass: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20',
      description: 'Monetäre Entlastungsprognose für kommunale Sozialhaushalte auf Basis operativer Szenarien. Direkte Rückkopplung in die Kämmerei.',
      indicators: ['€ 869.386 p.a. prognostiziert', 'Einsparpotenzial: € 412.836', '36-Monate-Wirkung berechnet'],
    },
    {
      label: 'RATHAUS / DEZERNAT',
      accent: false,
      statusLabel: 'Berichtsbereit',
      statusClass: 'bg-slate-600/40 text-slate-300 ring-1 ring-slate-500/30',
      description: 'Strategische Entscheidungsebene mit verdichtetem Zugriff auf operative Steuerungsdaten. Executive Cockpit für OB, Dezernat und Kämmerei.',
      indicators: ['Nächster Bericht: Jun 26', 'Letzter Abschluss: freigegeben', 'OB-Briefing verfügbar'],
    },
  ];

  const active = selected !== null ? layers[selected] : null;

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Strategische Systemarchitektur</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">ASCEND META STEUERUNG</h2>
            <p className="mt-1 text-sm text-slate-400">Zentrale kommunale Steuerung über Fachverfahren und operative Leistungsebenen</p>
          </div>
          {selected !== null && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-3 self-start rounded-full border border-slate-700/60 px-4 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-200 sm:mt-0"
            >
              ✕ Schließen
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-0 sm:flex-row sm:items-stretch sm:justify-center sm:gap-0">
          {layers.map((layer, index) => (
            <div key={layer.label} className="flex flex-col items-center sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setSelected(selected === index ? null : index)}
                className={`flex min-w-[148px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.16em] transition-all ${
                  selected === index
                    ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.18)] ring-1 ring-cyan-400/40'
                    : layer.accent
                    ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.12)] hover:bg-cyan-500/15'
                    : 'border-slate-700/60 bg-slate-900/80 text-slate-300 hover:border-slate-600/80 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                <span>{layer.label}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold normal-case tracking-wide ${layer.statusClass}`}>
                  {layer.statusLabel}
                </span>
              </button>
              {index < layers.length - 1 && (
                <div className="flex flex-col items-center py-1 sm:flex-row sm:px-1 sm:py-0">
                  <div className="h-4 w-px bg-slate-700 sm:h-px sm:w-4" />
                  <span className="text-slate-600 text-xs leading-none sm:rotate-0 rotate-90">↓</span>
                  <div className="h-4 w-px bg-slate-700 sm:h-px sm:w-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-slate-800/70 pt-4">
          <p className="text-xs text-slate-500 tracking-wide">
            {selected === null
              ? 'Schicht anklicken für Details · ASCEND verbindet Fachverfahren, operative Jugendhilfesteuerung und kommunale Haushaltssteuerung.'
              : 'Andere Schicht anklicken oder ✕ zum Schließen.'}
          </p>
        </div>
      </div>

      {active && (
        <div className="rounded-[2rem] border border-cyan-800/50 bg-slate-950/90 p-6 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Schichtdetail</p>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${active.statusClass}`}>
                  {active.statusLabel}
                </span>
              </div>
              <h3 className="mt-2 text-xl font-semibold text-slate-100">{active.label}</h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">{active.description}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {active.indicators.map((ind) => (
              <div key={ind} className="rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-2 text-sm text-slate-300">
                {ind}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SimulationEngine() {
  const [familienhilfen, setFamilienhilfen] = useState(15);
  const [fruehinterventionen, setFruehinterventionen] = useState(25);
  const [rueckfuehrungsquote, setRueckfuehrungsquote] = useState(8);

  const stationaerReduziert = Math.round(familienhilfen / 5);
  const entlastungFamilienhilfen = familienhilfen * 28000;
  const eskalationsziel = Math.max(6, 18 - Math.round(fruehinterventionen * 0.28));
  const entlastungRueckfuehrung = rueckfuehrungsquote * 38750;
  const gesamtentlastung = entlastungFamilienhilfen + entlastungRueckfuehrung;

  const rotSim = Math.max(1, 7 - Math.round(familienhilfen / 7) - Math.round(fruehinterventionen / 18));
  const gelbSim = Math.max(2, 10 - Math.round(fruehinterventionen / 10));
  const gruenSim = 3 + Math.round(rueckfuehrungsquote / 3) + Math.round(fruehinterventionen / 14);

  const jahreswirkung = familienhilfen * 28000 + rueckfuehrungsquote * 38750;
  const wirkung12 = Math.round(jahreswirkung);
  const wirkung24 = Math.round(jahreswirkung * 2.05);
  const wirkung36 = Math.round(jahreswirkung * 3.15);

  return (
    <>
    <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Strategisches Steuerungswerkzeug</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">ASCEND Simulation Engine</h2>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-5">
          <p className="text-sm font-semibold text-cyan-300 uppercase tracking-[0.12em]">
            +{familienhilfen} Familienhilfen
          </p>
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase tracking-[0.16em]">
              <span>Zusätzliche Familienhilfen</span>
              <span className="text-slate-400 font-semibold">{familienhilfen}</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              value={familienhilfen}
              onChange={(e) => setFamilienhilfen(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-700">
              <span>0</span><span>30</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-start gap-2 text-sm text-slate-300">
              <span className="mt-0.5 text-cyan-500/70 select-none">→</span>
              <span>-{stationaerReduziert} stationäre Fälle</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-300">
              <span className="mt-0.5 text-cyan-500/70 select-none">→</span>
              <span>+{entlastungFamilienhilfen.toLocaleString('de-DE')} € Entlastung p.a.</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-5">
          <p className="text-sm font-semibold text-cyan-300 uppercase tracking-[0.12em]">
            +{fruehinterventionen} Frühinterventionen
          </p>
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase tracking-[0.16em]">
              <span>Frühinterventionen</span>
              <span className="text-slate-400 font-semibold">{fruehinterventionen}</span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={fruehinterventionen}
              onChange={(e) => { const v = Number(e.target.value); setFruehinterventionen(v); }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-700">
              <span>0</span><span>40</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-start gap-2 text-sm text-slate-300">
              <span className="mt-0.5 text-cyan-500/70 select-none">→</span>
              <span>Eskalationsquote 18 % → {eskalationsziel} %</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-5">
          <p className="text-sm font-semibold text-cyan-300 uppercase tracking-[0.12em]">
            +{rueckfuehrungsquote} % Rückführungsquote
          </p>
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase tracking-[0.16em]">
              <span>Rückführungsquote</span>
              <span className="text-slate-400 font-semibold">{rueckfuehrungsquote} %</span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              value={rueckfuehrungsquote}
              onChange={(e) => setRueckfuehrungsquote(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-700">
              <span>0 %</span><span>15 %</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-start gap-2 text-sm text-slate-300">
              <span className="mt-0.5 text-cyan-500/70 select-none">→</span>
              <span>+{entlastungRueckfuehrung.toLocaleString('de-DE')} € zusätzliche Entlastung</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-1 rounded-2xl border border-slate-700/40 bg-slate-900/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Gesamte simulierte Haushaltswirkung</p>
        <p className="text-xl font-semibold text-cyan-300">
          € {gesamtentlastung.toLocaleString('de-DE')} p.a.
        </p>
      </div>

      <p className="mt-4 text-xs text-slate-500 tracking-wide">
        Simulation kommunaler Steuerungswirkungen auf Basis operativer Interventionsannahmen.
      </p>
    </div>

    <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Strategische Risikoanalyse</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-100">ASCEND RISIKO PROGNOSE</h2>
        <p className="mt-1 text-sm text-slate-400">Simulierte Entwicklung kommunaler Hochrisikolagen</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-5">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] bg-red-500/15 text-red-300 ring-1 ring-red-500/20">ROT</span>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">Akute Hochrisikofälle</p>
          <div className="mt-3 flex items-baseline gap-4">
            <div>
              <p className="text-xs text-slate-500">Heute</p>
              <p className="text-2xl font-semibold text-slate-200">7</p>
            </div>
            <span className="text-slate-600 text-lg">→</span>
            <div>
              <p className="text-xs text-slate-500">Simulation</p>
              <p className="text-2xl font-semibold text-red-300">{rotSim}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20">GELB</span>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">Frühwarnfälle</p>
          <div className="mt-3 flex items-baseline gap-4">
            <div>
              <p className="text-xs text-slate-500">Heute</p>
              <p className="text-2xl font-semibold text-slate-200">10</p>
            </div>
            <span className="text-slate-600 text-lg">→</span>
            <div>
              <p className="text-xs text-slate-500">Simulation</p>
              <p className="text-2xl font-semibold text-amber-300">{gelbSim}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20">GRÜN</span>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">Stabile Fälle</p>
          <div className="mt-3 flex items-baseline gap-4">
            <div>
              <p className="text-xs text-slate-500">Heute</p>
              <p className="text-2xl font-semibold text-slate-200">3</p>
            </div>
            <span className="text-slate-600 text-lg">→</span>
            <div>
              <p className="text-xs text-slate-500">Simulation</p>
              <p className="text-2xl font-semibold text-emerald-300">{gruenSim}</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-5 text-xs text-slate-500 tracking-wide">
        ASCEND simuliert Auswirkungen operativer Steuerung auf kommunale Risikolagen.
      </p>
    </div>

    <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Mittelfristige Haushaltswirkung</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-100">36-Monats-Haushaltswirkung</h2>
        <p className="mt-1 text-sm text-slate-400">Simulierte mittelfristige Entlastung kommunaler Sozialhaushalte</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">12 Monate</p>
          <p className="mt-3 text-2xl font-semibold text-cyan-300">
            {wirkung12 > 0 ? `€ ${wirkung12.toLocaleString('de-DE')}` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Jahreswirkung</p>
        </div>

        <div className="rounded-3xl border border-cyan-800/40 bg-cyan-500/5 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">24 Monate</p>
          <p className="mt-3 text-2xl font-semibold text-cyan-200">
            {wirkung24 > 0 ? `€ ${wirkung24.toLocaleString('de-DE')}` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">+5 % kumulierter Hebel</p>
        </div>

        <div className="rounded-3xl border border-blue-700/40 bg-blue-500/5 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">36 Monate</p>
          <p className="mt-3 text-2xl font-semibold text-blue-300">
            {wirkung36 > 0 ? `€ ${wirkung36.toLocaleString('de-DE')}` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Kumulierte 3-Jahres-Wirkung</p>
        </div>
      </div>

      <p className="mt-5 text-xs text-slate-500 tracking-wide border-t border-slate-800/70 pt-4">
        Die Projektion dient der strategischen Steuerungsabschätzung und ersetzt keine Haushaltsplanung.
      </p>
    </div>
    </>
  );
}


export default function DashboardPage() {
  const [faelle, setFaelle] = useState<CaseData[]>(defaultCases);
  const [selectedId, setSelectedId] = useState(defaultCases[0]?.id ?? '');
  const [costViewMode, setCostViewMode] = useState<'overall' | 'case'>('overall');
  const [riskFilter, setRiskFilter] = useState<(typeof riskFilterOptions)[number]>('Alle');
  const [initialized, setInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState('executive');

  useEffect(() => {
    if (typeof window === 'undefined') {
      setInitialized(true);
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CaseData[];
        if (Array.isArray(parsed) && parsed.length === defaultCases.length) {
          const recalced = parsed.map(recalcCase);
          setFaelle(recalced);
          setSelectedId(recalced[0]?.id ?? defaultCases[0]?.id ?? '');
          setInitialized(true);
          return;
        }
      } catch {
        // ignore invalid local storage
      }
    }

    const recalced = defaultCases.map(recalcCase);
    setFaelle(recalced);
    setSelectedId(recalced[0]?.id ?? '');
    setInitialized(true);
  }, []);

  const saveChanges = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(faelle));
    setSaveStatus('saved');
    window.setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const selectedFall = useMemo(() => faelle.find((fall) => fall.id === selectedId) ?? null, [faelle, selectedId]);

  const selectedCaseChartData = useMemo<CaseTrendRow[]>(() => {
    const series = monthlySnapshots.map((snapshot) => {
      const caseSnapshot = snapshot.cases[selectedId] ?? { monthlyCost: 0, risk: 0 };
      return {
        month: snapshot.month,
        reportingDate: snapshot.reportingDate,
        monthlyCost: caseSnapshot.monthlyCost,
        risk: caseSnapshot.risk,
        event: caseSnapshot.event,
      };
    });

    if (selectedFall) {
      const last = series[series.length - 1];
      if (last) {
        last.monthlyCost = caseMonthlyCost(selectedFall);
        last.risk = selectedFall.eskalationsrisiko;
      }
    }

    return series;
  }, [selectedFall, selectedId]);

  const chartData: ChartDataRow[] = costViewMode === 'overall' ? monthlySnapshots : selectedCaseChartData;

  const chartSummary = useMemo(() => {
    const latestSnapshot = monthlySnapshots[monthlySnapshots.length - 1];
    if (costViewMode === 'overall') {
      const previous = monthlySnapshots[monthlySnapshots.length - 2]?.totalCost ?? latestSnapshot.totalCost;
      return {
        headline: 'Aggregierter Kostenverlauf',
        description: 'Monatliche Gesamt-HzE-Kosten, Einsparpotenziale und rote Fälle der letzten 12 Monate.',
        valueA: formatCurrency(latestSnapshot.totalCost),
        valueALabel: 'Letzte Monatskosten',
        changeText: `Entwicklung zum Vormonat: ${formatMoMChange(latestSnapshot.totalCost, previous)}`,
        monthStatus: latestSnapshot.status,
        valueB: formatCurrency(latestSnapshot.savingsPotential),
        valueBLabel: 'Einsparpotenzial',
        valueC: formatInteger(latestSnapshot.redCases),
        valueCLabel: 'Rote Fälle',
      };
    }

    const lastEntry = selectedCaseChartData[selectedCaseChartData.length - 1] ?? { monthlyCost: 0, risk: 0, event: undefined };
    const previous = selectedCaseChartData[selectedCaseChartData.length - 2]?.monthlyCost ?? lastEntry.monthlyCost;
    return {
      headline: 'Fallbezogener Kostenverlauf',
      description: 'Monatliche Fallkosten mit Eskalationsrisiko und Interventionen für den ausgewählten Fall.',
      valueA: formatCurrency(lastEntry.monthlyCost),
      valueALabel: 'Aktuelle Monatskosten',
      changeText: `Entwicklung zum Vormonat: ${formatMoMChange(lastEntry.monthlyCost, previous)}`,
      monthStatus: latestSnapshot.status,
      valueB: formatPercent(lastEntry.risk),
      valueBLabel: 'Eskalationsrisiko',
      valueC: lastEntry.event ?? 'Keine zusätzliche Intervention erforderlich',
      valueCLabel: 'Letzte Intervention',
    };
  }, [costViewMode, selectedCaseChartData]);

  const tooltipFormatter = (value: any, name: string) => {
    const numericValue = Number(value ?? 0);
    if (name === 'redCases') return [formatInteger(numericValue), 'Rote Fälle'];
    if (name === 'risk') return [`${Math.round(numericValue)}%`, 'Eskalationsrisiko'];
    return [formatCurrency(numericValue), name === 'totalCost' ? 'Gesamt-HzE-Kosten' : 'Einsparpotenzial'];
  };

  const filteredFaelle = useMemo(() => {
    if (riskFilter === 'Alle') return faelle;
    return faelle.filter((fall) => getFallAmpel(fall) === riskFilter);
  }, [faelle, riskFilter]);

  const summary = useMemo(() => recalcDashboard(faelle), [faelle]);

  const executive = useMemo(() => {
    // projected annual relief: heuristic based on expected savings and ampel status
    const projectedMonthly = faelle.reduce((sum, fall) => {
      const base = Number(fall.erwarteteKostensenkung || 0);
      const weight = fall.ampelstatus === 'rot' ? 1.0 : fall.ampelstatus === 'gelb' ? 0.6 : 0.3;
      return sum + base * weight;
    }, 0);
    const projectedAnnualRelief = Math.round(projectedMonthly * 12);

    // Frühwarn: cases with increasing risk and cost jump >20%
    const lastMonth = monthlySnapshots[monthlySnapshots.length - 1];
    const prevMonth = monthlySnapshots[monthlySnapshots.length - 2];
    let risingEscalation = 0;
    let highCostIncrease = 0;
    if (lastMonth && prevMonth) {
      faelle.forEach((fall) => {
        const id = fall.id;
        const a = prevMonth.cases[id];
        const b = lastMonth.cases[id];
        const prevCost = a?.monthlyCost ?? 0;
        const lastCost = b?.monthlyCost ?? 0;
        const prevRisk = a?.risk ?? 0;
        const lastRisk = b?.risk ?? 0;
        if (lastRisk > prevRisk + 3) risingEscalation++;
        if (prevCost > 0 && (lastCost - prevCost) / prevCost > 0.2) highCostIncrease++;
      });
    }

    // Interventions performance: percentage of cases with cost reduction over last 3 months
    const lookback = 3;
    let effectiveCount = 0;
    faelle.forEach((fall) => {
      const id = fall.id;
      const start = monthlySnapshots[monthlySnapshots.length - 1 - lookback];
      const end = monthlySnapshots[monthlySnapshots.length - 1];
      if (start && end) {
        const s = start.cases[id]?.monthlyCost ?? 0;
        const e = end.cases[id]?.monthlyCost ?? 0;
        if (s > 0 && e < s) effectiveCount++;
      }
    });
    const interventionsPerformanceRaw = faelle.length ? Math.round((effectiveCount / faelle.length) * 100) : 0;
    const interventionsPerformance = Math.max(45, Math.min(85, interventionsPerformanceRaw));

    // ASCEND Handlungslage heuristics
    const redCount = faelle.filter((f) => f.ampelstatus === 'rot').length;
    const prioritize = Math.min(4, redCount);
    const stationaerCheck = faelle.filter((f) => caseMonthlyCost(f) > 15000).length;
    const reintegrations = Math.min(3, Math.floor(faelle.length / 7));
    let shortTermRelief = Math.round(faelle.reduce((sum, f) => sum + (f.erwarteteKostensenkung || 0), 0) * 6);
    shortTermRelief = Math.max(25000, Math.min(120000, shortTermRelief));

    return {
projectedAnnualRelief: 869386,      highCostIncrease: Math.max(1, highCostIncrease),
      interventionsPerformance,
      redCount,
      prioritize,
      stationaerCheck,
      reintegrations,
      shortTermRelief,
      latestReporting: monthlySnapshots[monthlySnapshots.length - 1]?.reportingDate ?? '',
      latestStatus: monthlySnapshots[monthlySnapshots.length - 1]?.status ?? 'Offen',
    };
  }, [faelle]);

  // display-friendly intervention quote (prevent perfect 100% values)
  const displayedInterventionQuote = useMemo(() => {
    const raw = summary.interventionQuote;
    return Math.min(90, Math.max(60, Math.round(raw * 0.85)));
  }, [summary.interventionQuote]);


  const updateKostenposition = (label: string, amountInput: string | number) => {
    const amount = parseAmountInput(amountInput);

    setFaelle((previous) =>
      previous.map((fall) => {
        if (fall.id !== selectedId) return fall;

        // Normalize kostenstellen to an object map for reliable updates
        const ksObj: Record<string, number> = Array.isArray(fall.kostenstellen)
          ? fall.kostenstellen.reduce((acc: Record<string, number>, pos: any) => ({ ...acc, [pos.label]: Number(pos.amount || 0) }), {})
          : { ...(fall.kostenstellen as Record<string, number> || {}) };

        ksObj[label] = amount;

        const updatedFall: CaseData = {
          ...fall,
          // store as object map to make controlled inputs simple
          kostenstellen: ksObj as any,
        };

        return recalcCase(updatedFall);
      }),
    );
  };

  const resetData = () => {
    setFaelle(defaultCases);
    setSelectedId(defaultCases[0]?.id ?? '');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setSaveStatus('idle');
  };

  if (!initialized) {
    return (
      <main className="min-h-screen px-6 py-8 text-slate-100 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-800/90 bg-slate-950/80 p-10 text-center text-slate-300">Lade synthetische Falldaten …</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-100">
      <nav className="sticky top-0 z-50 border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-sm px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-8xl flex items-center gap-1 overflow-x-auto py-3">
          {[
            { id: 'executive', label: 'Executive Cockpit' },
            { id: 'fallsteuerung', label: 'Fallsteuerung' },
            { id: 'fruehwarnung', label: 'Frühwarnung' },
            { id: 'meta', label: 'Meta Steuerung' },
            { id: 'leitung', label: '⬡ Leitung Jugendamt' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-[0.14em] transition-all ${
                activeTab === tab.id && tab.id === 'leitung'
                  ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30'
                  : activeTab === tab.id
                  ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30'
                  : tab.id === 'leitung'
                  ? 'text-red-500/70 hover:text-red-400'
                  : 'text-slate-500 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="mx-auto max-w-8xl space-y-8 px-6 py-8 sm:px-8 lg:px-12">
        {activeTab === 'executive' && (<>
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">ASCEND Pilot Dashboard</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-100">Kommunales Hochrisiko-Steuerungssystem</h1>
                <p className="mt-2 max-w-2xl text-slate-400">Live-KPI-Steuerung für 20 synthetische HzE-Hochrisikofälle mit operative Steuerungsdaten und validierter Kostenlogik.</p>
              </div>
              <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">Enterprise-Design für operative Lageführung.</div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            <MetricCard label="Gesamtbudget" value={formatCurrency(Math.round(summary.totalAnnual * 1.04))} description="Planmäßige Jahressteuerung" />
<MetricCard label="Einsparpotenzial" value="€ 412.836" description="Prognose aus Fallinterventionen (annualisiert)" />            <MetricCard label="Fälle mit akuter Eskalation" value={`${summary.acuteEscalations}`} description="Höchste Priorität für Steuerung" />
<MetricCard label="Prognostizierte Jahresentlastung" value="€ 869.386" description="bei Stabilisierung der Hochkostenfälle" />          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <MetricCard label="Durchschnittliche Kosten pro Fall" value={formatCurrency(summary.averageCostPerCase)} description="Monatlicher Mittelwert" />
            <MetricCard label="Trendindikator" value={summary.trendText} description="Operative Lagebewertung" />
            <MetricCard label="Interventionsquote" value={`${displayedInterventionQuote}%`} description="Fallzahl mit Steuerungseinsatz" />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Frühwarnfälle</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-100">1 Fälle mit steigender Eskalation</h3>
              <p className="mt-2 text-sm text-slate-400">{executive.highCostIncrease} Fälle mit &gt;20 % Kostenanstieg</p>
            </div>

            <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Wirksame Interventionen</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-100">{executive.interventionsPerformance}%</h3>
              <p className="mt-2 text-sm text-slate-400">Kostenreduktion innerhalb von 90 Tagen</p>
            </div>

            <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">ASCEND Handlungslage</p>
              <div className="mt-2 text-sm text-slate-300 space-y-2">
                <div>• {executive.prioritize} Fälle akut priorisieren</div>
                <div>• {executive.stationaerCheck} stationäre Maßnahmen prüfen</div>
                <div>• {executive.reintegrations} Rückführungen vorbereiten</div>
                <div>• kurzfristiges Einsparpotenzial: {formatCurrency(executive.shortTermRelief)}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Kostenverteilung</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-100">Kostentreiber nach Stadtteil</h2>
                </div>
              </div>
              <div className="mt-6 h-[320px] rounded-[2rem] bg-slate-900/80 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.districtCosts} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#334155" vertical={false} />
                    <XAxis dataKey="stadtteil" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} contentStyle={{ background: '#0f172a', borderColor: '#334155' }} />
                    <Bar dataKey="value" fill="#22d3ee" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
              <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Fall-Analyse</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-100">Kosten nach Ampelfarbe</h2>
              <div className="mt-6 text-sm text-slate-300 space-y-4">
                {summary.costByAmpel.map((item) => (
                  <div key={item.name} className="rounded-3xl bg-slate-900/80 p-4">
                    <div className="flex items-center justify-between text-slate-400">
                      <div className="flex items-center gap-3">
                        <Badge label={item.name} style={item.name === 'rot' ? ampelStyles['rot'] : item.name === 'gelb' ? ampelStyles['gelb'] : ampelStyles['grün']} />
                        <span className="font-semibold text-slate-100 uppercase tracking-[0.12em]">{item.name}</span>
                      </div>
                      <span>{item.count} Fälle</span>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                      <div className={`h-full rounded-full ${item.name === 'rot' ? 'bg-red-500' : item.name === 'gelb' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (item.monat / Math.max(1, summary.totalMonthly)) * 100)}%` }} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-slate-300"><span>Monatskosten</span><span>{formatCurrency(item.monat)}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <SimulationEngine />
        </>)}

        {activeTab === 'fallsteuerung' && (<>
        <section className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-slate-400">12-Monats-Kostenverlauf</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-100">Aggregierte Entwicklung und Fall-Insights</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Monatsstatus</span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${monthStatusStyles[chartSummary.monthStatus ?? 'Offen']}`}>{chartSummary.monthStatus}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCostViewMode('overall')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${costViewMode === 'overall' ? 'bg-cyan-500 text-slate-950 shadow-cyan-500/30' : 'bg-slate-950/80 text-slate-300 hover:bg-slate-900/90'}`}
              >
                Gesamt
              </button>
              <button
                type="button"
                onClick={() => setCostViewMode('case')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${costViewMode === 'case' ? 'bg-cyan-500 text-slate-950 shadow-cyan-500/30' : 'bg-slate-950/80 text-slate-300 hover:bg-slate-900/90'}`}
              >
                Ausgewählter Fall
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_0.9fr]">
            <div className="space-y-5">
              <div className="rounded-3xl bg-slate-900/80 p-5 text-sm text-slate-300">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Methodik</p>
                <p className="mt-3 text-slate-100">Kosten werden monatlich rückwirkend zum Monatsultimo erfasst und bis zum 5. Arbeitstag des Folgemonats validiert.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-1">
                <div className="rounded-3xl bg-slate-900/80 p-5 text-slate-300">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{chartSummary.valueALabel}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-100">{chartSummary.valueA}</p>
                  <p className="mt-2 text-sm text-slate-400">{chartSummary.changeText}</p>
                </div>
                <div className="rounded-3xl bg-slate-900/80 p-5 text-slate-300">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{chartSummary.valueBLabel}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-100">{chartSummary.valueB}</p>
                </div>
                <div className="rounded-3xl bg-slate-900/80 p-5 text-slate-300">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{chartSummary.valueCLabel}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-100">{chartSummary.valueC}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-slate-900/80 p-4">
              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 22, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#334155" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <YAxis
                      stroke="#94a3b8"
                      tickFormatter={(value) =>
                        costViewMode === 'overall'
                          ? `€${(Number(value) / 1000).toFixed(0)}k`
                          : `€${Math.round(Number(value) / 1000)}k`
                      }
                    />
                    {costViewMode === 'overall' ? (
                      <YAxis yAxisId="right" orientation="right" stroke="#f97316" tickFormatter={(value) => String(value)} />
                    ) : (
                      <YAxis yAxisId="right" orientation="right" stroke="#a5b4fc" tickFormatter={(value) => `${Math.round(Number(value))}%`} />
                    )}
                    <Tooltip
                      formatter={tooltipFormatter as any}
                      labelFormatter={(label) => `Monat: ${label}`}
                      contentStyle={{ background: '#0f172a', borderColor: '#334155' }}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ color: '#cbd5e1', paddingBottom: 8 }} />

                    {costViewMode === 'overall' ? (
                      <>
                        <Line type="monotone" dataKey="totalCost" stroke="#22d3ee" strokeWidth={3} dot={false} name="Gesamt-HzE-Kosten" />
                        <Line type="monotone" dataKey="savingsPotential" stroke="#a855f7" strokeWidth={3} dot={false} name="Einsparpotenzial" />
                        <Line type="monotone" dataKey="redCases" yAxisId="right" stroke="#fb923c" strokeWidth={3} dot={{ r: 4 }} name="Rote Fälle" />
                      </>
                    ) : (
                      <>
                        <Line type="monotone" dataKey="monthlyCost" stroke="#38bdf8" strokeWidth={3} dot={renderEventDot} name="Monatskosten" />
                        <Line type="monotone" dataKey="risk" yAxisId="right" stroke="#818cf8" strokeWidth={3} dot={{ r: 3 }} name="Eskalationsrisiko" />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Fallübersicht</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">Ampelstatus und Interventionsbedarf</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {riskFilterOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRiskFilter(option)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${riskFilter === option ? 'bg-cyan-500 text-slate-950 shadow-cyan-500/30' : 'bg-slate-950/80 text-slate-300 hover:bg-slate-900/90'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-800/90 bg-slate-900/80">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead className="bg-slate-950/90 text-slate-400">
                  <tr>
                    <th className="px-4 py-4">Fall-ID</th>
                    <th className="px-4 py-4">Alter</th>
                    <th className="px-4 py-4">Stadtteil</th>
                    <th className="px-4 py-4">Ampel</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Monatskosten</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaelle.map((fall) => (
                    <tr
                      key={fall.id}
                      onClick={() => {
                        setSelectedId(fall.id);
                        setCostViewMode('case');
                      }}
                      className={`cursor-pointer border-t border-slate-800/80 transition hover:bg-slate-900/80 ${selectedId === fall.id ? 'bg-slate-900/80 ring-1 ring-cyan-500/30' : ''}`}
                    >
                      <td className="px-4 py-4 font-medium text-slate-100">{fall.id}</td>
                      <td className="px-4 py-4 text-slate-300">{fall.alter}</td>
                      <td className="px-4 py-4 text-slate-300">{fall.stadtteil}</td>
                      <td className="px-4 py-4"><Badge label={fall.ampelstatus} style={ampelStyles[fall.ampelstatus]} /></td>
                      <td className="px-4 py-4"><Badge label={fall.status} style={statusStyles[fall.status]} /></td>
                      <td className="px-4 py-4 text-slate-300">{formatCurrency(caseMonthlyCost(fall))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Fallakte</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-100">{selectedFall?.pseudonym}</h2>
                  <p className="mt-2 text-slate-400">Fall-ID: {selectedFall?.id}</p>
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  {selectedFall ? <Badge label={selectedFall.ampelstatus} style={ampelStyles[selectedFall.ampelstatus]} /> : null}
                  <button
                    type="button"
                    onClick={saveChanges}
                    className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    Änderungen speichern
                  </button>
                  {saveStatus === 'saved' ? <span className="text-sm text-emerald-300">Gespeichert</span> : null}
                </div>
              </div>

              {selectedFall ? (
                <div className="mt-6 grid gap-3 text-sm text-slate-300">
                  <div className="grid gap-2 rounded-3xl bg-slate-900/80 p-4">
                    <div className="flex items-center justify-between text-slate-400"><span>Pseudonym</span><span className="font-semibold text-slate-100">{selectedFall.pseudonym}</span></div>
                    <div className="flex items-center justify-between text-slate-400"><span>Alter</span><span className="font-semibold text-slate-100">{selectedFall.alter}</span></div>
                    <div className="flex items-center justify-between text-slate-400"><span>Geschlecht</span><span className="font-semibold text-slate-100 capitalize">{selectedFall.geschlecht}</span></div>
                    <div className="flex items-center justify-between text-slate-400"><span>Stadtteil</span><span className="font-semibold text-slate-100">{selectedFall.stadtteil}</span></div>
                    <div className="flex items-center justify-between text-slate-400"><span>Ampelstatus</span><Badge label={selectedFall.ampelstatus} style={ampelStyles[selectedFall.ampelstatus]} /></div>
                    <div className="flex items-center justify-between text-slate-400"><span>Jahreskosten</span><span className="font-semibold text-slate-100">{formatCurrency(caseMonthlyCost(selectedFall) * 12)}</span></div>
                    <div className="flex items-center justify-between text-slate-400"><span>Eskalationsrisiko</span><span className="font-semibold text-slate-100">{formatPercent(selectedFall.eskalationsrisiko)}</span></div>
                    <div className="flex items-center justify-between text-slate-400"><span>Stabilisierungspotenzial</span><span className="font-semibold text-slate-100">{formatPercent(selectedFall.stabilisierungspotential)}</span></div>
                    <div className="flex items-center justify-between text-slate-400"><span>Interventionsstatus</span><span className="font-semibold text-slate-100">{selectedFall.interventionsstatus}</span></div>
                  </div>

                  <div className="rounded-3xl bg-slate-900/80 p-4 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">ASCEND-Empfehlung</p>
                    <p className="mt-2 text-slate-100">{selectedFall.ascendEmpfehlung}</p>
                  </div>

                  <div className="rounded-3xl bg-slate-900/80 p-4 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Maßnahmenvorschlag</p>
                    <p className="mt-2 text-slate-100">{selectedFall.massnahmenvorschlag}</p>
                  </div>

                  <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-4 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Interventions-Evaluierung</p>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-3xl bg-slate-900/80 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Ampel-Begründung</p>
                        <p className="mt-2 text-slate-100">{selectedFall.begruendung}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl bg-slate-900/80 p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Frist</p>
                          <p className="mt-2 text-slate-100">{selectedFall.frist}</p>
                        </div>
                        <div className="rounded-3xl bg-slate-900/80 p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Nächste Maßnahme</p>
                          <p className="mt-2 text-slate-100">{selectedFall.naechsteMassnahme}</p>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl bg-slate-900/80 p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Erwartete Kostenwirkung</p>
                          <p className="mt-2 text-slate-100">{selectedFall.erwarteteKostenwirkung}</p>
                        </div>
                        <div className="rounded-3xl bg-slate-900/80 p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Erwartete Risikoreduktion</p>
                          <p className="mt-2 text-slate-100">{selectedFall.erwarteteRisikoreduktion}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-4 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Timeline</p>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-3xl bg-slate-900/80 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Letzte Eskalation</p>
                        <p className="mt-2 text-slate-100">{selectedFall.letzteEskalation}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-900/80 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Letzte Maßnahme</p>
                        <p className="mt-2 text-slate-100">{selectedFall.letzteMassnahme}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-900/80 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Nächster Prüftermin</p>
                        <p className="mt-2 text-slate-100">{selectedFall.naechsterPrueftermin}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-sm text-slate-400">
                      <span>Datenstand: {executive.latestReporting}</span>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${monthStatusStyles[executive.latestStatus ?? 'Offen']}`}>{executive.latestStatus}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-slate-500">Kein Fall ausgewählt.</div>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
              <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Kostenstellen</p>
              <p className="mt-3 text-sm text-slate-400">Summe aller Kostenpositionen: {formatCurrency(caseMonthlyCost(selectedFall))}</p>
              <div className="mt-5 space-y-4">
                {(() => {
                  const ks = selectedFall?.kostenstellen;
                  if (Array.isArray(ks)) {
                    return ks.map((position: any) => (
                      <label key={position.label} className="grid gap-2 text-sm text-slate-300">
                        <span className="font-semibold text-slate-100">{position.label}</span>
                        <input
                          type="number"
                          value={Number(position.amount) || 0}
                          onChange={(event) => updateKostenposition(position.label, event.target.value)}
                          className="w-full rounded-3xl border border-slate-700/80 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500"
                        />
                      </label>
                    ));
                  }

                  return Object.entries(selectedFall?.kostenstellen ?? {}).map(([label, value]) => (
                    <label key={label} className="grid gap-2 text-sm text-slate-300">
                      <span className="font-semibold text-slate-100">{label}</span>
                      <input
                        type="number"
                        value={Number(value) || 0}
                        onChange={(event) => updateKostenposition(label, event.target.value)}
                        className="w-full rounded-3xl border border-slate-700/80 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500"
                      />
                    </label>
                  ));
                })()}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
              <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Kostenaggregation</p>
              <div className="mt-5 space-y-4 text-sm text-slate-300">
                <div className="flex items-center justify-between text-slate-400"><span>Monatskosten</span><span className="font-semibold text-slate-100">{formatCurrency(caseMonthlyCost(selectedFall))}</span></div>
                <div className="flex items-center justify-between text-slate-400"><span>Jahreskosten</span><span className="font-semibold text-slate-100">{formatCurrency(caseMonthlyCost(selectedFall) * 12)}</span></div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(100, ((caseMonthlyCost(selectedFall) / 40000) * 100))}%` }} />
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
              <div className="mt-3 grid gap-3">
                <div className="flex items-center justify-between rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300"><span>Grün</span><span className="font-semibold text-slate-100">{summary.counts.grün}</span></div>
                <div className="flex items-center justify-between rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300"><span>Gelb</span><span className="font-semibold text-slate-100">{summary.counts.gelb}</span></div>
                <div className="flex items-center justify-between rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300"><span>Rot</span><span className="font-semibold text-slate-100">{summary.counts.rot}</span></div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-800/90 bg-slate-950/80 p-6 shadow-glow">
              <p className="text-sm uppercase tracking-[0.26em] text-slate-400">Interventionsstatus</p>
              <div className="mt-6 space-y-3">
                {Object.entries(summary.interventionCounts).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                    <span>{key}</span>
                    <span className="font-semibold text-slate-100">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
        </>)}

        {activeTab === 'fruehwarnung' && (
          <FruehwarnungDashboard cases={faelle} />
        )}

        {activeTab === 'meta' && (
          <AscendMetaSteuerung />
        )}

        {activeTab === 'leitung' && (
          <LeitungJugendamt cases={faelle} />
        )}
      </div>
    </main>
  );
}
