"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const MAX_BUDGET = 500_000_000;
const neonBlue = "#00b3ff";
const yellow = "#fff200";

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
const formatM = (n) => `${Math.round(n / 100_000) / 10}M`;

export default function LeagueDetailPage() {
  const { id } = useParams();      // league id from URL
  const router = useRouter();

  const [status, setStatus] = useState("loading");
  const [err, setErr] = useState("");
  const [user, setUser] = useState(null);
  const [league, setLeague] = useState(null);

  const [rows, setRows] = useState([]);
  const [sortBy, setSortBy] = useState("pointsDesc"); // pointsDesc | nameAsc | spentDesc
  const [amMember, setAmMember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const origin = () => (typeof window !== "undefined" ? window.location.origin : "");
  const inviteLink = (code) => `${origin()}/join/${String(code || "").toUpperCase()}`;

  function showToast(m) { setToast(m); setTimeout(()=>setToast(""), 2000); }
  function copy(text) {
    navigator.clipboard.writeText(text).then(
      () => showToast("Copied!"),
      () => showToast("Copy failed.")
    );
  }
  function copyLink(code) { copy(inviteLink(code)); }

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) {
          router.push(`/signin?next=/leagues/${id}`);
          return;
        }
        setUser(data.user);
        await loadAll();
        setStatus("ready");
      } catch (e) {
        setErr(e.message || String(e));
        setStatus("ready");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadAll() {
    // League info
    const { data: L, error: lErr } = await supabase
      .from("leagues")
      .select("id,name,invite_code,owner_id,created_at")
      .eq("id", id)
      .maybeSingle();
    if (lErr) throw lErr;
    if (!L) { setErr("League not found."); return; }
    setLeague(L);

    // Members of this league
    const { data: members, error: mErr } = await supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", id);
    if (mErr) throw mErr;
    const memberIds = (members || []).map((r) => r.user_id);
    setAmMember(memberIds.includes(user?.id));

    // Teams owned by these users
    let teams = [];
    if (memberIds.length) {
      const { data: T, error: tErr } = await supabase
        .from("teams")
        .select("id,name,owner_id")
        .in("owner_id", memberIds);
      if (tErr) throw tErr;
      teams = T || [];
    }

    const teamIds = teams.map((t) => t.id);

    // Results per team (points)
    const { data: results, error: rErr } = await supabase
      .from("team_results")
      .select("team_id, points, tournament, event_date, tournament_id")
      .in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);
    if (rErr) throw rErr;

    // Current picks (for budget / band counts)
    const { data: picks, error: pErr } = await supabase
      .from("roster_picks")
      .select("team_id,player_id")
      .in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);
    if (pErr) throw pErr;

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
      // current selection + budget
      const pids = picksByTeam.get(t.id) || [];
      const plist = pids.map((pid) => playerById.get(pid)).filter(Boolean).sort((a,b)=>a.ranking-b.ranking);

      const spent = plist.reduce((sum, p) => sum + costForRank(p.ranking), 0);
      const budgetLeft = MAX_BUDGET - spent;
      const bandCounts = { A:0, B:0, C:0, D:0 };
      plist.forEach((p)=> { bandCounts[bandFor(p.ranking)]++; });

      // totals from team_results
      const res = (resultsByTeam.get(t.id) || []).slice();
      const totalPoints = res.reduce((s, r) => s + (r.points || 0), 0);
      res.sort((a,b)=> (b.event_date || "").localeCompare(a.event_date || "") || (b.tournament || "").localeCompare(a.tournament || ""));

      return {
        teamId: t.id,
        name: t.name || "(unnamed)",
        picksCount: plist.length,
        spent,
        budgetLeft,
        bandCounts,
        picksList: plist.map((p)=>`#${p.ranking} ${p.name}`).join(", "),
        totalPoints,
        breakdown: res, // [{tournament, points, event_date}]
      };
    });

    setRows(computed);
  }

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (sortBy === "pointsDesc") copy.sort((a,b)=> b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
    else if (sortBy === "spentDesc") copy.sort((a,b)=> b.spent - a.spent || a.name.localeCompare(b.name));
    else copy.sort((a,b)=> a.name.localeCompare(b.name));
    return copy;
  }, [rows, sortBy]);

  async function joinThisLeague() {
    try {
      setBusy(true);
      const { error } = await supabase.from("league_members").insert({ league_id: id, user_id: user.id });
      if (error && !String(error.message || "").includes("duplicate")) throw error;
      showToast("Joined.");
      await loadAll();
    } catch (e) {
      console.error(e);
      showToast("Join failed.");
    } finally { setBusy(false); }
  }

  async function leaveThisLeague() {
    try {
      setBusy(true);
      const { error } = await supabase.from("league_members").delete().eq("league_id", id).eq("user_id", user.id);
      if (error) throw error;
      showToast("Left league.");
      await loadAll();
    } catch (e) {
      console.error(e);
      showToast("Leave failed.");
    } finally { setBusy(false); }
  }

  if (status === "loading") return <main style={{maxWidth:1100,margin:"0 auto",padding:16}}><h1>League</h1><p>Loading…</p></main>;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>{league ? league.name : "League"}</h1>
      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}

      {league && (
        <div style={{
          background:"rgba(0,0,0,0.08)", border:`2px solid ${yellow}`, borderRadius:12, padding:12, marginBottom:12
        }}>
          <div style={{display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
            <div><b>Invite code:</b> <code style={{fontWeight:900}}>{league.invite_code}</code></div>
            <button
              onClick={() => copy(league.invite_code)}
              style={{border:`2px solid ${yellow}`,borderRadius:10,padding:"6px 10px",background:"transparent",color:yellow,cursor:"pointer"}}
            >
              Copy code
            </button>
            <button
              onClick={() => copyLink(league.invite_code)}
              style={{border:`2px solid ${yellow}`,borderRadius:10,padding:"6px 10px",background:"transparent",color:yellow,cursor:"pointer"}}
            >
              Copy link
            </button>
            {!amMember ? (
              <button onClick={joinThisLeague} disabled={busy}
                style={{border:`2px solid ${yellow}`,borderRadius:10,padding:"6px 10px",background:"transparent",color:yellow,cursor:"pointer"}}>
                Join
              </button>
            ) : (
              <button onClick={leaveThisLeague} disabled={busy}
                style={{border:`2px solid ${yellow}`,borderRadius:10,padding:"6px 10px",background:"transparent",color:yellow,cursor:"pointer"}}>
                Leave
              </button>
            )}
            <a href="/leagues" style={{ marginLeft: "auto", color: "#0b0", textDecoration: "underline" }}>← Back to leagues</a>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{
        display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",
        background:"rgba(0,0,0,0.08)",border:`2px solid ${yellow}`,borderRadius:12,padding:"8px 12px",marginBottom:12
      }}>
        <label>Sort:&nbsp;
          <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)}
            style={{background:neonBlue,color:yellow,border:`2px solid ${yellow}`,borderRadius:8,padding:"6px 8px",fontWeight:800}}>
            <option value="pointsDesc">Total Points (high → low)</option>
            <option value="nameAsc">Team name (A → Z)</option>
            <option value="spentDesc">Spent (high → low)</option>
          </select>
        </label>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <p>No teams yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["#", "Team", "Total Points", "Events", "Spent", "Budget Left", "A/B/C/D", "Current Selection", "Breakdown"].map((h) => (
                <th key={h} style={{ textAlign:"left", borderBottom:`2px solid ${yellow}`, padding:"8px 10px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r,i)=>(
              <tr key={r.teamId}>
                <td style={{ padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,0.25)" }}>{i+1}</td>
                <td style={{ padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,0.25)" }}>{r.name}</td>
                <td style={{ padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,0.25)" }}><b>{r.totalPoints}</b></td>
                <td style={{ padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,0.25)" }}>{r.breakdown.length}</td>
                <td style={{ padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,0.25)" }}>{formatM(r.spent)}</td>
                <td style={{ padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,0.25)" }}>{formatM(r.budgetLeft)}</td>
                <td style={{ padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,0.25)" }}>
                  A <b>{r.bandCounts.A}</b> &nbsp; B <b>{r.bandCounts.B}</b> &nbsp; C <b>{r.bandCounts.C}</b> &nbsp; D <b>{r.bandCounts.D}</b>
                </td>
                <td style={{ padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,0.25)", opacity:0.9 }}>
                  {r.picksList || "—"}
                </td>
                <td style={{ padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,0.25)" }}>
                  {r.breakdown.length === 0 ? "—" : (
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

      {/* Toast */}
      {toast && (
        <div role="alert" style={{
          position:"fixed", right:14, bottom:14, background:"#111834", color:"#fff",
          border:"1px solid #2a3665", padding:"12px 14px", borderRadius:12, boxShadow:"0 8px 30px rgba(0,0,0,.25)", zIndex:100
        }}>{toast}</div>
      )}
    </main>
  );
}
