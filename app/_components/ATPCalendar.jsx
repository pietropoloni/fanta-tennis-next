'use client';
import { useEffect, useState } from 'react';

export default function ATPCalendar() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/tennis/categories', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Request failed');
        setData(json);
      } catch (e) {
        setErr(String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>ATP Calendar — loading…</div>;
  if (err) return <div>ATP Calendar — error: {err}</div>;

  const groups = Array.isArray(data?.groups) ? data.groups : [];

  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const nextMonthName = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toLocaleString('en-US', { month: 'long' });

  const current = groups.find(g => (g.name || '').toLowerCase() === monthName.toLowerCase());
  const next = groups.find(g => (g.name || '').toLowerCase() === nextMonthName.toLowerCase());

  function renderGroup(g) {
    if (!g?.uniqueTournaments?.length) return <div style={{ opacity: 0.8 }}>No tournaments listed.</div>;
    return (
      <ul style={{ margin: 0, paddingLeft: '1rem' }}>
        {g.uniqueTournaments.slice(0, 12).map(t => (
          <li key={t.id}>{t.name}</li>
        ))}
      </ul>
    );
  }

  return (
    <section style={{ border: '1px solid #e5e5e5', borderRadius: 12, padding: 16, marginTop: 24 }}>
      <h2 style={{ marginTop: 0 }}>ATP Calendar</h2>
      <div>
        <h3 style={{ marginBottom: 8 }}>{monthName}</h3>
        {renderGroup(current)}
      </div>
      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>{nextMonthName}</h3>
        {renderGroup(next)}
      </div>
    </section>
  );
}
