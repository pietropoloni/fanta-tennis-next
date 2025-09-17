"use client";
import { useEffect, useMemo, useState } from "react";

// ==== CONFIG (same rules as your HTML) ====
const MAX_PER_BAND = 3;
const MAX_BUDGET = 900_000_000; // 900M
const STORAGE_KEY_PICKS = "ft.picks.v1";
const STORAGE_KEY_MYNAME = "ft.myTeamName.v1";

// ==== DATA (your static Top 100 snapshot) ====
const PLAYERS = [
  {rank:1, name:"Jannik Sinner"},{rank:2, name:"Carlos Alcaraz"},{rank:3, name:"Alexander Zverev"},
  {rank:4, name:"Taylor Fritz"},{rank:5, name:"Jack Draper"},{rank:6, name:"Ben Shelton"},
  {rank:7, name:"Novak Djokovic"},{rank:8, name:"Alex de Minaur"},{rank:9, name:"Karen Khachanov"},
  {rank:10, name:"Lorenzo Musetti"},{rank:11, name:"Holger Rune"},{rank:12, name:"Casper Ruud"},
  {rank:13, name:"Daniil Medvedev"},{rank:14, name:"Tommy Paul"},{rank:15, name:"Andrey Rublev"},
  {rank:16, name:"Jakub Mensik"},{rank:17, name:"Frances Tiafoe"},{rank:18, name:"Alejandro Davidovich Fokina"},
  {rank:19, name:"Francisco Cerundolo"},{rank:20, name:"Arthur Fils"},{rank:21, name:"Jiri Lehecka"},
  {rank:22, name:"Tomas Machac"},{rank:23, name:"Ugo Humbert"},{rank:24, name:"Alexander Bublik"},
  {rank:25, name:"Grigor Dimitrov"},{rank:26, name:"Flavio Cobolli"},{rank:27, name:"Felix Auger-Aliassime"},
  {rank:28, name:"Stefanos Tsitsipas"},{rank:29, name:"Denis Shapovalov"},{rank:30, name:"Tallon Griekspoor"},
  {rank:31, name:"Brandon Nakashima"},{rank:32, name:"Alex Michelsen"},{rank:33, name:"Gabriel Diallo"},
  {rank:34, name:"Luciano Darderi"},{rank:35, name:"Cameron Norrie"},{rank:36, name:"Alexei Popyrin"},
  {rank:37, name:"Giovanni Mpetshi Perricard"},{rank:38, name:"Alexandre Muller"},{rank:39, name:"Sebastian Baez"},
  {rank:40, name:"Corentin Moutet"},{rank:41, name:"Nuno Borges"},{rank:42, name:"Miomir Kecmanovic"},
  {rank:43, name:"Camilo Ugo Carabelli"},{rank:44, name:"Jaume Munar"},{rank:45, name:"Joao Fonseca"},
  {rank:46, name:"Lorenzo Sonego"},{rank:47, name:"Roberto Bautista Agut"},{rank:48, name:"Zizou Bergs"},
  {rank:49, name:"Gael Monfils"},{rank:50, name:"Learner Tien"},{rank:51, name:"Benjamin Bonzi"},
  {rank:52, name:"Matteo Berrettini"},{rank:53, name:"Fabian Marozsan"},{rank:54, name:"Francisco Comesana"},
  {rank:55, name:"Marcos Giron"},{rank:56, name:"Daniel Altmaier"},{rank:57, name:"Hamad Medjedovic"},
  {rank:58, name:"Jordan Thompson"},{rank:59, name:"Tomas Martin Etcheverry"},{rank:60, name:"Jacob Fearnley"},
  {rank:61, name:"Damir Dzumhur"},{rank:62, name:"Marin Cilic"},{rank:63, name:"Marton Fucsovics"},
  {rank:64, name:"Matteo Arnaldi"},{rank:65, name:"Mattia Bellucci"},{rank:66, name:"Pedro Martinez"},
  {rank:67, name:"Reilly Opelka"},{rank:68, name:"Hubert Hurkacz"},{rank:69, name:"Terence Atmane"},
  {rank:70, name:"Quentin Halys"},{rank:71, name:"Aleksandar Kovacevic"},{rank:72, name:"Laslo Djere"},
  {rank:73, name:"Botic van de Zandschulp"},{rank:74, name:"Yunchaokete Bu"},{rank:75, name:"Sebastian Korda"},
  {rank:76, name:"Kamil Majchrzak"},{rank:77, name:"Adrian Mannarino"},{rank:78, name:"Mariano Navone"},
  {rank:79, name:"Arthur Cazaux"},{rank:80, name:"David Goffin"},{rank:81, name:"Christopher O'Connell"},
  {rank:82, name:"Arthur Rinderknech"},{rank:83, name:"Jesper de Jong"},{rank:84, name:"Ethan Quinn"},
  {rank:85, name:"Adam Walton"},{rank:86, name:"Luca Nardi"},{rank:87, name:"Roberto Carballes Baena"},
  {rank:88, name:"Juan Manuel Cerundolo"},{rank:89, name:"Vit Kopriva"},{rank:90, name:"Kei Nishikori"},
  {rank:91, name:"Alexander Shevchenko"},{rank:92, name:"Jenson Brooksby"},{rank:93, name:"Filip Misolic"},
  {rank:94, name:"Roman Safiullin"},{rank:95, name:"Aleksandar Vukic"},{rank:96, name:"Tristan Schoolkate"},
  {rank:97, name:"Dalibor Svrcina"},{rank:98, name:"Valentin Royer"},{rank:99, name:"Carlos Taberner"},
  {rank:100, name:"Mackenzie McDonald"}
];

