export type Ampelstatus = 'grün' | 'gelb' | 'rot';
export type Interventionsstatus = 'Monitoring' | 'Frühintervention' | 'ASCEND prüfen' | 'Akutintervention';
export type Kostenposition = {
  label: string;
  amount: number;
  category: string;
};

export type CaseData = {
  id: string;
  fallId: string;
  pseudonym: string;
  alter: number;
  geschlecht: string;
  stadtteil: string;
  ampelstatus: Ampelstatus;
  status: string;
  monatKostenGesamt: number;
  jahresKostenGesamt: number;
  eskalationsrisiko: number;
  stabilisierungspotential: number;
  reintegrationswahrscheinlichkeit: number;
  interventionsstatus: Interventionsstatus;
  massnahmenvorschlag: string;
  bearbeiterNotiz: string;
  begruendung: string;
  frist: string;
  naechsteMassnahme: string;
  erwarteteKostenwirkung: string;
  erwarteteRisikoreduktion: string;
  erwarteteKostensenkung: number;
  erwarteteRisikoreduktionProzent: number;
  letzteEskalation: string;
  letzteMassnahme: string;
  naechsterPrueftermin: string;
  risikofaktoren: string[];
  schutzfaktoren: string[];
  schulstatus: string;
  familienlage: string;
  psychologischeEinschaetzung: string;
  timeline: string[];
  kostenstellen: Record<string, number>;
  ascendEmpfehlung: string;
};

const round = (value: number) => Math.round(value);

const buildKostenstellen = (base: number, distribution: Array<{ label: string; category: string; share: number }>) => {
  const positions = distribution.map((position) => ({
    label: position.label,
    category: position.category,
    amount: round(base * position.share),
  }));
  const total = positions.reduce((sum, item) => sum + item.amount, 0);
  const delta = base - total;
  if (delta !== 0) {
    positions[positions.length - 1].amount += delta;
  }
  return positions;
};

const statusLabel = (ampel: Ampelstatus) => {
  if (ampel === 'rot') return 'Kritischer Interventionsbedarf';
  if (ampel === 'gelb') return 'Operatives Monitoring';
  return 'Stabilisiert';
};

const interventionsstatusLabel = (ampel: Ampelstatus): Interventionsstatus => {
  if (ampel === 'rot') return 'Akutintervention';
  if (ampel === 'gelb') return 'Frühintervention';
  return 'Monitoring';
};

const getRiskValues = (ampel: Ampelstatus, index: number) => {
  if (ampel === 'rot') {
    return {
      eskalationsrisiko: 80 + (index % 5) * 2,
      stabilisierungspotential: 62 + (index % 4) * 3,
      reintegrationswahrscheinlichkeit: 32 + (index % 4) * 4,
      erwarteteKostensenkung: 2800 + (index % 3) * 200,
      erwarteteRisikoreduktionProzent: 12 + (index % 4) * 2,
    };
  }
  if (ampel === 'gelb') {
    return {
      eskalationsrisiko: 48 + (index % 4) * 3,
      stabilisierungspotential: 52 + (index % 5) * 4,
      reintegrationswahrscheinlichkeit: 52 + (index % 4) * 5,
      erwarteteKostensenkung: 1800 + (index % 3) * 150,
      erwarteteRisikoreduktionProzent: 8 + (index % 3) * 2,
    };
  }
  return {
    eskalationsrisiko: 18 + (index % 4) * 2,
    stabilisierungspotential: 32 + (index % 5) * 3,
    reintegrationswahrscheinlichkeit: 70 + (index % 4) * 4,
    erwarteteKostensenkung: 900 + (index % 2) * 100,
    erwarteteRisikoreduktionProzent: 4 + (index % 3) * 2,
  };
};

const riskFactorsPool = [
  'fehlende Schulbeteiligung',
  'instabiles Familiensystem',
  'psychische Belastung',
  'Suchtbelastung',
  'Gewaltvorfall im Haushalt',
  'hohes Eskalationspotenzial',
  'sozialer Rückzug',
  'unzureichende Übergangsbegleitung',
];

const protectiveFactorsPool = [
  'stabile Betreuungsperson',
  'aktive Schulsozialarbeit',
  'positive Sportintegration',
  'Niedrigschwelliges Case-Management',
  'regionale Netzwerkstützung',
  'zusätzliche psychotherapeutische Begleitung',
];

