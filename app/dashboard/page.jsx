"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // On load: check session + load my team
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/signin";
        return;
      }
      setUser(user);

      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", user.id)
        .limit(1);
      if (error) setErr(error.message);
      setTeam(data?.[0] || null);
      setLoading(false);
    })();
  }, []);

  async function createTeam() {
    setErr("");
    if (!teamName.trim()) { setErr("Enter a team name."); return; }
    const { error } = await supabase.from("teams").insert({
      owner_id: user.id,
      name: teamName.trim()
    });
    if (error) { setErr(error.message); return; }
    window.location.reload();
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) return <main>Loading…</main>;

  return (
    <main>
      <h2>My Team</h2>
      <button onClick={signOut} style={{ marginBottom: 12 }}>Sign out</button>
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {!team ? (
        <div>
          <p>You don't have a team yet.</p>
          <input
            placeholder="Team name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            style={{ marginRight: 8 }}
          />
          <button onClick={createTeam}>Create Team</button>
        </div>
      ) : (
        <div>
          <p><b>Team:</b> {team.name}</p>
          <p>Roster picks coming next.</p>
        </div>
      )}
    </main>
  );
}
