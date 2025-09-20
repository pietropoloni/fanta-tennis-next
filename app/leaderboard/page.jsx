"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

// === Config/theme ===
const MAX_BUDGET = 500_000_000; // 500M
const neonBlue = "#00b3ff";
const yellow = "#fff200";

// Costs (millions) by rank 1..100 (custom table)
const COST_BY_RANK_M = [
  160,160,100,90,80,75,70,65,60,55,
  62,61,58,56,54,52,50,48,46,44,
  42,40,38,36,34,32,30,28,26,24,
  30,29,28,27,26,25,25,24,24,23,
  23,22,22,22,21,21,21,20,20,20,
  23,22,22,21,21,21,20,20,20,20,
  19,19,19,19,18,18,18,18,17,17,
  17,17,16,16,16,16,16,16,15,15,
  15,15,15,15,15,15,15,15,15,15,
  15,15,15,15,15,15,15,15,15,15
];
const costForRank = (r) => (COST_BY_RANK_M[r - 1] || 0) * 1_000_000;
const bandFor = (r) => (r <= 10 ? "A" : r <= 30 ? "B" : r <= 50 ? "C" : "D");
const formatM = (n) => `${Math.round(n / 100_000) / 10}M`; // 1 decimal place

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [sortBy, setSortBy] = useState("pointsDesc"); // pointsDesc | nameAsc | spentDesc

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 1) Teams
        const { data: teams, error: tErr } = await supabase
          .from("teams")
          .select("id,name");
        if (tErr) throw tErr;

        // 2) Totals per team (team_results)
        const { data: results, error: rErr } = await supabase
          .from("team_results")
          .select("team_id, points, tournament, event_date, tournament_id");
        if (rErr) throw rErr;

        // 3) Current roster picks (for selection + budget math)
        const { data: picks, error: pErr } = await supabase
          .from("roster_picks")
          .select("team_id,player_id");
        if (pErr) throw pErr;

        // 4) Players (ranking + name)
        const { data: players, error: plErr } = await supabase
          .from("players")
          .select("id,ranking,name");
        if (plErr) throw plErr;

        // Build maps
        const playerById = new Map(players.map((p) => [p.id, p]));
        const picksByTeam = new Map();
        for (const r of picks || []) {
          const arr = picksByTeam.get(r.team_id) || [];
          arr.push(r.player_id);
          picksByTeam.set(r.team_id, arr);
        }

        const resultsByTeam = new Map();
        for (const r of results || []) {
          const arr = resultsByTeam.get(r.team_id) || [];
          arr.push(r);
          resultsByTeam.set(r.team_id, arr);
        }

        const computed = (teams || []).map((t) => {
          // selection + budget
          const pids = picksByTeam.get(t.id) || [];
          const plist = pids
            .map((pid) => playerById.get(pid))
            .filter(Boolean)
            .sort((a, b) => a.ranking - b.ranking);

          const spent = plist.reduce((sum, p) => sum + costForRank(p.ranking), 0);
          const budgetLeft = MAX_BUDGET - spent;
          const bandCounts = { A: 0, B: 0, C: 0, D: 0 };
          plist.forEach((p) => { bandCounts[bandFor(p.ranking)]++; });

          // totals from team_results
          const res = (resultsByTeam.get(t.id) || []).slice();
          const totalPoints = res.reduce((s, r) => s + (r.points || 0), 0);
          res.sort((a, b) => (b.event_date || "").localeCompare(a.event_date || "") || (b.tournament || "").localeCompare(a.tournament || ""));

          return {
            teamId: t.id,
            name: t.name || "(unnamed)",
            picksCount: plist.length,
            spent,
            budgetLeft,
            bandCounts,
            picksList: plist.map((p) => `#${p.ranking} ${p.name}`).join(", "),
            totalPoints,
            breakdown: res, // [{tournament, points, event_date}]
          };
        });

        setRows(computed);
      } catch (e) {
        console.error(e);
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (sortBy === "pointsDesc") copy.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
    else if (sortBy === "nameAsc") copy.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "spentDesc") copy.sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name));
    return copy;
  }, [rows, sortBy]);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Leaderboard</h1>
      <p style={{ marginTop: 0 }}>
        Ranked by <b>Total Points</b> (from <code>team_results</code>). Use Admin → Results to add weekly scores.
      </p>

      {/* Controls */}
      <div style={{
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
        background: "rgba(0,0,0,0.08)", border: `2px solid ${yellow}`, borderRadius: 12, padding: "8px 12px", marginBottom: 12
      }}>
        <label>
          Sort:&nbsp;
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: neonBlue, color: yellow, border: `2px solid ${yellow}`,
              borderRadius: 8, padding: "6px 8px", fontWeight: 800
            }}
          >
            <option value="pointsDesc">Total Points (high → low)</option>
            <option value="nameAsc">Team name (A → Z)</option>
            <option value="spentDesc">Spent (high → low)</option>
          </select>
        </label>
      </div>

      {loading && <p>Loading…</p>}
      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}

      {!loading && !sorted.length && !err && (
        <p>No teams yet.</p>
      )}

      {!loading && sorted.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["#", "Team", "Total Points", "Events", "Spent", "Budget Left", "A/B/C/D", "Current Selection", "Breakdown"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    borderBottom: `2px solid ${yellow}`,
                    padding: "8px 10px"
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.teamId}>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.25)" }}>{i + 1}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.25)" }}>{r.name}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.25)" }}>
                  <b>{r.totalPoints}</b>
                </td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.25)" }}>
                  {r.breakdown.length}
                </td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.25)" }}>{formatM(r.spent)}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.25)" }}>{formatM(r.budgetLeft)}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.25)" }}>
                  A <b>{r.bandCounts.A}</b> &nbsp; B <b>{r.bandCounts.B}</b> &nbsp; C <b>{r.bandCounts.C}</b> &nbsp; D <b>{r.bandCounts.D}</b>
                </td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.25)", opacity: 0.9 }}>
                  {r.picksList || "—"}
                </td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.25)" }}>
                  {r.breakdown.length === 0 ? (
                    "—"
                  ) : (
                    <details>
                      <summary style={{ cursor: "pointer" }}>View</summary>
                      <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                        {r.breakdown.map((b) => (
                          <li key={`${b.tournament_id}-${b.event_date || b.tournament}`} style={{ lineHeight: 1.5 }}>
                            <b>{b.tournament}</b> — {b.points} pts {b.event_date ? `(${b.event_date})` : ""}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
