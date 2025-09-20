"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

const box = {
  border: "2px solid #fff200",
  borderRadius: 12,
  padding: 12,
  background: "rgba(0,0,0,0.08)",
};

export default function AccountPage() {
  const [status, setStatus] = useState("loading");
  const [err, setErr] = useState("");
  const [email, setEmail] = useState("");
  const [team, setTeam] = useState(null);
  const [picks, setPicks] = useState([]); // [{name, ranking}]

  useEffect(() => {
    (async () => {
      try {
        // 1) Require sign-in
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user) {
          // send back here after sign-in
          window.location.href = "/signin?next=/account";
          return;
        }
        setEmail(user.email || "");

        // 2) Load my team (if any)
        const { data: t, error: tErr } = await supabase
          .from("teams")
          .select("id,name")
          .eq("owner_id", user.id)
          .limit(1)
          .maybeSingle();
        if (tErr) throw tErr;
        setTeam(t || null);

        // 3) Load my roster picks joined with players
        if (t) {
          // requires FK roster_picks.player_id -> players.id
          const { data: rp, error: rpErr } = await supabase
            .from("roster_picks")
            .select("player_id, players:player_id (name, ranking)")
            .eq("team_id", t.id);
          if (rpErr) throw rpErr;

          const list =
            (rp || [])
              .map((r) => ({
                name: r.players?.name,
                ranking: r.players?.ranking,
              }))
              .filter((p) => p.name)
              .sort((a, b) => a.ranking - b.ranking);

          setPicks(list);
        }
        setStatus("ready");
      } catch (e) {
        setErr(e.message || String(e));
        setStatus("ready");
      }
    })();
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1>Account</h1>

      {status === "loading" && <p>Loading…</p>}
      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}

      {status === "ready" && !err && (
        <>
          <div style={{ ...box, marginBottom: 12 }}>
            <div style={{ fontWeight: 900 }}>Signed in</div>
            <div>{email}</div>
          </div>

          <div style={{ ...box, marginBottom: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>My Team</div>
            {!team ? (
              <div>
                No cloud team yet. Go to <a href="/myteam">My Team</a>, set a name, and click “☁ Save to cloud”.
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{team.name || "(unnamed)"}</div>
                {picks.length === 0 ? (
                  <div>No players saved yet.</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {picks.map((p) => (
                      <li key={p.ranking} style={{ lineHeight: 1.6 }}>
                        #{p.ranking} {p.name}
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ marginTop: 10 }}>
                  <a
                    href="/myteam"
                    style={{
                      display: "inline-block",
                      border: "2px solid #fff200",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontWeight: 800,
                      color: "#fff200",
                      textDecoration: "none",
                    }}
                  >
                    Edit on My Team →
                  </a>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </main>
  );
}