const schoolStatusPool = [
  'Unregelmäßige Teilnahme',
  'Klassenkonflikte',
  'Prüfungsängste',
  'Nachmittagsbetreuung aktiv',
  'Wechsel zu individueller Förderung',
];

const familyStatusPool = [
  'Alleinerziehend, mehrfach belastet',
  'Familie mit Migrationshintergrund',
  'Mehrgenerationenhaushalt',
  'Instabile Wohnsituation',
  'Enger Bezug zu Kommune und Träger',
];

const psychologicalAssessments = [
  'Erhöhte Impulsivität, traumafokussierte Intervention empfohlen.',
  'Affektive Dysregulation, Bedarf an zeitnaher Krisenintervention.',
  'Resilienz in Teilbereichen, aber hohes Stressniveau.',
  'Verstärkte Vermeidungsstrategien, sozial-emotionale Förderung notwendig.',
  'Selbstwirksamkeit steigt, aber ein strukturierter Fachplan bleibt erforderlich.',
];

const fallnamen = [
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schulz', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schröder', 'Schwarz', 'Zimmermann', 'Braun', 'Hartmann',
];

const stadtteile = ['Nordstadt', 'Südquartier', 'Ostfeld', 'Westpark', 'Mittelstadt'];

const greenDistribution = [
  { label: 'Ambulante Hilfen', category: 'Leistung', share: 0.38 },
  { label: 'Psychologische / therapeutische Leistungen', category: 'Leistung', share: 0.16 },
  { label: 'Schul- & Integrationsmaßnahmen', category: 'Bildung', share: 0.11 },
  { label: 'Transport / Sicherheit / Logistik', category: 'Sicherheit', share: 0.08 },
  { label: 'Verwaltung & Fallmanagement', category: 'Verwaltung', share: 0.09 },
  { label: 'Eskalations- & Folgekosten', category: 'Risiko', share: 0.05 },
  { label: 'Präventions- & Stabilisierungskosten', category: 'Prävention', share: 0.09 },
  { label: 'Individualpädagogische Maßnahmen', category: 'Leistung', share: 0.06 },
  { label: 'Fachberatung / Fallkonferenz', category: 'Verwaltung', share: 0.04 },
  { label: 'Inobhutnahme / Krisenunterbringung', category: 'Sicherheit', share: 0.02 },
];

const yellowDistribution = [
  { label: 'Ambulante Hilfen', category: 'Leistung', share: 0.18 },
  { label: 'Psychologische / therapeutische Leistungen', category: 'Leistung', share: 0.15 },
  { label: 'Schul- & Integrationsmaßnahmen', category: 'Bildung', share: 0.12 },
  { label: 'Transport / Sicherheit / Logistik', category: 'Sicherheit', share: 0.09 },
  { label: 'Verwaltung & Fallmanagement', category: 'Verwaltung', share: 0.08 },
  { label: 'Eskalations- & Folgekosten', category: 'Risiko', share: 0.09 },
  { label: 'Präventions- & Stabilisierungskosten', category: 'Prävention', share: 0.06 },
  { label: 'Individualpädagogische Maßnahmen', category: 'Leistung', share: 0.13 },
  { label: 'Fachberatung / Fallkonferenz', category: 'Verwaltung', share: 0.06 },
  { label: 'Inobhutnahme / Krisenunterbringung', category: 'Sicherheit', share: 0.04 },
];

const redDistribution = [
  { label: 'Stationäre Unterbringung', category: 'Unterbringung', share: 0.34 },
  { label: 'Inobhutnahme / Krisenunterbringung', category: 'Unterbringung', share: 0.11 },
  { label: 'Psychologische / therapeutische Leistungen', category: 'Leistung', share: 0.16 },
  { label: 'Transport / Sicherheit / Logistik', category: 'Sicherheit', share: 0.11 },
  { label: 'Verwaltung & Fallmanagement', category: 'Verwaltung', share: 0.08 },
  { label: 'Eskalations- & Folgekosten', category: 'Risiko', share: 0.12 },
  { label: 'Präventions- & Stabilisierungskosten', category: 'Prävention', share: 0.06 },
  { label: 'Schul- & Integrationsmaßnahmen', category: 'Bildung', share: 0.06 },
  { label: 'Ambulante Hilfen', category: 'Leistung', share: 0.05 },
  { label: 'Fachberatung / Fallkonferenz', category: 'Verwaltung', share: 0.01 },
];

