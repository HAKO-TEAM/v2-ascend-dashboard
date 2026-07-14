import Link from 'next/link';

export const metadata = {
  title: 'ASCEND · HzE-Steuerung — Leitfaden zum Demonstrator',
  description: 'Wie der HzE-Demonstrator aufgebaut ist, was zu sehen und zu steuern ist — und was die Vollversion mit echten Jugendamtsdaten leistet.',
};

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 ${className}`}>{children}</div>
);

const sichten: [string, string, string][] = [
  ['Executive Cockpit', 'Leitung / Überblick', 'Gesamtlage: Ampel-Verteilung, Kostentreiber, Kosten-Trajektorie (24 Monate Ist → 12 Monate Prognose) und das Budget fallgenau abgebildet.'],
  ['Fallsteuerung', 'Fachkraft / Team', 'Operatives Cockpit: alle Fälle nach Fallbestand, Suche, Filter, Priorisierung und Einzel-Fallakte mit Handlungsempfehlung.'],
  ['Frühwarnung', 'Steuerungsebene', 'Die Übergänge grün→gelb→rot: welche Fälle kippen, wo frühes Gegensteuern lohnt.'],
  ['Meta Steuerung', 'Fach-/Trägersteuerung', 'Kosten und Wirksamkeit je Träger, Muster über alle Fälle — Grundlage der outcome-basierten Trägersteuerung.'],
  ['Leitung Jugendamt', 'Amtsleitung / Kämmerei', 'Gesamtsteuerung: Fälle → Jahresbudget fallgenau verknüpft, je Hilfeart und Träger, bis zur Einzelakte.'],
];

export default function Leitfaden() {
  return (
    <main className="min-h-screen text-slate-100">
      {/* Kopfzeile */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-4 py-3">
          <Link href="/" className="flex items-center gap-3 transition hover:opacity-90">
            <div className="rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600 px-3 py-1.5 text-sm font-black tracking-[0.15em] text-white">ASCEND</div>
            <div className="hidden sm:block"><div className="text-sm font-bold text-slate-100">HzE-Steuerung</div><div className="text-[11px] text-slate-500">Pilot-Demonstrator · Leitfaden</div></div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600 px-3 py-1.5 text-xs font-bold text-white transition hover:scale-[1.03]">Zum Demonstrator →</Link>
            <Link href="/" className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-200">Übersicht</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1000px] px-6 py-10 sm:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-cyan-400">Leitfaden zum Demonstrator</p>
        <h1 className="mt-3 text-3xl font-black text-slate-50 sm:text-4xl">Hilfen zur Erziehung — steuern statt kürzen</h1>

        <section className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-300">
          <p>
            Die Hilfen zur Erziehung sind eine der am stärksten steigenden kommunalen Ausgaben — in einer Kommune mittlerer Größe schnell <b className="text-slate-100">40–50 Mio € pro Jahr</b>.
            Gesteuert wird heute meist reaktiv: Die teuren Fälle werden sichtbar, wenn sie bereits eskaliert sind.
          </p>
          <p>
            ASCEND dreht das um. Die Plattform analysiert KI-gestützt auf der <b className="text-slate-100">META-Ebene</b> die gesamte Fallstruktur und macht sichtbar,
            wo aus grün gelb und aus gelb rot wird — <b className="text-slate-100">bevor die Kosten entstehen</b>. Das Ziel: die richtige Hilfe früher und wirksamer, ohne Leistungsabbau.
          </p>
        </section>

        {/* Aufbau */}
        <h2 className="mt-10 border-b border-slate-800 pb-2 text-xl font-bold text-slate-100">So ist der Demonstrator aufgebaut</h2>
        <p className="mt-2 text-sm text-slate-400">Fünf Sichten, eine Datenbasis — durchgängig konsistent vernetzt.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {sichten.map(([t, z, d]) => (
            <Card key={t}>
              <div className="flex items-baseline justify-between gap-2"><div className="font-bold text-slate-100">{t}</div><div className="text-[11px] uppercase tracking-wider text-cyan-300/70">{z}</div></div>
              <p className="mt-1.5 text-sm text-slate-400">{d}</p>
            </Card>
          ))}
        </div>

        {/* Steuern */}
        <h2 className="mt-10 border-b border-slate-800 pb-2 text-xl font-bold text-slate-100">Was Sie im Demonstrator steuern können</h2>
        <ul className="mt-4 space-y-2 text-[15px] text-slate-300">
          <li className="flex gap-2"><span className="text-cyan-400">▸</span><span><b className="text-slate-100">Rolle wählen:</b> Fachkraft (eigener Fallbestand), Team (Sozialraum) oder Jugendamt (Gesamt).</span></li>
          <li className="flex gap-2"><span className="text-cyan-400">▸</span><span><b className="text-slate-100">Eintauchen:</b> über Filter (Ampel, Hilfeart, Träger) in jede Teilmenge — nie endloses Scrollen, immer Übersicht → Ausnahme → Einzelfall.</span></li>
          <li className="flex gap-2"><span className="text-cyan-400">▸</span><span><b className="text-slate-100">Jede Fallakte öffnen:</b> Kostenpositionen und eine fallindividuelle Handlungsempfehlung — „was jetzt zu tun ist".</span></li>
          <li className="flex gap-2"><span className="text-cyan-400">▸</span><span><b className="text-slate-100">Priorisieren:</b> die Arbeitsliste sortiert nach Dringlichkeit (Ampel + Eskalationsrisiko + Kosten).</span></li>
        </ul>

        {/* Datengrundlage */}
        <h2 className="mt-10 border-b border-slate-800 pb-2 text-xl font-bold text-slate-100">Datengrundlage — was Demonstrator ist, was Vollversion leistet</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card>
            <div className="text-sm font-bold text-slate-300">Demonstrator (Musterdaten)</div>
            <p className="mt-2 text-sm text-slate-400">Anonymisierte, synthetische Musterfälle einer fiktiven Pilotkommune, auf ein realistisches HzE-Jahresbudget kalibriert. Alle Fall-Einzeldaten sind fiktiv — er zeigt Aufbau und Wirkweise, keine echten Personen.</p>
          </Card>
          <Card className="border-emerald-500/25">
            <div className="text-sm font-bold text-emerald-300">Vollversion (Ihre Daten)</div>
            <p className="mt-2 text-sm text-slate-300">Kalibrierung auf Ihre echten Fallzahlen und Ihr Haushaltsbudget; tatsächliche Kosten je Fall und Träger, reale Hilfeverläufe und eine validierte 12-Monats-Prognose.</p>
          </Card>
        </div>
        <p className="mt-3 text-sm text-slate-400">Verarbeitet werden ausschließlich <b className="text-slate-100">anonymisierte Strukturdaten</b> — lesender Zugriff, <b className="text-slate-100">kein Schreibzugriff</b> auf Ihre Fachverfahren.</p>

        {/* Vollversion Vergleich */}
        <h2 className="mt-10 border-b border-slate-800 pb-2 text-xl font-bold text-slate-100">Demonstrator vs. Vollversion</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="pb-2 pr-4"></th><th className="pb-2 pr-4">Demonstrator</th><th className="pb-2">Vollversion</th></tr></thead>
            <tbody className="text-slate-300">
              {[['Mengengerüst', 'synthetische Musterfälle', 'Ihre echten Einzelfälle'], ['Fallkosten', 'modelliert, aufs Budget kalibriert', 'tatsächliche Kosten je Fall/Träger'], ['Verläufe', 'angenommene Ampel', 'reale Hilfeverläufe über die Zeit'], ['Prognose', 'illustrativ', 'validierte 12-Monats-Trajektorie'], ['Steuerung', 'illustrativ', 'operativ, auf realer Datenlage']].map((r) => (
                <tr key={r[0]} className="border-t border-slate-800/70"><td className="py-2 pr-4 font-semibold text-slate-200">{r[0]}</td><td className="py-2 pr-4 text-slate-400">{r[1]}</td><td className="py-2 text-cyan-200">{r[2]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Trajektorie — Kernstück */}
        <div className="mt-10 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 p-6" style={{ borderTop: '2px solid #06b6d4' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-400">Das Kernstück</p>
          <h2 className="mt-2 text-2xl font-black text-slate-50">Die Trajektorie: 24 Monate Analyse → validierte 12-Monats-Prognose</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
            In der Vollversion lernt ASCEND aus <b className="text-slate-100">24 Monaten tatsächlicher Kosten- und Verlaufsdaten</b>. Daraus entsteht keine grobe Hochrechnung,
            sondern eine <b className="text-slate-100">validierte Prognose für die kommenden 12 Monate</b> — in drei Steuerungsstufen (ohne Steuerung · mit Fallsteuerung · zusätzlich mit Trägersteuerung, Modul 4):
          </p>
          <ul className="mt-4 space-y-2 text-[15px] text-slate-300">
            <li className="flex gap-2"><span className="text-cyan-400">▸</span><span><b className="text-slate-100">Validiert statt behauptet (Backtesting):</b> Das Modell wird an der Vergangenheit geprüft — zurückliegende Monate werden „blind" vorhergesagt und mit dem tatsächlichen Verlauf verglichen. Die Treffergenauigkeit ist belegt.</span></li>
            <li className="flex gap-2"><span className="text-cyan-400">▸</span><span><b className="text-slate-100">Fallgenau:</b> je Fall eine Kosten- und Eskalationstrajektorie; je Hilfeart, je Träger und für das Gesamtbudget eine belastbare 12-Monats-Linie.</span></li>
            <li className="flex gap-2"><span className="text-cyan-400">▸</span><span><b className="text-slate-100">Frühwarnung mit Vorlauf:</b> die Prognose zeigt, welche heute grünen/gelben Fälle in den nächsten Monaten zu kippen drohen — dort setzt frühes, günstigeres Gegensteuern an.</span></li>
            <li className="flex gap-2"><span className="text-cyan-400">▸</span><span><b className="text-slate-100">Ein Bild für zwei Ebenen:</b> die Kämmerei erhält eine belastbare Budgetlinie, die Fachebene eine priorisierte Handlungsliste — beide auf derselben validierten Datenbasis.</span></li>
          </ul>
        </div>

        {/* Prinzip */}
        <h2 className="mt-10 border-b border-slate-800 pb-2 text-xl font-bold text-slate-100">Prinzip &amp; Datenschutz</h2>
        <ul className="mt-4 space-y-2 text-[15px] text-slate-300">
          <li className="flex gap-2"><span className="text-cyan-400">▸</span><span>ASCEND analysiert auf der META-Ebene und greift <b className="text-slate-100">lesend</b> auf anonymisierte Strukturdaten zu — kein Schreibzugriff.</span></li>
          <li className="flex gap-2"><span className="text-cyan-400">▸</span><span>Die fachliche Entscheidung bleibt vollständig im <b className="text-slate-100">Hilfeplanverfahren (§ 36 SGB VIII)</b> bei den Fachkräften.</span></li>
          <li className="flex gap-2"><span className="text-cyan-400">▸</span><span>ASCEND stärkt die <b className="text-slate-100">Steuerungs- und Gesamtverantwortung des Jugendamts (§ 79/§ 79a SGB VIII)</b>. Steuern statt kürzen — kein Leistungsabbau.</span></li>
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 px-7 py-3 text-sm font-black uppercase tracking-[0.1em] text-white shadow-[0_0_28px_rgba(56,189,248,0.45)] transition hover:scale-[1.03]">Demonstrator öffnen →</Link>
          <a href="https://derkaemmerer.de" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">Der Kämmerer ↗</a>
        </div>

        <footer className="mt-12 border-t border-slate-800 pt-6 text-[11px] text-slate-600">
          HAKO Beteiligungsgesellschaft mbH · Dresden · m.kosel@hako.team · ascend-demo.hako.team · kommunalreport.hako.team — Fall-Einzeldaten im Demonstrator sind anonymisiert/fiktiv.
        </footer>
      </div>
    </main>
  );
}
