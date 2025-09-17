"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "").trim();

    if (!email || !username || !password) {
      setErr("Fill all fields.");
      setLoading(false);
      return;
    }
    if (username.length < 3 || username.length > 24) {
      setErr("Username must be 3–24 characters.");
      setLoading(false);
      return;
    }

    // 1) Create auth user
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpErr) {
      setErr(signUpErr.message);
      setLoading(false);
      return;
    }

    // If email confirmations are ON, user may be null until they confirm.
    // We'll force a sign-in to ensure we have a session for RLS inserts.
    await supabase.auth.signInWithPassword({ email, password });

    // 2) Fetch the current user (auth.uid() must be set for RLS)
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      setErr(userErr.message);
      setLoading(false);
      return;
    }
    const user = userData?.user;
    if (!user) {
      setErr("Could not get user session. Try signing in, then create profile.");
      setLoading(false);
      return;
    }

    // 3) Insert profile row (RLS allows inserting only your own id)
    const { error: profErr } = await supabase
      .from("profiles")
      .insert({ id: user.id, username });

    if (profErr) {
      setErr(profErr.code === "23505" ? "Username taken. Try another." : profErr.message);
      setLoading(false);
      return;
    }

    // 4) Go to dashboard
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
