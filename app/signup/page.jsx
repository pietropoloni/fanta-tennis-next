"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setMsg(""); setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "").trim();

    if (!email || !username || !password) {
      setErr("Fill all fields."); setLoading(false); return;
    }
    if (username.length < 3 || username.length > 24) {
      setErr("Username must be 3–24 characters.");
      setLoading(false); return;
    }

    // 1) Create auth user
    const { data, error: signErr } = await supabase.auth.signUp({ email, password });
    if (signErr) { setErr(signErr.message); setLoading(false); return; }

    const user = data.user; // if email confirmations ON, may be null
    if (!user) {
      setMsg("Check your email to confirm, then sign in.");
      setLoading(false); return;
    }

    // 2) Create profile row (enforced by RLS to own ID only)
    const { error: profErr } = await supabase
      .from("profiles")
      .insert({ id: user.id, username });

    if (profErr) {
      setErr(profErr.code === "23505" ? "Username taken. Try another." : profErr.message);
      setLoading(false); return;
    }

    // 3) Go to your dashboard
    window.location.href = "/dashboard";
  }

  return (
    <main>
      <h2>Create account</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        <input name="email" type="email" placeholder="Email" required />
        <input name="username" type="text" placeholder="Username" required />
        <input name="password" type="password" placeholder="Password" required />
        <button disabled={loading}>{loading ? "Creating…" : "Sign Up"}</button>
      </form>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {msg && <p style={{ color: "green" }}>{msg}</p>}
    </main>
  );
}
