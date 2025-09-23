'use client';

import { useEffect, useState } from 'react';

export default function AtpCalendar() {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch('/api/tennis/tournament/category/3', { cache: 'no-store' });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`API ${res.status}: ${txt}`);
        }
        const json = await res.json();
        if (alive) setState({ loading: false, error: null, data: json });
      } catch (err) {
        if (alive) setState({ loading: false, error: err?.message || String(err), data: null });
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  if (state.loading) {
    return (
      <section className="p-4">
        <h2 className="text-xl font-semibold">ATP Calendar</h2>
        <p className="mt-2 text-sm opacity-70">Loading…</p>
      </section>
    );
  }

  if (state.error) {
    return (
      <section className="p-4">
        <h2 className="text-xl font-semibold">ATP Calendar</h2>
        <p className="mt-2 text-sm text-red-600">Error: {state.error}</p>
      </section>
    );
  }

  const groups = state.data?.groups ?? [];
  const tournaments = groups.flatMap(g =>
    (g.uniqueTournaments ?? []).map(t => ({ ...t, month: g.name }))
  );

  // De-duplicate by id and show the first 20 items
  const first20 = Array.from(new Map(tournaments.map(t => [t.id, t])).values()).slice(0, 20);

  return (
    <section className="p-4">
      <h2 className="text-xl font-semibold">ATP Calendar</h2>
      {first20.length === 0 ? (
        <p className="mt-2 text-sm opacity-70">No tournaments found.</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {first20.map(t => (
            <li key={t.id} className="rounded-2xl border p-4 shadow-sm">
              <div className="text-base font-medium">{t.name}</div>
              <div className="mt-1 text-sm opacity-70">
                {t.category?.name ?? 'ATP'}{t.month ? ` · ${t.month}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

