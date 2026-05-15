"use client";

import { useEffect, useMemo, useState } from 'react';
import { faelle, reportData, type Fall } from '../lib/mockData';

const risikofarbe: Record<string, string> = {
  Kritisch: 'bg-red-500/10 text-red-300',
  Hoch: 'bg-amber-500/10 text-amber-300',
  Mittel: 'bg-sky-500/10 text-sky-300',
  Beobachtung: 'bg-blue-500/10 text-blue-300',
  Stabil: 'bg-emerald-500/10 text-emerald-300',
};

const kostenfarbe: Record<string, string> = {
  Rot: 'bg-red-500/10 text-red-300',
  Gelb: 'bg-amber-500/10 text-amber-300',
  Grün: 'bg-emerald-500/10 text-emerald-300',
};

const budgetLevelStyles: Record<string, string> = {
  Hoch: 'bg-red-500/10 text-red-300',
  Mittel: 'bg-amber-500/10 text-amber-300',
  Niedrig: 'bg-emerald-500/10 text-emerald-300',
};

const riskFilterOptions = ['Alle', 'Kritisch', 'Hoch', 'Mittel', 'Beobachtung', 'Stabil'] as const;
type RiskFilter = (typeof riskFilterOptions)[number];

function Badge({ label, style }: { label: string; style: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${style}`}>
      {label}
    </span>
  );
}

function MetricTile({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: 'good' | 'neutral' | 'alert' }) {
  const toneClass = tone === 'good' ? 'text-emerald-300' : tone === 'alert' ? 'text-red-300' : 'text-slate-100';
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5 shadow-sm transition hover:border-cyan-500/30">
      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className={`text-3xl font-semibold ${toneClass}`}>{value}</p>
        <p className="text-sm text-slate-400">{delta}</p>
      </div>
    </div>
  );
}

function TrendChart({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="space-y-4 rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{label}</span>
        <span>letzte 6 Monate</span>
      </div>
      <div className="flex items-end gap-3 h-44">
        {values.map((value, index) => (
          <div key={index} className="relative flex-1">
            <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] uppercase text-slate-500">M{index + 1}</div>
            <div
              className="mx-auto h-full w-full rounded-3xl bg-gradient-to-t from-slate-700 via-slate-600 to-cyan-500"
              style={{ height: `${(value / max) * 100}%` }}
              title={`${value}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [selectedFall, setSelectedFall] = useState<Fall>(() => faelle.find((fall) => fall.id === 'HZE-118') ?? faelle[0]);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('Alle');
  const [simulationLoad, setSimulationLoad] = useState(18);

  const filteredFaelle = useMemo(() => {
    if (riskFilter === 'Alle') return faelle;
    return faelle.filter((fall) => fall.risiko === riskFilter);
  }, [riskFilter]);

  useEffect(() => {
    if (!filteredFaelle.some((fall) => fall.id === selectedFall.id)) {
      setSelectedFall(filteredFaelle[0] ?? faelle[0]);
    }
  }, [filteredFaelle, selectedFall]);

  const simulationEinsparung = reportData.einsparpotential + simulationLoad * 950;
  const simulationBudgetShadow = reportData.budget - simulationEinsparung;
  const simulationStabilized = Math.min(92, 56 + simulationLoad);

  const feedEvents = useMemo(() => {
    const simulatedEvents = [
      {
        id: 'sim-1',
        fallId: 'HZE-118',
        typ: 'Akute Eskalation',
        zeit: 'vor 3 Min',
        status: 'Kritisch',
        beschreibung: 'Schulabsenz > 21 Tage erkannt. Intensive Betreuung prüfen.',
      },
      {
        id: 'sim-2',
        fallId: 'HZE-118',
        typ: 'Maßnahmeabbruch',
        zeit: 'vor 10 Min',
        status: 'Hoch',
        beschreibung: 'Stationäre Maßnahme abgebrochen. Nachsteuerung erforderlich.',
      },
      {
        id: 'sim-3',
        fallId: 'Nordcluster',
        typ: 'Budgetüberschreitung',
        zeit: 'vor 18 Min',
        status: 'Hoch',
        beschreibung: 'Nordcluster meldet Budgetüberschreitung bei stationären Leistungen.',
      },
      {
        id: 'sim-4',
        fallId: 'HZE-118',
        typ: 'Stationäre Eskalation',
        zeit: 'vor 22 Min',
        status: 'Kritisch',
        beschreibung: 'Akute Eskalation mit drohender stationärer Unterbringung.',
      },
    ];

    const combined = [...simulatedEvents, ...reportData.eskalationsfeed.map((item, index) => ({ ...item, id: `feed-${index}` }))];
    if (riskFilter === 'Alle') return combined;
    return combined.filter((item) => item.status === riskFilter);
  }, [riskFilter]);

  const kostenAmpel = useMemo(
    () => ({
      rot: faelle.filter((item) => item.kostenstatus === 'Rot').length,
      gelb: faelle.filter((item) => item.kostenstatus === 'Gelb').length,
      gruen: faelle.filter((item) => item.kostenstatus === 'Grün').length,
    }),
    [],
  );

  return (
    <main className="min-h-screen px-6 py-8 text-slate-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-8xl space-y-8">
        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="section-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">ASCEND Steuerungsplattform</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-100">Professionelles Kommunales Hochrisiko-Dashboard</h1>
                <p className="mt-2 max-w-2xl text-slate-400">Realistische Operationsübersicht für Jugendamt, Verwaltungsspitze, Stadtrat und Partner. Alle Inhalte sind synthetisch und zeigen eine hochwertige Steuerungsplattform.</p>
              </div>
              <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 px-5 py-4 text-right">
                <p className="text-sm text-slate-400">Reporting Monat</p>
                <p className="mt-2 text-3xl font-semibold text-cyan-300">{reportData.monat}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {reportData.kpis.map((item) => (
                <MetricTile key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone as 'good' | 'neutral' | 'alert'} />
              ))}
              <MetricTile label="Simulationspuls" value={`${simulationLoad} Fälle`} delta={`Einsparung € ${simulationEinsparung.toLocaleString('de-DE')}`} tone={simulationLoad > 28 ? 'alert' : simulationLoad > 18 ? 'neutral' : 'good'} />
            </div>
          </div>

          <div className="section-card flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Risikostatus</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-100">Risiko- und Kostenampel</h2>
              </div>
              <div className="rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">Operative Lageführung</div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-500/40">
                <p className="text-sm uppercase text-slate-400">Kosten Rot</p>
                <p className="mt-3 text-3xl font-semibold text-red-300">{kostenAmpel.rot}</p>
                <p className="mt-2 text-sm text-slate-500">Intensive Steuerung erforderlich</p>
              </div>
              <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-amber-500/40">
                <p className="text-sm uppercase text-slate-400">Kosten Gelb</p>
                <p className="mt-3 text-3xl font-semibold text-amber-300">{kostenAmpel.gelb}</p>
                <p className="mt-2 text-sm text-slate-500">Monitoring und Budgetprüfung</p>
              </div>
              <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-500/40">
                <p className="text-sm uppercase text-slate-400">Kosten Grün</p>
                <p className="mt-3 text-3xl font-semibold text-emerald-300">{kostenAmpel.gruen}</p>
                <p className="mt-2 text-sm text-slate-500">Stabile Steuerung aktiv</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-5 transition duration-300 hover:-translate-y-1">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Interaktive Risikoampel</p>
                  <p className="mt-2 text-slate-300">Live filtert die Tabelle nach tatsächlichem Risikostatus. Klick auf eine Zeile öffnet rechts die Detailakte.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {riskFilterOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setRiskFilter(option)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-300 ${
                        riskFilter === option
                          ? 'bg-cyan-500 text-slate-950 shadow-cyan-500/30'
                          : 'bg-slate-950/80 text-slate-300 hover:bg-slate-900/90'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5 rounded-3xl border border-slate-800/90 bg-slate-950/80 p-4">
                <p className="text-sm text-slate-400">Gefilterte Fälle</p>
                <p className="mt-2 text-3xl font-semibold text-slate-100">{filteredFaelle.length}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-5 transition duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Simulationsmodus</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-100">Übernommene Hochrisiko-Fälle</h3>
                </div>
                <span className="rounded-3xl bg-slate-950/80 px-3 py-2 text-sm text-slate-300">Live Sektor</span>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>Anzahl Fälle</span>
                  <span className="font-semibold text-slate-100">{simulationLoad}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={simulationLoad}
                  onChange={(event) => setSimulationLoad(Number(event.target.value))}
                  className="mt-4 w-full accent-cyan-400"
                />
                <p className="mt-4 text-sm text-slate-300">Haushaltswirkung: € {simulationEinsparung.toLocaleString('de-DE')} / Verfügbar: € {Math.max(0, simulationBudgetShadow).toLocaleString('de-DE')}</p>
                <p className="mt-2 text-sm text-slate-300">Stabilisierte Fälle: {simulationStabilized} %</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ProgressBar label="Stabilität im Fallbestand" value={simulationStabilized} />
              <ProgressBar label="Prioritätensetzung erfüllt" value={82} />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="section-card grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Executive Summary</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-100">Strategische Lagezusammenfassung</h2>
                </div>
                <div className="rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">Strategisch verwertbar</div>
              </div>
              <p className="text-slate-300">{reportData.executiveSummary.overview}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {reportData.executiveSummary.bullets.map((item) => (
                  <div key={item} className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-4 text-sm text-slate-300">{item}</div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Politische Steuerungsebene</p>
              <div className="mt-5 space-y-4">
                {reportData.policyActions.map((item) => (
                  <div key={item.initiative} className="rounded-3xl bg-slate-950/90 p-4">
                    <p className="text-sm text-slate-300 font-semibold">{item.initiative}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{item.status}</p>
                    <p className="mt-2 text-sm text-slate-400">Ziel: {item.ziel}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="section-card space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Eskalationsfeed</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-100">Aktuelle operative Lage</h2>
              </div>
              <p className="text-sm text-slate-400">Laufende Prioritäten und Eskalationen.</p>
            </div>
            <div className="space-y-3">
              {feedEvents.map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-500/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-100">{item.fallId} · {item.typ}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.beschreibung}</p>
                    </div>
                    <Badge label={item.status} style={item.status === 'Kritisch' ? 'bg-red-500/10 text-red-300' : item.status === 'Hoch' ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                    <span>{item.zeit}</span>
                    <span className="italic">Resilienz-Index: {7 + (item.zeit.length % 5)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="section-card">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Budgetwarnungen</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-100">Haushalt im Fokus</h2>
              </div>
              <div className="mt-6 space-y-4">
                {reportData.budgetWarnungen.map((warnung) => (
                  <div key={warnung.title} className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-100">{warnung.title}</p>
                      <Badge label={warnung.level} style={budgetLevelStyles[warnung.level]} />
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{warnung.detail}</p>
                    <p className="mt-2 text-sm text-slate-500">{warnung.impact}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="section-card">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Simulierte Haushaltswirkung</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-100">Haushaltsentlastung</h2>
              </div>
              <div className="mt-6 space-y-4 rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5">
                <p className="text-slate-400">Aktuelle Simulation zeigt das Einnahme- und Ausgabenbild bei operativer Steuerung.</p>
                <div className="flex items-center justify-between text-slate-100">
                  <span>Haushaltsnutzen</span>
                  <span className="font-semibold">€ {reportData.einsparpotential.toLocaleString('de-DE')}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800">
                  <div className="h-full w-3/4 rounded-full bg-cyan-500" />
                </div>
                <p className="text-sm text-slate-500">Prognose zeigt wirksame Steuerung bei verbesserter Trägerkooperation.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="section-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Fallübersicht</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-100">Kritische HzE-Fälle</h2>
                <p className="mt-1 text-sm text-slate-400">Zeige 20 Fälle von {filteredFaelle.length} in der operativen Liste.</p>
              </div>
              <div className="rounded-full bg-slate-900/80 px-4 py-2 text-sm text-slate-300">Operative Steuerung</div>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-950/80">
              <div className="max-h-[46rem] overflow-y-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-slate-900/90 text-slate-400">
                    <tr>
                      <th className="px-4 py-4">Fall-ID</th>
                      <th className="px-4 py-4">Wohnort</th>
                      <th className="px-4 py-4">Risiko</th>
                      <th className="px-4 py-4">Kosten</th>
                      <th className="px-4 py-4">Zustand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFaelle.slice(0, 20).map((fall) => (
                      <tr
                        key={fall.id}
                        className={`cursor-pointer border-t border-slate-800/80 transition hover:bg-slate-900/80 ${selectedFall.id === fall.id ? 'bg-slate-900/80 ring-1 ring-cyan-500/30' : ''}`}
                        onClick={() => setSelectedFall(fall)}
                      >
                        <td className="px-4 py-4 font-medium text-slate-100">{fall.id}</td>
                        <td className="px-4 py-4 text-slate-300">{fall.wohnort}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${risikofarbe[fall.risiko]}`}>
                            {fall.risiko}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <Badge label={fall.kostenstatus} style={kostenfarbe[fall.kostenstatus]} />
                        </td>
                        <td className="px-4 py-4 text-slate-300">{fall.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="section-card">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Einzelfallakte</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">{selectedFall.bezug}</h2>
                <p className="mt-2 text-slate-400">Fall-ID: {selectedFall.id}</p>
              </div>
              {selectedFall.id === 'HZE-118' && (
                <div className="mt-4 rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100 shadow-[0_0_30px_rgba(248,113,113,0.12)]">
                  <p className="font-semibold text-red-200">Akute Eskalation</p>
                  <p className="mt-2 leading-6">Stationäre Unterbringung droht. Schulabsenz &gt; 21 Tage, Maßnahmeabbruch erkannt, Budgetüberschreitung Nordcluster.</p>
                </div>
              )}
              <div className="mt-6 space-y-4 rounded-3xl border border-slate-800/90 bg-slate-900/80 p-5">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Bezirk</span>
                    <span className="font-semibold text-slate-100">{selectedFall.wohnort}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Alter</span>
                    <span className="font-semibold text-slate-100">{selectedFall.alter}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Träger</span>
                    <span className="font-semibold text-slate-100">{selectedFall.traeger}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Risikostatus</span>
                    <Badge label={selectedFall.risiko} style={risikofarbe[selectedFall.risiko]} />
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Kostenstatus</span>
                    <Badge label={selectedFall.kostenstatus} style={kostenfarbe[selectedFall.kostenstatus]} />
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Monatskosten</span>
                    <span className="font-semibold text-slate-100">€ {Math.round(selectedFall.kostenverlauf[selectedFall.kostenverlauf.length - 1]).toLocaleString('de-DE')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Jahreskosten</span>
                    <span className="font-semibold text-slate-100">€ {selectedFall.jahreskosten.toLocaleString('de-DE')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Letzte Aktualisierung</span>
                    <span>{selectedFall.letzteAktualisierung}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Verantwortliche</span>
                    <span>{selectedFall.verantwortliche}</span>
                  </div>
                </div>
              </div>

              <div className="section-card">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Monatskosten</p>
                <div className="mt-4 flex items-end gap-2 h-32">
                  {selectedFall.kostenverlauf.map((wert, index) => {
                    const max = Math.max(...selectedFall.kostenverlauf);
                    return (
                      <div key={index} className="relative flex-1 rounded-full bg-slate-900/90 transition-all duration-300 hover:bg-cyan-500/70" style={{ height: `${(wert / max) * 100}%` }}>
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-400">M{index + 1}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-400">
                  {selectedFall.kostenverlauf.map((wert, index) => (
                    <div key={`label-${index}`} className="rounded-3xl bg-slate-950/80 p-2 text-center">{wert}€</div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-slate-400">Aktuelle Entwicklung zeigt operative Belastung und Steuerungsbedarf über sechs Monate.</p>
              </div>

              <div className="section-card">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Risikofaktoren</p>
                <div className="mt-4 space-y-2">
                  {selectedFall.risikofaktoren.map((faktor) => (
                    <div key={faktor} className="rounded-3xl border border-slate-800/90 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">{faktor}</div>
                  ))}
                </div>
              </div>

              <div className="section-card">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">ASCEND Empfehlung</p>
                <div className="mt-4 rounded-3xl border border-cyan-500/20 bg-slate-950/80 p-4 text-sm text-slate-300 shadow-[0_0_30px_rgba(22,211,255,0.05)]">
                  <p className="font-semibold text-slate-100">Empfehlung zur nächsten Maßnahme</p>
                  <p className="mt-3 leading-6">{selectedFall.empfehlung}</p>
                </div>
              </div>

              <div className="section-card">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Maßnahmenstatus</p>
                <div className="mt-4 space-y-2">
                  {selectedFall.massnahmen.map((massnahme) => (
                    <div key={massnahme} className="rounded-3xl border border-slate-800/90 bg-slate-950/80 px-4 py-3 text-sm text-slate-300 transition duration-300 hover:border-cyan-500/40 hover:bg-slate-900/80">{massnahme}</div>
                  ))}
                </div>
              </div>

              <div className="section-card">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Interventionsstatus</p>
                <div className="mt-5 rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5">
                  <p className="text-sm text-slate-300">Phase: <span className="font-semibold text-slate-100">{selectedFall.intervention.phase}</span></p>
                  <p className="mt-3 text-lg font-semibold text-slate-100">{selectedFall.intervention.status}</p>
                  <p className="mt-4 text-sm text-slate-400">Letzte Maßnahme: {selectedFall.intervention.letzteMassnahme}</p>
                  <p className="mt-2 text-sm text-slate-400">Prognose: {selectedFall.intervention.prognose}</p>
                  <div className="mt-5 h-2 w-full rounded-full bg-slate-800">
                    <div className="h-full w-3/4 rounded-full bg-cyan-500" />
                  </div>
                </div>
              </div>

              <div className="section-card">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Fallhistorie</p>
                <div className="mt-5 space-y-4">
                  {selectedFall.historie.map((item) => (
                    <div key={`${selectedFall.id}-${item.datum}-${item.bereich}`} className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-4">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
                        <span>{item.datum}</span>
                        <span>{item.bereich}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">{item.beschreibung}</p>
                      <p className="mt-2 text-sm text-slate-400">Status: {item.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
