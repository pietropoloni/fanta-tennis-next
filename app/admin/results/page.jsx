"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { ADMIN_EMAILS } from "@/lib/config";

const neonBlue = "#00b3ff";
const yellow = "#fff200";

const box = {
  background: "rgba(0,0,0,0.08)",
  border: `2px solid ${yellow}`,
  borderRadius: 12,
  padding: 12,
};

const TYPES = ["ATP250", "ATP500", "ATP1000", "Major"];

export default function AdminResultsPage() {
  const [status, setStatus] = useState("loading");
  const [err, setErr] = useState("");
  const [user, setUser] = useState(null);

  // tournaments
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);

  // create form
  const [name, setName] = useState("");
  const [tType, setTType] = useState("ATP250");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // CSV upload
  const [activeTid, setActiveTid] = useState("");
  const [csv, setCsv] = useState("");
  const [uploadLog, setUploadLog] = useState("");
  const [players, setPlayers] = useState([]);

  function logLine(s) {
    setUploadLog((prev) => (prev ? prev + "\n" + s : s));
  }

 // ...
import { ADMIN_EMAILS } from "@/lib/config";
// ...

useEffect(() => {
  (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const email = (data?.user?.email || "").toLowerCase();
      if (!email) {
        window.location.href = "/signin?next=/admin/results";
        return;
      }
      if (!ADMIN_EMAILS.includes(email)) {
        window.location.href = "/"; // not an admin
        return;
      }
      setUser(data.user);

      // preload players…
      const { data: P, error: pErr } = await supabase
        .from("players")
        .select("id,ranking,name");
      if (pErr) throw pErr;
      setPlayers(P || []);

      await refresh();
      setStatus("ready");
    } catch (e) {
      setErr(e.message || String(e));
      setStatus("ready");
    }
  })();
}, []);

  async function refresh() {
    const { data, error } = await supabase
      .from("tournaments")
      .select("id,name,tournament_type,start_date,end_date,lock_at,owner_id,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setList(data || []);
  }

  async function createTournament() {
    try {
      if (!name.trim()) return alert("Enter a tournament name.");
      setBusy(true);
      const { data, error } = await supabase
        .from("tournaments")
        .insert({
          name: name.trim(),
          tournament_type: tType,
          start_date: startDate || null,
          end_date: endDate || null,
          owner_id: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      setName("");
      setStartDate("");
      setEndDate("");
      await refresh();
      setActiveTid(data.id);
      alert("Tournament created.");
    } catch (e) {
      console.error(e);
      alert("Create failed. Check console / RLS.");
    } finally {
      setBusy(false);
    }
  }

  async function lockRosters(tid) {
    try {
      setBusy(true);
      // call function to snapshot all rosters for this tournament
      const { error } = await supabase.rpc("snapshot_all_rosters", { _tournament_id: tid });
      if (error) throw error;

      // set lock_at (optional visual cue)
      const { error: updErr } = await supabase
        .from("tournaments")
        .update({ lock_at: new Date().toISOString() })
        .eq("id", tid);
      if (updErr) throw updErr;

      await refresh();
      alert("Rosters locked (snapshot taken).");
    } catch (e) {
      console.error(e);
      alert("Lock failed. You must be the tournament owner.");
    } finally {
      setBusy(false);
    }
  }

  // Parse CSV and upsert player_results
  // Accepts either:
  //   ranking,points
  //   name,points
  // Lines starting with # are ignored. Empty lines ignored.
  // Example:
  //   1,2000
  //   Jannik Sinner,2000
  async function uploadResults(tid) {
    try {
      if (!tid) return alert("Pick a tournament (left select).");
      if (!csv.trim()) return alert("Paste CSV first.");
      setBusy(true);
      setUploadLog("");

      const byRank = new Map(players.map((p) => [String(p.ranking), p]));
      const byName = new Map(players.map((p) => [p.name.toLowerCase(), p]));

      const lines = csv.split(/\r?\n/);
      const rows = [];
      let ok = 0,
        skipped = 0;

      for (let raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        // split by comma or tab
        const parts = line.split(/[,|\t]/).map((s) => s.trim());
        if (parts.length < 2) {
          logLine(`Skip: "${line}" (need 2 columns)`);
          skipped++;
          continue;
        }
        const key = parts[0];
        const pts = Number(parts[1]);
        if (!Number.isFinite(pts)) {
          logLine(`Skip: "${line}" (points not a number)`);
          skipped++;
          continue;
        }

        let player = null;
        if (/^\d{1,3}$/.test(key)) {
          // treat as ranking
          player = byRank.get(String(Number(key)));
        } else {
          // treat as name (case-insensitive)
          player = byName.get(key.toLowerCase());
        }

        if (!player) {
          logLine(`Skip: "${line}" (player not found)`);
          skipped++;
          continue;
        }

        rows.push({ tournament_id: tid, player_id: player.id, raw_points: Math.round(pts) });
        ok++;
      }

      if (!rows.length) {
        alert("No valid rows to import.");
        return;
      }

      // upsert in chunks
      const chunkSize = 250;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase
          .from("player_results")
          .upsert(chunk, { onConflict: "tournament_id,player_id" });
        if (error) throw error;
      }

      logLine(`Imported ${ok} rows, skipped ${skipped}.`);
      alert(`Results uploaded: ${ok} rows (skipped ${skipped}).`);
    } catch (e) {
      console.error(e);
      alert("Upload failed. Check console / ownership / CSV format.");
    } finally {
      setBusy(false);
    }
  }

  async function computeTotals(tid) {
    try {
      if (!tid) return alert("Pick a tournament.");
      setBusy(true);
      const { error } = await supabase.rpc("compute_team_results_for_tournament", {
        _tournament_id: tid,
      });
      if (error) throw error;
      alert("Totals computed and saved to team_results.");
    } catch (e) {
      console.error(e);
      alert("Compute failed.");
    } finally {
      setBusy(false);
    }
  }

  const ownerIds = useMemo(() => new Set(list.map((t) => t.owner_id)), [list]);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Admin → Results</h1>

      {status === "loading" && <p>Loading…</p>}
      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}

      {status === "ready" && !err && (
        <>
          {/* Create tournament */}
          <div style={box}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Create tournament</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tournament name (e.g., US Open)"
                style={{
                  padding: 8,
                  minWidth: 260,
                  border: `2px solid ${yellow}`,
                  borderRadius: 10,
                  background: neonBlue,
                  color: yellow,
                }}
              />
              <select
                value={tType}
                onChange={(e) => setTType(e.target.value)}
                style={{
                  padding: "8px 10px",
                  border: `2px solid ${yellow}`,
                  borderRadius: 10,
                  background: neonBlue,
                  color: yellow,
                  fontWeight: 800,
                }}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <label>
                <span style={{ marginRight: 6 }}>Start</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ padding: 8, border: `2px solid ${yellow}`, borderRadius: 10, background: neonBlue, color: yellow }}
                />
              </label>
              <label>
                <span style={{ marginRight: 6 }}>End</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ padding: 8, border: `2px solid ${yellow}`, borderRadius: 10, background: neonBlue, color: yellow }}
                />
              </label>
              <button
                onClick={createTournament}
                disabled={busy}
                style={{
                  border: `2px solid ${yellow}`,
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontWeight: 800,
                  background: "transparent",
                  color: yellow,
                }}
              >
                ➕ Create
              </button>
            </div>
            <div style={{ opacity: 0.9, marginTop: 8 }}>
              You’ll be set as <b>owner</b> of the tournament (required to upload results).
            </div>
          </div>

          {/* Existing tournaments */}
          <div style={{ ...box, marginTop: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Tournaments</div>
            {list.length === 0 ? (
              <div>No tournaments yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {list.map((t) => {
                  const mine = t.owner_id === user?.id;
                  return (
                    <div
                      key={t.id}
                      style={{
                        border: `2px solid ${yellow}`,
                        borderRadius: 12,
                        padding: 10,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900 }}>{t.name}</div>
                        <div style={{ opacity: 0.9 }}>
                          • {t.tournament_type} • {t.start_date || "?"} → {t.end_date || "?"}
                        </div>
                        {t.lock_at && <div style={{ opacity: 0.9 }}>• Locked: {new Date(t.lock_at).toLocaleString()}</div>}
                        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                          <button
                            onClick={() => lockRosters(t.id)}
                            disabled={busy || !mine}
                            title={!mine ? "Only the tournament owner can lock" : ""}
                            style={{
                              border: `2px solid ${yellow}`,
                              borderRadius: 10,
                              padding: "6px 10px",
                              background: "transparent",
                              color: yellow,
                              cursor: mine ? "pointer" : "not-allowed",
                            }}
                          >
                            🔒 Lock rosters
                          </button>
                          <button
                            onClick={() => computeTotals(t.id)}
                            disabled={busy || !mine}
                            title={!mine ? "Only the tournament owner can compute totals" : ""}
                            style={{
                              border: `2px solid ${yellow}`,
                              borderRadius: 10,
                              padding: "6px 10px",
                              background: "transparent",
                              color: yellow,
                              cursor: mine ? "pointer" : "not-allowed",
                            }}
                          >
                            ➟ Compute totals
                          </button>
                        </div>
                      </div>

                      <details>
                        <summary style={{ cursor: "pointer", fontWeight: 800 }}>Upload results (CSV)</summary>
                        <div style={{ marginTop: 8 }}>
                          <div style={{ marginBottom: 6 }}>
                            Paste CSV as <code>ranking,points</code> <i>or</i> <code>name,points</code> (one row per player).
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <textarea
                              value={csv}
                              onChange={(e) => setCsv(e.target.value)}
                              placeholder={"Examples:\n1,2000\nJannik Sinner,2000\n50,180\n..."}
                              rows={8}
                              style={{
                                width: 520,
                                maxWidth: "100%",
                                padding: 8,
                                border: `2px solid ${yellow}`,
                                borderRadius: 10,
                                background: neonBlue,
                                color: yellow,
                                fontFamily: "ui-monospace, Menlo, monospace",
                              }}
                            />
                            <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                              <button
                                onClick={() => {
                                  setActiveTid(t.id);
                                  uploadResults(t.id);
                                }}
                                disabled={busy || t.owner_id !== user?.id}
                                style={{
                                  border: `2px solid ${yellow}`,
                                  borderRadius: 10,
                                  padding: "8px 12px",
                                  fontWeight: 800,
                                  background: "transparent",
                                  color: yellow,
                                  cursor: t.owner_id === user?.id ? "pointer" : "not-allowed",
                                }}
                              >
                                ⬆ Upload to {t.name}
                              </button>
                              <button
                                onClick={() =>
                                  setCsv(
                                    "1,2000\n2,1200\n3,720\n4,360\n5,180\n# names also work:\nJannik Sinner,2000\nCarlos Alcaraz,1200"
                                  )
                                }
                                style={{
                                  border: `2px solid ${yellow}`,
                                  borderRadius: 10,
                                  padding: "8px 12px",
                                  fontWeight: 800,
                                  background: "transparent",
                                  color: yellow,
                                }}
                              >
                                Fill sample
                              </button>
                              <button
                                onClick={() => {
                                  setUploadLog("");
                                  setCsv("");
                                }}
                                style={{
                                  border: `2px solid ${yellow}`,
                                  borderRadius: 10,
                                  padding: "8px 12px",
                                  fontWeight: 800,
                                  background: "transparent",
                                  color: yellow,
                                }}
                              >
                                Clear
                              </button>
                            </div>
                          </div>

                          <pre
                            style={{
                              marginTop: 8,
                              whiteSpace: "pre-wrap",
                              background: "rgba(0,0,0,0.12)",
                              border: `2px solid ${yellow}`,
                              borderRadius: 10,
                              padding: 8,
                              minHeight: 60,
                              maxWidth: "100%",
                              overflow: "auto",
                            }}
                          >
{uploadLog || "Log will appear here…"}
                          </pre>
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
