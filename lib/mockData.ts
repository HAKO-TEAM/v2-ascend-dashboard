export type Risikostatus = 'Kritisch' | 'Hoch' | 'Mittel' | 'Beobachtung' | 'Stabil';
export type Kostenstatus = 'Grün' | 'Gelb' | 'Rot';
export type MassnahmeStatus = 'Geplant' | 'In Umsetzung' | 'Abgeschlossen' | 'Überprüfung';

export interface FallHistoryEntry {
  datum: string;
  bereich: string;
  beschreibung: string;
  status: string;
}

export interface InterventionStatus {
  phase: string;
  status: string;
  letzteMassnahme: string;
  prognose: string;
}

export interface Fall {
  id: string;
  bezug: string;
  alter: number;
  wohnort: string;
  risiko: Risikostatus;
  kostenstatus: Kostenstatus;
  jahreskosten: number;
  prioritaet: number;
  status: string;
  zustimmung: number;
  massnahmen: string[];
  risikofaktoren: string[];
  kostenverlauf: number[];
  empfehlung: string;
  letzteAktualisierung: string;
  verantwortliche: string;
  traeger: string;
  historie: FallHistoryEntry[];
  intervention: InterventionStatus;
  eskalationsindex: number;
}

const risikostatus: Risikostatus[] = ['Kritisch', 'Hoch', 'Mittel', 'Beobachtung', 'Stabil'];
const kostenstatus: Kostenstatus[] = ['Rot', 'Gelb', 'Grün'];
const wohnorte = ['Nordstadt', 'Südquartier', 'Ostfeld', 'Westpark', 'Mittelstadt'];
const verantwortliche = ['Sozialarbeit A', 'Teamleitung B', 'Fachdienst C', 'Koordination D', 'Steuerung E'];
const traegerListe = ['Jugendhilfe Nord', 'Sozialdienst Mitte', 'Trägernetz Süd', 'Koordination Ost', 'Service West'];
const massnahmenPool = [
  'Familienberatung',
  'Tagesgruppe',
  'Schulbegleitung',
  'Intensivbetreuung',
  'Budgetcoaching',
  'Psychosoziale Unterstützung',
  'Hausbesuche',
  'Netzwerkkoordination',
];
const riskFactorsPool = [
  'Instabile Wohnsituation',
  'fehlende Tagesstruktur',
  'schwierige Schulintegration',
  'hohe psychosoziale Belastung',
  'unzureichende Netzwerkkoordination',
  'finanzielle Drucklage',
  'hohes Eskalationspotenzial',
];
const statuses = ['Offen', 'In Bearbeitung', 'Wechselnd', 'Stabilisiert'];
const historyBereiche = ['Sozialarbeit', 'Finanzsteuerung', 'Schule', 'Psychologie', 'Koordination', 'Partnernetz'];
const historyEvents = [
  'Fachdienstgespräch geführt',
  'Dringende Sitzung terminiert',
  'Budgetfreigabe überprüft',
  'Vor-Ort-Besuch geplant',
  'Kooperationspartner eingebunden',
  'Risikoeinschätzung aktualisiert',
];
const interventionPhasen = ['Initiale Analyse', 'Maßnahmenplanung', 'Umsetzung', 'Monitoring', 'Review'];
const prognosen = ['Stabilisierend', 'Risiko bleibt hoch', 'Bessere Budgetlage erwartet', 'Kurzfristige Entlastung möglich'];

function getStatusByRisk(risk: Risikostatus): Kostenstatus {
  if (risk === 'Kritisch') return 'Rot';
  if (risk === 'Hoch') return 'Gelb';
  return 'Grün';
}

function getRiskByIndex(index: number): Risikostatus {
  return risikostatus[index % risikostatus.length];
}

function getRandomMassnahmen(index: number) {
  const count = 2 + (index % 4);
  return Array.from({ length: count }, (_, idx) => massnahmenPool[(index + idx) % massnahmenPool.length]);
}

function getFallHistorie(index: number) {
  return Array.from({ length: 4 }, (_, idx) => ({
    datum: new Date(Date.now() - (idx * 4 + (index % 5)) * 86400000).toLocaleDateString('de-DE'),
    bereich: historyBereiche[(index + idx) % historyBereiche.length],
    beschreibung: historyEvents[(index + idx) % historyEvents.length],
    status: statuses[(index + idx) % statuses.length],
  }));
}

