"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

// Costs (millions) by rank 1..100
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
const formatM = (n) => `${Math.round(n / 1_000_0) / 100}M`; // 1 decimal place

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 1) All teams
        const { data: teams, error: tErr } = await supabase
          .from("teams")
          .select("id,name")
          .order("name", { ascending: true });
        if (tErr) throw tErr;

        // 2) All roster picks (team_id, player_id)
        const { data: picks, error: pErr } = await supabase
          .from("roster_picks")
          .select("team_id,player_id");
        if (pErr) throw pErr;

        // 3) All players (id -> ranking, name)
        const { data: players, error: plErr } = await supabase
          .from("players")
          .select("id,ranking,name");
        if (plErr) throw plErr;

        const playerById = new Map(players.map((p) => [p.id, p]));
        const picksByTeam = new Map();
        for (const r of picks) {
          const arr = picksByTeam.get(r.team_id) || [];
          arr.push(r.player_id);
          picksByTeam.set(r.team_id, arr);
        }

        const rows = (teams || []).map((t) => {
          const playerIds = picksByTeam.get(t.id) || [];
          const detailed = playerIds
            .map((pid) => playerById.get(pid))
            .filter(Boolean)
            .sort((a, b) => a.ranking - b.ranking);

          const spent = detailed.reduce((sum, p) => sum + costForRank(p.ranking), 0);
          return {
            teamId: t.id,
            name: t.name || "(unnamed)",
            picksCount: detailed.length,
            spent,
            picksList: detailed.map((p) => `#${p.ranking} ${p.name}`).join(", ")
          };
        });

        // Sort by spent (desc) then name
        rows.sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name));

        setRows(rows);
      } catch (e) {
        console.error(e);
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1>Leaderboard</h1>
      <p style={{ color: "#6b7280", marginTop: 0 }}>
        Demo leaderboard using total **budget spent** (points coming later). Costs use the custom table. 
        Save your team on <a href="/myteam">/myteam</a> to appear here.
      </p>

      {loading && <p>Loading…</p>}
      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}

      {!loading && !rows.length && !err && (
        <p style={{ color: "#6b7280" }}>No teams yet.</p>
      )}

      {!loading && rows.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "8px 10px" }}>#</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "8px 10px" }}>Team</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "8px 10px" }}>Picks</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "8px 10px" }}>Spent</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "8px 10px" }}>Selection</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.teamId}>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #f2f2f2" }}>{i + 1}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #f2f2f2" }}>{r.name}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #f2f2f2" }}>{r.picksCount}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #f2f2f2" }}>{formatM(r.spent)}</td>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #f2f2f2", color: "#6b7280" }}>
                  {r.picksList || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
