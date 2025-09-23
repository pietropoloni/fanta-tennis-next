'use client';

import { useEffect, useState } from 'react';

export default function AtpCalendar() {
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [items, setItems]   = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/tennis/tournament/categories/3', { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`API ${res.status}: ${body.slice(0, 500)}`);
        }
        const data = await res.json();
        const groups = Array.isArray(data?.groups) ? data.groups : [];
        const list = groups.flatMap(g => g?.uniqueTournaments ?? []);
        setItems(list.slice(0, 12));
      } catch (e) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section style={{marginTop: 12}}>
      <h3 style={{margin: 0}}>ATP Calendar</h3>
      {loading && <p>Loading…</p>}
      {error && <p style={{whiteSpace:'pre-wrap', color:'crimson'}}>{error}</p>}
      {!loading && !error && (
        <ul style={{paddingLeft:18, margin:'8px 0'}}>
          {items.map(t => (<li key={t.id}>{t.name}</li>))}
        </ul>
      )}
    </section>
  );
}