function getIntervention(index: number) {
  return {
    phase: interventionPhasen[index % interventionPhasen.length],
    status: ['Stark priorisiert', 'Plan folgt', 'Aktiv', 'Überwachung', 'Abschlussphase'][index % 5],
    letzteMassnahme: massnahmenPool[(index + 2) % massnahmenPool.length],
    prognose: prognosen[index % prognosen.length],
  };
}

function getRiskFactors(index: number) {
  return Array.from({ length: 3 }, (_, idx) => riskFactorsPool[(index + idx) % riskFactorsPool.length]);
}

function getKostenverlauf(index: number, base: number) {
  const monthBase = Math.round(base / 12);
  return Array.from({ length: 6 }, (_, idx) => Math.round(monthBase * (0.85 + ((index + idx) % 6) * 0.05)));
}

function getEmpfehlung(index: number) {
  const options = [
    'Sofortige Steuerungsrunde mit Trägernetz einberufen.',
    'Intensivbetreuung verstärken und Verlegung prüfen.',
    'Budgetnachsteuerung für Quartal 3 vorsehen.',
    'Zusätzliche Familienberatung einsetzen.',
    'Interne Lagebesprechung zur Eskalationsminderung starten.',
  ];
  return options[index % options.length];
}

const DEFAULT_MOCK_SIZE = Number(process.env.MOCK_SIZE ?? 60);

function generateFaelle(size: number): Fall[] {
  return Array.from({ length: size }, (_, index) => {
    const risk = getRiskByIndex(index);
    const kosten = getStatusByRisk(risk);
    const jahreskosten = Math.round(18000 + (index % 12) * 1200 + (risk === 'Kritisch' ? 9200 : risk === 'Hoch' ? 5600 : 2600));
    return {
      id: `HZE-${index + 1}`,
      bezug: `Fall ${index + 1}`,
      alter: 7 + (index % 11),
      wohnort: wohnorte[index % wohnorte.length],
      risiko: risk,
      kostenstatus: kosten,
      jahreskosten,
      prioritaet: (index % 5) + 1,
      status: statuses[index % statuses.length],
      zustimmung: 65 + (index % 31),
      massnahmen: getRandomMassnahmen(index),
      risikofaktoren: getRiskFactors(index),
      kostenverlauf: getKostenverlauf(index, jahreskosten),
      empfehlung: getEmpfehlung(index),
      letzteAktualisierung: new Date(Date.now() - (index % 30) * 86400000).toLocaleDateString('de-DE'),
      verantwortliche: verantwortliche[index % verantwortliche.length],
      traeger: traegerListe[index % traegerListe.length],
      historie: getFallHistorie(index),
      intervention: getIntervention(index),
      eskalationsindex: index % 5,
    } as Fall;
  });
}

