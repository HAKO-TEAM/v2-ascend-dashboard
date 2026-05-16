'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { defaultCases, type CaseData, type Interventionsstatus, type Ampelstatus } from '../lib/cases';

const STORAGE_KEY = 'ascend-dashboard-hze-cases-v1';
const riskFilterOptions = ['Alle', 'grün', 'gelb', 'rot'] as const;
const interventionOptions: Interventionsstatus[] = ['Monitoring', 'Frühintervention', 'ASCEND prüfen', 'Akutintervention'];

const ampelStyles: Record<Ampelstatus, string> = {
  grün: 'bg-emerald-500/10 text-emerald-300',
  gelb: 'bg-amber-500/10 text-amber-300',
  rot: 'bg-red-500/10 text-red-300',
};

const statusStyles: Record<string, string> = {
  'Kritischer Interventionsbedarf': 'bg-red-500/10 text-red-300',
  'Operatives Monitoring': 'bg-amber-500/10 text-amber-300',
  Stabilisiert: 'bg-emerald-500/10 text-emerald-300',
};

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `€ ${safeValue.toLocaleString('de-DE')}`;
}

function formatPercent(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${Math.min(100, Math.max(0, safeValue))}%`;
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

function getFallAmpel(fall: CaseData | null | undefined): Ampelstatus | undefined {
  return (fall as any)?.ampel ?? fall?.ampelstatus;
}

function Badge({ label, style }: { label: string; style: string }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${style}`}>{label}</span>;
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

export default function DashboardPage() {
  const [faelle, setFaelle] = useState<CaseData[]>(defaultCases);
  const [selectedId, setSelectedId] = useState(defaultCases[0]?.id ?? '');
  const [riskFilter, setRiskFilter] = useState<(typeof riskFilterOptions)[number]>('Alle');
  const [initialized, setInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

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
          setFaelle(parsed);
          setSelectedId(parsed[0]?.id ?? defaultCases[0]?.id ?? '');
          setInitialized(true);
          return;
        }
      } catch {
        // ignore invalid local storage
      }
    }

    setFaelle(defaultCases);
    setSelectedId(defaultCases[0]?.id ?? '');
    setInitialized(true);
  }, []);

  const saveChanges = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(faelle));
    setSaveStatus('saved');
    window.setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const selectedFall = useMemo(() => faelle.find((fall) => fall.id === selectedId) ?? null, [faelle, selectedId]);

  const filteredFaelle = useMemo(() => {
    if (riskFilter === 'Alle') return faelle;
    return faelle.filter((fall) => getFallAmpel(fall) === riskFilter);
  }, [faelle, riskFilter]);

  const summary = useMemo(() => {
    const totalMonthly = faelle.reduce((sum, fall) => sum + caseMonthlyCost(fall), 0);
    const totalAnnual = faelle.reduce((sum, fall) => sum + caseMonthlyCost(fall) * 12, 0);
    const counts = faelle.reduce(
      (acc, fall) => {
        const ampel = getFallAmpel(fall);
        return {
          grün: acc.grün + (ampel === 'grün' ? 1 : 0),
          gelb: acc.gelb + (ampel === 'gelb' ? 1 : 0),
          rot: acc.rot + (ampel === 'rot' ? 1 : 0),
        };
      },
      { grün: 0, gelb: 0, rot: 0 },
    );
    const averageEscalation = faelle.length ? Math.round(faelle.reduce((sum, fall) => sum + fall.eskalationsrisiko, 0) / faelle.length) : 0;
    const interventionCounts = interventionOptions.reduce(
      (acc, key) => ({ ...acc, [key]: faelle.filter((fall) => fall.interventionsstatus === key).length }),
      {} as Record<Interventionsstatus, number>,
    );
    const totalSavingsPotential = faelle.reduce((sum, fall) => sum + fall.erwarteteKostensenkung, 0);
    const averageCostPerCase = faelle.length ? Math.round(totalMonthly / faelle.length) : 0;
    const acuteEscalations = faelle.filter((fall) => getFallAmpel(fall) === 'rot' && fall.eskalationsrisiko >= 75).length;
    const interventionQuote = faelle.length
      ? Math.round((faelle.filter((fall) => fall.interventionsstatus !== 'Monitoring').length / faelle.length) * 100)
      : 0;

    const districtCostMap = faelle.reduce((acc, fall) => {
      acc[fall.stadtteil] = (acc[fall.stadtteil] ?? 0) + caseMonthlyCost(fall) * 12;
      return acc;
    }, {} as Record<string, number>);

    const costByAmpel = (['grün', 'gelb', 'rot'] as Ampelstatus[]).map((ampel) => ({
      name: ampel,
      monat: faelle.filter((fall) => getFallAmpel(fall) === ampel).reduce((sum, fall) => sum + caseMonthlyCost(fall), 0),
      count: faelle.filter((fall) => getFallAmpel(fall) === ampel).length,
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
  }, [faelle]);

  const updateKostenposition = (label: string, amountInput: number) => {
    const amount = Number.isFinite(amountInput) ? amountInput : Number(amountInput) || 0;
    setFaelle((previous) =>
      previous.map((fall) => {
        if (fall.id !== selectedId) return fall;
        const kostenstellen = {
          ...fall.kostenstellen,
          [label]: Math.max(0, amount),
        };
        const updatedFall = {
          ...fall,
          kostenstellen,
        } as CaseData;
        const monatKostenGesamt = caseMonthlyCost(updatedFall);
        return {
          ...updatedFall,
          monatKostenGesamt,
          jahresKostenGesamt: monatKostenGesamt * 12,
        } as CaseData;
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
    <main className="min-h-screen px-6 py-8 text-slate-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-8xl space-y-8">
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

          <div className="grid gap-4 xl:grid-cols-3">
            <MetricCard label="Gesamtbudget" value={formatCurrency(Math.round(summary.totalAnnual * 1.04))} description="Planmäßige Jahressteuerung" />
            <MetricCard label="Einsparpotenzial" value={formatCurrency(summary.totalSavingsPotential)} description="Prognose aus Fallinterventionen" />
            <MetricCard label="Fälle mit akuter Eskalation" value={`${summary.acuteEscalations}`} description="Höchste Priorität für Steuerung" />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <MetricCard label="Durchschnittliche Kosten pro Fall" value={formatCurrency(summary.averageCostPerCase)} description="Monatlicher Mittelwert" />
            <MetricCard label="Trendindikator" value={summary.trendText} description="Operative Lagebewertung" />
            <MetricCard label="Interventionsquote" value={`${summary.interventionQuote}%`} description="Fallzahl mit Steuerungseinsatz" />
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
                    <div className="flex items-center justify-between text-slate-400"><span className="font-semibold text-slate-100 uppercase tracking-[0.12em]">{item.name}</span><span>{item.count} Fälle</span></div>
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
                      onClick={() => setSelectedId(fall.id)}
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
                {Object.entries(selectedFall?.kostenstellen ?? {}).map(([label, value], index) => (
                  <label key={label} className="grid gap-2 text-sm text-slate-300">
                    <span className="font-semibold text-slate-100">{label}</span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={Number(value) || 0}
                      onChange={(event) => updateKostenposition(label, Number(event.target.value))}
                      className="w-full rounded-3xl border border-slate-700/80 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500"
                    />
                  </label>
                ))}
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
      </div>
    </main>
  );
}
