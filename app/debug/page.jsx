"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export default function DebugPage() {
  const [info, setInfo] = useState({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").slice(0, 8) + "...",
    status: "starting…",
    count: null,
    sample: null,
    error: null,
  });

  useEffect(() => {
    (async () => {
      try {
        setInfo((s) => ({ ...s, status: "querying players…" }));
        const { data, error } = await supabase
          .from("players")
          .select("id,name,ranking")
          .order("ranking", { ascending: true });
        if (error) {
          setInfo((s) => ({ ...s, status: "error", error: error.message }));
        } else {
          setInfo((s) => ({
            ...s,
            status: "ok",
            count: data?.length ?? 0,
            sample: (data || []).slice(0, 5),
            error: null,
          }));
        }
      } catch (e) {
        setInfo((s) => ({ ...s, status: "exception", error: String(e) }));
      }
    })();
  }, []);

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1>Debug</h1>
      <p><b>Supabase URL:</b> {String(info.url || "(undefined)")}</p>
      <p><b>Anon key (start):</b> {info.anon || "(undefined)"} </p>
      <p><b>Status:</b> {info.status}</p>
      <p><b>Error:</b> {info.error ? <code>{info.error}</code> : "—"}</p>
      <p><b>Players count:</b> {info.count === null ? "…" : info.count}</p>
      <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 8 }}>
        {info.sample ? JSON.stringify(info.sample, null, 2) : "No sample"}
      </pre>
      <p style={{ color: "#6b7280" }}>
        If this page shows an error, copy the text and send it to me. If count is 0, we’ll re-seed.
      </p>
    </main>
  );
}