export function getData(size: number = DEFAULT_MOCK_SIZE) {
  const faelle = generateFaelle(size);
  const reportData = {
    monat: 'Mai 2026',
    budget: 1560000,
    einsparpotential: 128000,
    fallzahl: faelle.length,
    kritischeFaelle: faelle.filter((fall) => fall.risiko === 'Kritisch').length,
    hoheFaelle: faelle.filter((fall) => fall.risiko === 'Hoch').length,
    stabileFaelle: faelle.filter((fall) => fall.risiko === 'Stabil').length,
    kpis: [
      { label: 'Aktive Hochrisiko-Fälle', value: String(faelle.length), delta: '+6 %', tone: 'neutral' },
      { label: 'Budgetauslastung', value: '92 %', delta: '-3 %', tone: 'good' },
      { label: 'Eskalationsdruck', value: '18 Fälle', delta: '+2', tone: 'alert' },
      { label: 'Interventions-Deckung', value: '84 %', delta: '+5 %', tone: 'good' },
      { label: 'Politische Steuerung', value: 'Priorität 1', delta: '', tone: 'neutral' },
      { label: 'Haushaltswirkung', value: '€ 128 k', delta: '+12 %', tone: 'good' },
    ],
    budgetWarnungen: [
      { title: 'Budget 2. Quartal', level: 'Hoch', detail: '4,8 % über Plan', impact: 'Dringende Nachsteuerung in Trägernetz Süd' },
      { title: 'Personalkosten', level: 'Mittel', detail: '7 % Steigerung durch Zusatzdienstleistungen', impact: 'Einsparungspotenzial bei Diensten prüfen' },
      { title: 'Investitionsrückstand', level: 'Niedrig', detail: 'Geplante IT-Unterstützung verzögert', impact: 'Politische Freigabe bis Juni erforderlich' },
    ],
    eskalationsfeed: [
      { fallId: 'HZE-12', typ: 'Dringende Verlegung', zeit: 'vor 45 Min', status: 'Kritisch', beschreibung: 'Schulbegleitung kann kurzfristig nicht gesichert werden.' },
      { fallId: 'HZE-87', typ: 'Haushaltsanpassung', zeit: 'vor 1 Std', status: 'Hoch', beschreibung: 'Kostensteigerung durch zusätzliche Heimunterbringung.' },
      { fallId: 'HZE-21', typ: 'Stakeholder-Meeting', zeit: 'vor 2 Std', status: 'Mittel', beschreibung: 'Abstimmung mit Träger und Schulamt geplant.' },
      { fallId: 'HZE-194', typ: 'Kooperation', zeit: 'gestern', status: 'Stabil', beschreibung: 'Interventionspfad mit Partnernetz erweitert.' },
    ],
    traegerPerformance: [
      { traeger: 'Jugendhilfe Nord', score: 88, risiko: 'Niedrig', aussage: 'Stabile Umsetzung, guter Informationsfluss' },
      { traeger: 'Sozialdienst Mitte', score: 78, risiko: 'Mittel', aussage: 'Budgetsteuerung optimieren' },
      { traeger: 'Trägernetz Süd', score: 72, risiko: 'Hoch', aussage: 'Intensivere Eskalationssteuerung erforderlich' },
      { traeger: 'Koordination Ost', score: 81, risiko: 'Mittel', aussage: 'Gute Vernetzung, Kapazität prüfen' },
    ],
    monatsvergleich: [
      { monat: 'Jan', budget: 1120000, faelle: Math.max(1, Math.round(faelle.length * 0.8)) },
      { monat: 'Feb', budget: 1180000, faelle: Math.max(1, Math.round(faelle.length * 0.82)) },
      { monat: 'Mär', budget: 1240000, faelle: Math.max(1, Math.round(faelle.length * 0.86)) },
      { monat: 'Apr', budget: 1320000, faelle: Math.max(1, Math.round(faelle.length * 0.9)) },
      { monat: 'Mai', budget: 1560000, faelle: faelle.length },
    ],
    policyActions: [
      { initiative: 'Frühe Unterstützungsstufen', status: 'In Vorbereitung', ziel: 'Reduktion Hochrisiko-Fälle um 8 %' },
      { initiative: 'Budget-Glättung', status: 'Beschlossen', ziel: 'Kontinuierliche Steuerung der Kostenlinie' },
      { initiative: 'Trägerperformance-Dashboard', status: 'Pilot', ziel: 'Transparenz für Steuerungskompass' },
    ],
    executiveSummary: {
      headline: 'Steuerungsplattform für kommunale Hochrisiko-Fälle',
      overview: 'Das ASCEND System unterstützt die operative Lageführung, priorisiert Eskalationsfälle und ermöglicht politische Steuerung über Budget- und Maßnahmendaten.',
      bullets: ['Simulierte Fälle mit Priorität und Haushaltseffekt', 'Budgetwarnungen und Eskalationsfeed', 'Trägerleistung mit Risiko-Score'],
    },
    charts: {
      kostenTrend: [120, 132, 115, 148, 138, 150],
      fallTrend: [18, 24, 21, 25, 28, 30],
      budgetTrend: [88, 92, 94, 96, 92, 90],
      eskalationsTrend: [16, 18, 20, 19, 17, 18],
      stabilisationsTrend: [56, 58, 60, 62, 64, 66],
    },
  } as const;

  return { faelle, reportData };
}