// ==== HELPERS ====
const bandFor = (rank) => (rank <= 10 ? "A" : rank <= 30 ? "B" : rank <= 50 ? "C" : "D");
const costFor = (rank) => (101 - rank) * 1_000_000;
const formatM = (n) => `${n / 1_000_000}M`;
const idOf = (p) => `${p.rank}|${p.name}`;

export default function MyTeamPage() {
  // picks = { A:[], B:[], C:[], D:[] }
  const [picks, setPicks] = useState({ A: [], B: [], C: [], D: [] });
  const [filter, setFilter] = useState("all");
  const [teamName, setTeamName] = useState("");
  const [toast, setToast] = useState("");

  // load from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PICKS);
      if (raw) setPicks(JSON.parse(raw));
      const tn = localStorage.getItem(STORAGE_KEY_MYNAME);
      if (tn) setTeamName(tn);
    } catch {}
  }, []);

  // persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PICKS, JSON.stringify(picks));
    } catch {}
  }, [picks]);

  const spent = useMemo(() => {
    return Object.values(picks)
      .flat()
      .map((id) => parseInt(id.split("|")[0], 10))
      .map(costFor)
      .reduce((a, b) => a + b, 0);
  }, [picks]);

  const budgetLeft = MAX_BUDGET - spent;

  const filteredPlayers = useMemo(() => {
    if (filter === "all") return PLAYERS;
    return PLAYERS.filter((p) => bandFor(p.rank) === filter);
  }, [filter]);

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
      "FantaTennis — My Picks (snapshot)",
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
        Pick up to <b>3 players per band</b>. Budget: <b>900M</b>. Cost = <code>(101 - rank) × 1M</code>.
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
        </div>
      </div>

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

      <div style={{ marginTop: 8, color: "#6b7280" }}>
        Showing {filteredPlayers.length} players • Filter:{" "}
        {filter === "all" ? "All" : `Band ${filter}`} • Budget left: <b>{formatM(budgetLeft)}</b>. Click a player to add/remove.
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
        {filteredPlayers.map((p) => {
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
