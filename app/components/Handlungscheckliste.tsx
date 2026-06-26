'use client';

import { useEffect, useState } from 'react';
import { konkreteHandlungsschritte, type CaseData } from '../../lib/cases';

type State = { done: boolean[]; custom: string[]; customDone: boolean[] };

export default function Handlungscheckliste({ fall, compact = false }: { fall: CaseData; compact?: boolean }) {
  const base = konkreteHandlungsschritte(fall);
  const key = `hze-checkliste-${fall.id}`;
  const [s, setS] = useState<State>({ done: base.map(() => false), custom: [], customDone: [] });
  const [input, setInput] = useState('');

  useEffect(() => {
    let next: State = { done: base.map(() => false), custom: [], customDone: [] };
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (raw) {
        const p = JSON.parse(raw);
        next = {
          done: base.map((_, i) => Boolean(p.done?.[i])),
          custom: Array.isArray(p.custom) ? p.custom : [],
          customDone: Array.isArray(p.customDone) ? p.customDone : [],
        };
      }
    } catch { /* ignore */ }
    setS(next);
    setInput('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fall.id]);

  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(s)); } catch { /* ignore */ }
  }, [s, key]);

  const toggle = (i: number) => setS((p) => ({ ...p, done: p.done.map((v, j) => (j === i ? !v : v)) }));
  const toggleC = (i: number) => setS((p) => ({ ...p, customDone: p.customDone.map((v, j) => (j === i ? !v : v)) }));
  const add = () => {
    const t = input.trim(); if (!t) return;
    setS((p) => ({ ...p, custom: [...p.custom, t], customDone: [...p.customDone, false] }));
    setInput('');
  };
  const removeC = (i: number) => setS((p) => ({
    ...p, custom: p.custom.filter((_, j) => j !== i), customDone: p.customDone.filter((_, j) => j !== i),
  }));

  const erledigt = s.done.filter(Boolean).length + s.customDone.filter(Boolean).length;
  const gesamt = base.length + s.custom.length;
  const ts = compact ? 'text-[11px]' : 'text-[13px]';

  const Item = ({ text, checked, onToggle, onRemove }: { text: string; checked: boolean; onToggle: () => void; onRemove?: () => void }) => (
    <li className="flex items-start gap-2.5">
      <button type="button" onClick={onToggle} aria-pressed={checked}
        className={`mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded border transition ${checked ? 'border-cyan-400 bg-cyan-500/30 text-cyan-200' : 'border-slate-600 text-transparent hover:border-cyan-400'}`}>
        <span className="text-[9px] font-black leading-none">✓</span>
      </button>
      <span className={`${ts} leading-snug ${checked ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{text}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} className="ml-auto flex-none text-[11px] text-slate-600 hover:text-rose-300">✕</button>
      )}
    </li>
  );

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-slate-900/60 p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-300">Konkrete Handlungsschritte — was jetzt zu tun ist</span>
        <span className="whitespace-nowrap rounded-md bg-slate-800/70 px-2 py-0.5 text-[10px] font-bold text-slate-300">{erledigt}/{gesamt} erledigt</span>
      </div>
      <ol className="space-y-2">
        {base.map((text, i) => <Item key={`b${i}`} text={text} checked={s.done[i] ?? false} onToggle={() => toggle(i)} />)}
        {s.custom.map((text, i) => <Item key={`c${i}`} text={text} checked={s.customDone[i] ?? false} onToggle={() => toggleC(i)} onRemove={() => removeC(i)} />)}
      </ol>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder="Eigenen Schritt ergänzen …"
          className={`flex-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 ${ts} text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none`}
        />
        <button type="button" onClick={add}
          className="whitespace-nowrap rounded-md bg-cyan-500/20 px-3 py-1.5 text-[11px] font-bold text-cyan-200 ring-1 ring-cyan-500/40 transition hover:bg-cyan-500/30">
          + Hinzufügen
        </button>
      </div>
    </div>
  );
}