const makeCase = (i: number, ampel: Ampelstatus, base: number): CaseData => {
  const risk = getRiskValues(ampel, i);
  const stadtteil = stadtteile[i % stadtteile.length];
  const name = fallnamen[i % fallnamen.length];
  const structure = ampel === 'rot' ? redDistribution : ampel === 'gelb' ? yellowDistribution : greenDistribution;
  const kostenstellenArray = buildKostenstellen(base, structure);
  // convert array of positions to a simple map { label: amount }
  const kostenstellen = kostenstellenArray.reduce((acc: Record<string, number>, pos) => {
    acc[pos.label] = Number(pos.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  // ensure monatKostenGesamt equals the sum of kostenstellen (fallback to base if sum is 0)
  const monatSum = Object.values(kostenstellen).reduce((s, v) => s + Number(v || 0), 0) || base || 3500;
  const timelineBase = [
    'Erstbewertung abgeschlossen',
    'Statusbericht an Steuergruppe gesendet',
    'Maßnahmeplan aktualisiert',
    'Nächster Prüftermin terminiert',
  ];

  return {
    id: `HZE-${String(i).padStart(3, '0')}`,
    fallId: `HZE-${String(i).padStart(3, '0')}`,
    pseudonym: `Fam. ${name}`,
    alter: 10 + (i % 7),
    geschlecht: i % 2 ? 'Männlich' : 'Weiblich',
    stadtteil,
    ampelstatus: ampel,
    status: statusLabel(ampel),
    monatKostenGesamt: monatSum,
    jahresKostenGesamt: monatSum * 12,
    eskalationsrisiko: risk.eskalationsrisiko,
    stabilisierungspotential: risk.stabilisierungspotential,
    reintegrationswahrscheinlichkeit: risk.reintegrationswahrscheinlichkeit,
    interventionsstatus: interventionsstatusLabel(ampel),
    massnahmenvorschlag:
      ampel === 'rot'
        ? 'Intensiv-Interventionskonferenz und sichere Krisenbetreuung prüfen.'
        : ampel === 'gelb'
        ? 'Multiprofessionelles Monitoring und schulische Begleitung verstärken.'
        : 'Ambulantes Stabilisierungspaket fortführen.',
    bearbeiterNotiz: ampel === 'rot' ? 'Aktuelle Lage erhebt hohen Steuerungsbedarf.' : ampel === 'gelb' ? 'Regelmäßige Lageprüfungen erforderlich.' : 'Stabilisierung mit Fallmanagement beibehalten.',
    begruendung:
      ampel === 'rot'
        ? 'Gefährdungslage bleibt erhöht durch stationäre Platzanforderung und Gewaltindikatoren.'
        : ampel === 'gelb'
        ? 'Familiäre Belastung und Schulprobleme erfordern operative Frühintervention.'
        : 'Haushaltsführung und Reintegrationsressourcen deutlich verbessert.',
    frist: `bis ${15 + (i % 12)}. ${['Juni', 'Juli', 'August', 'September', 'Oktober'][i % 5]}`,
    naechsteMassnahme:
      ampel === 'rot'
        ? 'Verstärkte Krisenintervention und Sicherung durch ASCEND-Notfallpuffer.'
        : ampel === 'gelb'
        ? 'Koordination Schulbegleitung und sozialpädagogische Einbindung.'
        : 'Weiterführung des ambulanten Förderplans.',
    erwarteteKostenwirkung: ampel === 'rot' ? 'Reduktion durch dringende Fallkonferenz' : ampel === 'gelb' ? 'Kostenneutral durch bessere Steuerung' : 'Minimale Entlastung durch Stabilisierung',
    erwarteteRisikoreduktion: ampel === 'rot' ? 'Hoch durch Krisenintervention' : ampel === 'gelb' ? 'Mittelfristig spürbar' : 'Stabilisierung verstärkt',
    erwarteteKostensenkung: risk.erwarteteKostensenkung,
    erwarteteRisikoreduktionProzent: risk.erwarteteRisikoreduktionProzent,
    letzteEskalation: ampel === 'rot' ? 'Gewaltvorfall im häuslichen Umfeld' : ampel === 'gelb' ? 'Schwankende Schulteilnahme' : 'Gute Teilnahme am Case-Management',
    letzteMassnahme: ampel === 'rot' ? 'Intensivbetreuung installiert' : ampel === 'gelb' ? 'Familienberatung initiiert' : 'Kontakt zu Integrationsangeboten aufgebaut',
    naechsterPrueftermin: `${22 + (i % 6)}. ${['Juni', 'Juli', 'August', 'September', 'Oktober'][i % 5]}`,
    risikofaktoren: [
      riskFactorsPool[i % riskFactorsPool.length],
      riskFactorsPool[(i + 3) % riskFactorsPool.length],
      ampel === 'rot' ? 'Sicherheitsrelevante Eskalation' : 'Konzentrationsdefizite',
    ],
    schutzfaktoren: [
      protectiveFactorsPool[i % protectiveFactorsPool.length],
      protectiveFactorsPool[(i + 2) % protectiveFactorsPool.length],
    ],
    schulstatus: schoolStatusPool[i % schoolStatusPool.length],
    familienlage: familyStatusPool[i % familyStatusPool.length],
    psychologischeEinschaetzung: psychologicalAssessments[i % psychologicalAssessments.length],
    timeline: [
      timelineBase[0],
      ampel === 'rot' ? 'Notfallmaßnahmen ausgelöst' : ampel === 'gelb' ? 'Steuergruppe initiiert' : 'Stabilisierungsplan bestätigt',
      timelineBase[3],
    ],
    kostenstellen,
    ascendEmpfehlung:
      ampel === 'rot'
        ? 'Sofortige ASCEND-Interventionskonferenz ansetzen und Hochrisiko-Monitoring starten.'
        : ampel === 'gelb'
        ? 'Frühzeitige Situationsteuerung mit Fokus auf Schule und Familie.'
        : 'Weiterhin ambulante Begleitung mit Fokus auf Re-Integration.',
  };
};

export const defaultCases: CaseData[] = [
  ...Array.from({ length: 5 }, (_, i) => makeCase(i + 1, 'grün', 3400 + i * 650)),
  ...Array.from({ length: 8 }, (_, i) => makeCase(i + 6, 'gelb', 8500 + i * 900)),
  ...Array.from({ length: 7 }, (_, i) => makeCase(i + 14, 'rot', 18800 + i * 1900)),
];

// ─── FALLINDIVIDUELLE, KONKRETE HANDLUNGSSCHRITTE ("was ist jetzt zu tun") ─────
const fmtE = (n: number) => Math.round(n).toLocaleString('de-DE');
const dominantKostenstelle = (c: CaseData): string => {
  const ks = (c.kostenstellen && typeof c.kostenstellen === 'object') ? (c.kostenstellen as Record<string, number>) : {};
  const entries = Object.entries(ks);
  if (!entries.length) return '';
  return entries.sort((a, b) => Number(b[1]) - Number(a[1]))[0][0];
};

export function konkreteHandlungsschritte(c: CaseData): string[] {
  const steps: string[] = [];
  const name = (c.pseudonym || '').replace('Fam. ', '') || 'Familie';
  const kind = `${c.pseudonym} (${c.alter} J., ${String(c.geschlecht).toLowerCase()}, ${c.stadtteil})`;
  const rf = c.risikofaktoren || [];
  const sf = c.schutzfaktoren || [];
  const dom = dominantKostenstelle(c);
  const frist = c.frist || 'binnen 14 Tagen';
  const pr = c.naechsterPrueftermin || 'zum nächsten Hilfeplangespräch';
  const reHigh = c.reintegrationswahrscheinlichkeit >= 50;
  const eskHigh = c.eskalationsrisiko >= 65;
  const jahr = (c.erwarteteKostensenkung || 0) * 12;

  if (rf.some((x) => /gewalt|sicherheit/i.test(x)) && c.ampelstatus !== 'grün') {
    steps.push(`Schutz zuerst: § 8a-Gefährdungseinschätzung zu ${kind} ${frist} aktualisieren, „insoweit erfahrene Fachkraft" hinzuziehen und einen schriftlichen Sicherheitsplan mit der Familie ${name} vereinbaren; § 42-Inobhutnahme als Option vorhalten.`);
  } else if (c.ampelstatus === 'rot') {
    steps.push(`Akut-Fallkonferenz ${frist} einberufen (Fallführung, Träger, Schule); Steuerungsverantwortung und Eskalationspfad für ${kind} schriftlich festlegen.`);
  }

  if (/Stationär/i.test(dom)) {
    if (reHigh) {
      steps.push(`Rückführung planen: stationäre Hilfe (§ 34) schrittweise in ambulante Hilfe (§ 30 Erziehungsbeistand / § 31 SPFH) überführen — Belastungserprobungen ab sofort, verbindlicher Zieltermin im Hilfeplan (§ 36) bis ${pr}. Reintegrationschance ${c.reintegrationswahrscheinlichkeit} % nutzen; erwartete Entlastung rund ${fmtE(jahr)} €/Jahr.`);
    } else {
      steps.push(`Stationäre Hilfe (§ 34) auf Wirksamkeit prüfen: Hilfeplan (§ 36) mit messbaren Teilhabezielen schärfen, Verweildauer und Trägerleistung im Fachcontrolling bewerten — Überprüfung bis ${pr}.`);
    }
  } else if (eskHigh) {
    steps.push(`Eskalation ambulant→stationär verhindern: ambulante Hilfe intensivieren (§ 30 → § 31, Frequenz auf 2×/Woche), wöchentliche Lagebewertung statt Settingwechsel; Krisenrufbereitschaft mit dem Träger klären.`);
  } else {
    steps.push(`Stabilisierung sichern: laufende ambulante Hilfe fortführen, Wirkung im Hilfeplan (§ 36) bis ${pr} belegen und die Hilfe danach bedarfsgerecht zurückfahren.`);
  }

  const rfSteps: Record<string, string> = {
    'schul': `Schule: ${frist} Fallrunde mit Schule + Schulsozialarbeit zu ${name}; Anwesenheit wöchentlich monitoren, Bildungs- und Teilhabepaket sowie ggf. Schulbegleitung beantragen.`,
    'familiensystem': `Familiensystem: SPFH (§ 31) installieren bzw. auf 2 Termine/Woche erhöhen, Erziehungsfähigkeit im Hilfeplan neu bewerten und eine schriftliche Zielvereinbarung mit ${name} schließen.`,
    'psychisch': `Psychische Belastung: kinder-/jugendpsychiatrische Abklärung terminieren, § 35a (seelische Behinderung) prüfen und einen Therapieplatz absichern — Hintergrund: ${c.psychologischeEinschaetzung}`,
    'sucht': `Suchtbelastung: Suchtberatung verbindlich einbinden (Eltern und/oder Jugendliche/r) mit klarer Zielvereinbarung und Überprüfung im Hilfeplan.`,
    'rückzug': `Sozialer Rückzug: aufsuchende Arbeit 1×/Woche aufnehmen und Peer-/Sport-/Jugendtreff-Anbindung in ${c.stadtteil} aktivieren.`,
    'übergang': `Übergangsbegleitung: verbindlichen Übergabeplan (Schule→Beruf bzw. stationär→ambulant) mit Verantwortlichen und Terminen festlegen.`,
    'eskalation': `Eskalationsrisiko: engmaschige Hilfeplanung im 4-Wochen-Takt und Krisenleitfaden (Wer-macht-was) für ${name} hinterlegen.`,
  };
  let added = 0;
  for (const r of rf) {
    const key = Object.keys(rfSteps).find((k) => r.toLowerCase().includes(k));
    if (key && added < 2) { steps.push(rfSteps[key]); delete rfSteps[key]; added += 1; }
  }

  const fl = c.familienlage || '';
  if (/alleinerziehend/i.test(fl)) steps.push(`Entlastung der alleinerziehenden Bezugsperson: Tagesgruppe (§ 32)/OGS und Notbetreuung (§ 20) prüfen, Termine für ${name} bündeln.`);
  else if (/migrations/i.test(fl)) steps.push(`Sprachmittlung zu allen Gesprächen organisieren und kultursensible Beratung für ${name} sicherstellen.`);
  else if (/wohnsituation/i.test(fl)) steps.push(`Wohnsicherheit herstellen: § 16-Beratung und Wohnungsamt einschalten — stabile Wohnsituation ist Voraussetzung jeder weiteren Stabilisierung.`);
  else if (/mehrgeneration/i.test(fl)) steps.push(`Großeltern/Bezugspersonen im Mehrgenerationenhaushalt als Ressource verbindlich in die Hilfeplanung einbeziehen.`);

  if (sf.length) steps.push(`Ressource aktiv nutzen: „${sf[0]}"${sf[1] ? ` und „${sf[1]}"` : ''} fest in die Hilfeplanung einbinden und stützen.`);

  return steps.slice(0, 5);
}
