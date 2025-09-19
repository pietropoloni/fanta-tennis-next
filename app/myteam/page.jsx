"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

// ==== CONFIG ====
const MAX_PER_BAND = 3;
const MAX_BUDGET = 500_000_000; // 500M total budget
const STORAGE_KEY_PICKS = "ft.picks.v1";
const STORAGE_KEY_MYNAME = "ft.myTeamName.v1";

// ==== COSTS (millions) by rank 1..100 ====
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

// ==== HELPERS ====
const bandFor = (rank) => (rank <= 10 ? "A" : rank <= 30 ? "B" : rank <= 50 ? "C" : "D");
const costFor = (rank) => (COST_BY_RANK_M[rank - 1] || 0) * 1_000_000; // convert M -> absolute
const formatM = (n) => `${n / 1_000_000}M`;
const idOf = (p) => `${p.rank}|${p.name}`;

export default function MyTeamPage() {
  // players from Supabase
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  // picks = { A:[], B:[], C:[], D:[] }
  const [picks, setPicks] = useState({ A: [], B: [], C: [], D: [] });
  const [filter, setFilter] = useState("all");
  const [teamName, setTeamName] = useState("");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const triedAutoLoad = useRef(false);

  // 1) Fetch players from Supabase (public read)
  useEffect(() => {
    (async () => {
      setLoadingPlayers(true);
      setLoadErr("");
      const { data, error } = await supabase
        .from("players")
        .select("id,name,ranking")
        .order("ranking", { ascending: true });
      if (error) {
        setLoadErr(error.message);
      } else {
        // keep DB id so we can map roster picks
        setPlayers((data || []).map((r) => ({ id: r.id, rank: r.ranking, name: r.name })));
      }
      setLoadingPlayers(false);
    })();
  }, []);

  // 2) Load saved picks + team name from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PICKS);
      if (raw) setPicks(JSON.parse(raw));
      const tn = localStorage.getItem(STORAGE_KEY_MYNAME);
      if (tn) setTeamName(tn);
    } catch {}
  }, []);

  // 3) Persist picks on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PICKS, JSON.stringify(picks));
    } catch {}
  }, [picks]);

  // Derived values
  const spent = useMemo(() => {
    return Object.values(picks)
      .flat()
      .map((id) => parseInt(id.split("|")[0], 10))
      .map(costFor)
      .reduce((a, b) => a + b, 0);
  }, [picks]);

  const budgetLeft = MAX_BUDGET - spent;

  const filteredPlayers = useMemo(() => {
    if (filter === "all") return players;
    return players.filter((p) => bandFor(p.rank) === filter);
  }, [filter, players]);

  const isSelected = (id) => {
    return picks.A.includes(id) || picks.B.includes(id) || picks.C.includes(id) || picks.D.includes(id);
  };

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  function togglePick(p) {
    const id = idOf(p);
    const band = bandFor(p.rank);
    const already = isSelected(id);

    setPicks((prev) => {
      const next = { ...prev, A: [...prev.A], B: [...prev.B], C: [...prev.C], D: [...prev.D] };

      if (already) {
        next[band] = next[band].filter((x) => x !== id);
        showToast("Removed from picks.");
        return next;
      }

      // add
      if (next[band].length >= MAX_PER_BAND) {
        showToast(`Band ${band} is full (max ${MAX_PER_BAND}).`);
        return prev;
      }
      const cost = costFor(p.rank);
      if (budgetLeft - cost < 0) {
        showToast("Not enough budget for this player.");
        return prev;
      }
      next[band].push(id);
      showToast("Added to picks!");
      return next;
    });
  }

  function clearAll() {
    setPicks({ A: [], B: [], C: [], D: [] });
    showToast("All selections cleared.");
  }

  async function copyPicks() {
    const line = (b, label) => {
      const list = (picks[b] || [])
        .map((id) => {
          const [r, n] = id.split("|");
          return `${r} ${n} (${formatM(costFor(+r))})`;
        })
        .join(", ");
      return `${label}: ${list || "—"}`;
    };
    const text = [
      "FantaTennis — My Picks",
      line("A", "A (1–10)"),
      line("B", "B (11–30)"),
      line("C", "C (31–50)"),
      line("D", "D (51–100)"),
      `Total spent: ${formatM(spent)}`,
      `Budget left: ${formatM(budgetLeft)}`
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      showToast("Picks copied.");
    } catch {
      showToast("Copy failed.");
    }
  }

  function saveTeamName() {
    try {
      localStorage.setItem(STORAGE_KEY_MYNAME, teamName.trim());
      showToast("Team name saved.");
    } catch {
      showToast("Save failed.");
    }
  }

  // === Save to Supabase ===
  async function saveToCloud() {
    try {
      setSaving(true);
      setLoadErr("");

      if (!teamName.trim()) {
        showToast("Enter a team name first.");
        setSaving(false);
        return;
      }

      // must be signed in
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        window.location.href = "/signin";
        return;
      }

      // find or create team
      let teamId = null;

      const { data: existingTeams, error: selErr } = await supabase
        .from("teams")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1);
      if (selErr) throw selErr;

      if (existingTeams && existingTeams.length) {
        teamId = existingTeams[0].id;

        // ensure name is up to date
        const { error: updErr } = await supabase
          .from("teams")
          .update({ name: teamName.trim() })
          .eq("id", teamId);
        if (updErr) throw updErr;
      } else {
        const { data: insTeam, error: insErr } = await supabase
          .from("teams")
          .insert({ owner_id: user.id, name: teamName.trim() })
          .select("id")
          .single();
        if (insErr) throw insErr;
        teamId = insTeam.id;
      }

      // map selected "rank|name" to DB player IDs
      const keyToId = new Map(players.map((p) => [idOf(p), p.id]));
      const selectedKeys = Object.values(picks).flat();
      const playerIds = selectedKeys.map((k) => keyToId.get(k)).filter(Boolean);

      // replace roster picks: delete old, then insert new
      const { error: delErr } = await supabase.from("roster_picks").delete().eq("team_id", teamId);
      if (delErr) throw delErr;

      if (playerIds.length > 0) {
        const rows = playerIds.map((pid) => ({ team_id: teamId, player_id: pid }));
        const { error: insErr2 } = await supabase.from("roster_picks").insert(rows);
        if (insErr2) throw insErr2;
      }

      showToast("Saved to cloud.");
    } catch (e) {
      console.error(e);
      showToast("Save failed. Check policies / console.");
    } finally {
      setSaving(false);
    }
  }

  // === Load from Supabase ===
  async function loadFromCloud() {
    try {
      if (loadingPlayers) {
        showToast("Please wait for players to load…");
        return;
      }
      setSaving(true);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        window.location.href = "/signin";
        return;
      }

      // get my team
      const { data: team, error: tErr } = await supabase
        .from("teams")
        .select("id,name")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();
      if (tErr) throw tErr;
      if (!team) {
        showToast("No cloud team found.");
        return;
      }
      setTeamName(team.name || "");

      // get roster picks for that team
      const { data: rp, error: rpErr } = await supabase
        .from("roster_picks")
        .select("player_id")
        .eq("team_id", team.id);
      if (rpErr) throw rpErr;

      // map player IDs to "rank|name"
      const idToPlayer = new Map(players.map((p) => [p.id, p]));
      const next = { A: [], B: [], C: [], D: [] };
      for (const row of rp || []) {
        const p = idToPlayer.get(row.player_id);
        if (!p) continue;
        const k = idOf(p);
        const b = bandFor(p.rank);
        if (next[b].length < MAX_PER_BAND) next[b].push(k);
      }
      setPicks(next);
      showToast("Loaded from cloud.");
    } catch (e) {
      console.error(e);
      showToast("Load failed.");
    } finally {
      setSaving(false);
    }
  }

  // Auto-load from cloud once players are ready and user is signed in
  useEffect(() => {
    (async () => {
      if (triedAutoLoad.current) return;
      if (loadingPlayers) return;
      triedAutoLoad.current = true;

      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await loadFromCloud();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingPlayers]);

  const counts = {
    A: picks.A.length,
    B: picks.B.length,
    C: picks.C.length,
    D: picks.D.length
  };

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>My Team</h1>
      <p style={{ color: "#6b7280", marginTop: 0 }}>
        Pick up to <b>3 players per band</b>. Budget: <b>500M</b>. Costs use a custom table by rank.
      </p>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
        <button onClick={clearAll}>✕ Clear selections</button>
        <button onClick={copyPicks}>⧉ Copy picks</button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Your team name"
            style={{ padding: 8, minWidth: 220 }}
          />
          <button onClick={saveTeamName}>💾 Save team name</button>
          <button onClick={saveToCloud} disabled={saving || loadingPlayers}>
            {saving ? "Saving…" : "☁ Save to cloud"}
          </button>
          <button onClick={loadFromCloud} disabled={saving || loadingPlayers}>
            {saving ? "…" : "↓ Load from cloud"}
          </button>
        </div>
      </div>

      {/* Band / budget status */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
        <label>
          Filter band:&nbsp;
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="A">Band A (1–10)</option>
            <option value="B">Band B (11–30)</option>
            <option value="C">Band C (31–50)</option>
            <option value="D">Band D (51–100)</option>
          </select>
        </label>
        <div style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 999 }}>
          Budget left: <b>{formatM(budgetLeft)}</b>
        </div>
        <div style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 999 }}>
          A: <b>{counts.A}/3</b> &nbsp; B: <b>{counts.B}/3</b> &nbsp; C: <b>{counts.C}/3</b> &nbsp; D: <b>{counts.D}/3</b>
        </div>
      </div>

      <h3 style={{ margin: "16px 0 6px" }}>My Picks</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {Object.values(picks).flat().length === 0 ? (
          <div style={{ color: "#6b7280" }}>No picks yet. Click players below to add them to your squad.</div>
        ) : (
          Object.values(picks)
            .flat()
            .map((id) => {
              const [rank, name] = id.split("|");
              return { rank: +rank, name };
            })
            .sort((a, b) => a.rank - b.rank)
            .map((p) => (
              <div
                key={`sel-${p.rank}-${p.name}`}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 12
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    fontWeight: 700
                  }}
                >
                  {p.rank}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ color: "#6b7280", fontSize: 14 }}>
                    Cost {formatM(costFor(p.rank))} • Band {bandFor(p.rank)}
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Status */}
      <div style={{ marginTop: 8, color: "#6b7280" }}>
        {loadingPlayers
          ? "Loading players…"
          : loadErr
          ? `Error loading players: ${loadErr}`
          : `Showing ${filteredPlayers.length} players • Filter: ${filter === "all" ? "All" : `Band ${filter}`} • Budget left: ${formatM(
              budgetLeft
            )}. Click a player to add/remove (max 3 per band).`}
      </div>

      {/* Player grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
          margin: "16px 0 28px"
        }}
      >
        {!loadingPlayers &&
          !loadErr &&
          filteredPlayers.map((p) => {
            const selected = isSelected(idOf(p));
            const band = bandFor(p.rank);
            return (
              <button
                key={`${p.rank}-${p.name}`}
                onClick={() => togglePick(p)}
                style={{
                  textAlign: "left",
                  border: selected ? "2px solid #7dd3fc" : "1px solid #e5e7eb",
                  outline: "none",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "#fff"
                }}
                aria-pressed={selected}
                title={selected ? "Click to remove from picks" : "Click to add to picks"}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    fontWeight: 700
                  }}
                >
                  {p.rank}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ color: "#6b7280", fontSize: 14 }}>Cost {formatM(costFor(p.rank))}</div>
                </div>
                <div
                  aria-hidden="true"
                  style={{
                    fontWeight: 800,
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    display: "grid",
                    placeItems: "center",
                    background: band === "A" ? "#ef4444" : band === "B" ? "#3b82f6" : band === "C" ? "#10b981" : "#f59e0b",
                    color: "#fff"
                  }}
                >
                  {band}
                </div>
              </button>
            );
          })}
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="alert"
          style={{
            position: "fixed",
            right: 14,
            bottom: 14,
            background: "#111834",
            color: "#fff",
            border: "1px solid #2a3665",
            padding: "12px 14px",
            borderRadius: 12,
            boxShadow: "0 8px 30px rgba(0,0,0,.25)",
            zIndex: 100
          }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}
