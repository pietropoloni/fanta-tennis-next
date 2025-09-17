"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "").trim();

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErr(error.message); setLoading(false); return; }

    window.location.href = "/dashboard";
  }

  return (
    <main>
      <h2>Sign in</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <button disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
      </form>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </main>
  );
}
