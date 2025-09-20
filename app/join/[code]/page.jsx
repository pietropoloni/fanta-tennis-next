"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const neonBlue = "#00b3ff";
const yellow = "#fff200";

const box = {
  background: "rgba(0,0,0,0.08)",
  border: `2px solid ${yellow}`,
  borderRadius: 12,
  padding: 12,
};

export default function JoinByCodePage() {
  const { code } = useParams(); // URL segment /join/[code]
  const router = useRouter();

  const [status, setStatus] = useState("loading");
  const [err, setErr] = useState("");
  const [user, setUser] = useState(null);
  const [league, setLeague] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(m) {
    setToast(m);
    setTimeout(() => setToast(""), 2000);
  }

  useEffect(() => {
    (async () => {
      // must be signed in
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push(`/signin?next=/join/${code}`);
        return;
      }
      setUser(data.user);

      // look up league by invite code (case-insensitive)
      const invite = String(code || "").toUpperCase();
      const { data: L, error } = await supabase
        .from("leagues")
        .select("id,name,invite_code")
        .eq("invite_code", invite)
        .maybeSingle();

      if (error) setErr(error.message || "Lookup failed.");
      else if (!L) setErr("Invalid or expired invite code.");
      else setLeague(L);

      setStatus("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function join() {
    try {
      if (!league || !user) return;
      setBusy(true);
      const { error } = await supabase
        .from("league_members")
        .insert({ league_id: league.id, user_id: user.id });

      // Ignore duplicate membership errors
      if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
        throw error;
      }

      showToast("Joined! Redirecting…");
      router.push(`/leagues/${league.id}`);
    } catch (e) {
      console.error(e);
      showToast("Join failed.");
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <h1>Join League</h1>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Join League</h1>

      {err && (
        <p style={{ color: "crimson" }}>
          Error: {err} &nbsp; <a href="/leagues">Go to Leagues</a>
        </p>
      )}

      {!err && league && (
        <div style={box}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>{league.name}</div>
          <div style={{ marginBottom: 10 }}>
            Invite code: <code style={{ fontWeight: 900 }}>{league.invite_code}</code>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={join}
              disabled={busy}
              style={{
                border: `2px solid ${yellow}`,
                borderRadius: 10,
                padding: "8px 12px",
                fontWeight: 800,
                background: "transparent",
                color: yellow,
                cursor: "pointer",
              }}
            >
              {busy ? "Joining…" : "Join this league"}
            </button>
            <a
              href="/leagues"
              style={{ color: "#0b0", textDecoration: "underline", alignSelf: "center" }}
            >
              ← Back to Leagues
            </a>
          </div>
        </div>
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
