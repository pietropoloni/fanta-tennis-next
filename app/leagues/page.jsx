"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

const neonBlue = "#00b3ff";
const yellow = "#fff200";

const box = {
  background: "rgba(0,0,0,0.08)",
  border: `2px solid ${yellow}`,
  borderRadius: 12,
  padding: 12,
};

export default function LeaguesPage() {
  const [status, setStatus] = useState("loading");
  const [err, setErr] = useState("");
  const [user, setUser] = useState(null);

  const [leagues, setLeagues] = useState([]);           // [{id,name,invite_code,owner_id,created_at}]
  const [memberMap, setMemberMap] = useState(new Map()); // league_id -> count
  const [amMember, setAmMember] = useState(new Set());   // set of league_ids I’m in

  const [newLeagueName, setNewLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const origin = () => (typeof window !== "undefined" ? window.location.origin : "");
  const inviteLink = (code) => `${origin()}/join/${String(code || "").toUpperCase()}`;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }
  function copy(text) {
    navigator.clipboard.writeText(text).then(
      () => showToast("Copied!"),
      () => showToast("Copy failed.")
    );
  }
  function copyLink(code) {
    copy(inviteLink(code));
  }

  // Require sign-in, then load data
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) {
          window.location.href = "/signin?next=/leagues";
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
  }, []);

  async function loadAll() {
    // leagues
    const { data: L, error: lErr } = await supabase
      .from("leagues")
      .select("id,name,invite_code,owner_id,created_at")
      .order("created_at", { ascending: false });
    if (lErr) throw lErr;

    // all memberships
    const { data: M, error: mErr } = await supabase
      .from("league_members")
      .select("league_id,user_id");
    if (mErr) throw mErr;

    // build counts + my set
    const counts = new Map();
    const mine = new Set();
    for (const r of M || []) {
      counts.set(r.league_id, (counts.get(r.league_id) || 0) + 1);
      if (r.user_id === user?.id) mine.add(r.league_id);
    }

    setLeagues(L || []);
    setMemberMap(counts);
    setAmMember(mine);
  }

  async function createLeague() {
    try {
      if (!newLeagueName.trim()) {
        showToast("Enter a league name.");
        return;
      }
      setBusy(true);
      const { data: ins, error } = await supabase
        .from("leagues")
        .insert({ name: newLeagueName.trim(), owner_id: user.id })
        .select("id,invite_code")
        .single();
      if (error) throw error;
      setNewLeagueName("");
      showToast(`League created. Code: ${ins.invite_code}`);
      await loadAll();
    } catch (e) {
      console.error(e);
      showToast("Create failed.");
    } finally {
      setBusy(false);
    }
  }

  async function joinLeague() {
    try {
      const code = (joinCode || "").trim().toUpperCase();
      if (!code) {
        showToast("Enter an invite code.");
        return;
      }
      setBusy(true);

      // find league by code
      const { data: L, error: fErr } = await supabase
        .from("leagues")
        .select("id,invite_code")
        .eq("invite_code", code)
        .maybeSingle();
      if (fErr) throw fErr;
      if (!L) {
        showToast("League not found.");
        return;
      }

      // insert membership (ignore dup)
      const { error: insErr } = await supabase
        .from("league_members")
        .insert({ league_id: L.id, user_id: user.id });
      if (insErr && !String(insErr.message || "").includes("duplicate")) throw insErr;

      setJoinCode("");
      showToast("Joined league!");
      await loadAll();
    } catch (e) {
      console.error(e);
      showToast("Join failed.");
    } finally {
      setBusy(false);
    }
  }

  async function leaveLeague(leagueId) {
    try {
      setBusy(true);
      const { error } = await supabase
        .from("league_members")
        .delete()
        .eq("league_id", leagueId)
        .eq("user_id", user.id);
      if (error) throw error;
      showToast("Left league.");
      await loadAll();
    } catch (e) {
      console.error(e);
      showToast("Leave failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteLeague(leagueId) {
    try {
      setBusy(true);
      const { error } = await supabase.from("leagues").delete().eq("id", leagueId);
      if (error) throw error;
      showToast("League deleted.");
      await loadAll();
    } catch (e) {
      console.error(e);
      showToast("Delete failed (owner only).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Leagues</h1>
      {status === "loading" && <p>Loading…</p>}
      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}

      {status === "ready" && !err && (
        <>
          {/* Create / Join */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={box}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Create league</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  placeholder="League name"
                  style={{ padding: 8, minWidth: 220, border: `2px solid ${yellow}`, borderRadius: 10, background: neonBlue, color: yellow }}
                />
                <button
                  onClick={createLeague}
                  disabled={busy}
                  style={{ border: `2px solid ${yellow}`, borderRadius: 10, padding: "8px 12px", fontWeight: 800, background: "transparent", color: yellow }}
                >
                  ➕ Create
                </button>
              </div>
              <div style={{ marginTop: 8, opacity: 0.9 }}>
                You’ll get an invite code and link to share.
              </div>
            </div>

            <div style={box}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Join league</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Invite code"
                  style={{ padding: 8, width: 160, border: `2px solid ${yellow}`, borderRadius: 10, background: neonBlue, color: yellow, textTransform: "uppercase" }}
                />
                <button
                  onClick={joinLeague}
                  disabled={busy}
                  style={{ border: `2px solid ${yellow}`, borderRadius: 10, padding: "8px 12px", fontWeight: 800, background: "transparent", color: yellow }}
                >
                  Join
                </button>
              </div>
              <div style={{ marginTop: 8, opacity: 0.9 }}>
                Or share a link like <code>/join/ABC123</code>.
              </div>
            </div>
          </div>

          {/* List */}
          <div style={box}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>All leagues</div>
            {leagues.length === 0 ? (
              <div>No leagues yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {leagues.map((L) => {
                  const count = memberMap.get(L.id) || 0;
                  const mine = amMember.has(L.id);
                  const amOwner = L.owner_id === user?.id;
                  return (
                    <div
                      key={L.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                        border: `2px solid ${yellow}`,
                        borderRadius: 12,
                        padding: 10,
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{L.name}</div>
                      <div style={{ opacity: 0.9 }}>• Members: <b>{count}</b></div>
                      <div style={{ opacity: 0.9 }}>
                        • Invite code: <code style={{ fontWeight: 900 }}>{L.invite_code}</code>
                        &nbsp;
                        <button
                          onClick={() => copy(L.invite_code)}
                          style={{ border: `2px solid ${yellow}`, borderRadius: 8, padding: "2px 8px", background: "transparent", color: yellow, cursor: "pointer" }}
                        >
                          Copy code
                        </button>
                        &nbsp;
                        <button
                          onClick={() => copyLink(L.invite_code)}
                          style={{ border: `2px solid ${yellow}`, borderRadius: 8, padding: "2px 8px", background: "transparent", color: yellow, cursor: "pointer" }}
                        >
                          Copy link
                        </button>
                      </div>

                      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <a
                          href={`/leagues/${L.id}`}
                          style={{ border: `2px solid ${yellow}`, borderRadius: 10, padding: "6px 10px", background: "transparent", color: yellow, textDecoration: "none" }}
                        >
                          View
                        </a>
                        {!mine && (
                          <button
                            onClick={async () => {
                              setJoinCode(L.invite_code);
                              await joinLeague();
                            }}
                            disabled={busy}
                            style={{ border: `2px solid ${yellow}`, borderRadius: 10, padding: "6px 10px", background: "transparent", color: yellow, cursor: "pointer" }}
                          >
                            Join
                          </button>
                        )}
                        {mine && (
                          <button
                            onClick={() => leaveLeague(L.id)}
                            disabled={busy}
                            style={{ border: `2px solid ${yellow}`, borderRadius: 10, padding: "6px 10px", background: "transparent", color: yellow, cursor: "pointer" }}
                          >
                            Leave
                          </button>
                        )}
                        {amOwner && (
                          <button
                            onClick={() => deleteLeague(L.id)}
                            disabled={busy}
                            style={{ border: `2px solid ${yellow}`, borderRadius: 10, padding: "6px 10px", background: "transparent", color: yellow, cursor: "pointer" }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

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
            zIndex: 100,
          }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}
