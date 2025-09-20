"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data?.user?.email || "");
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    window.location.href = "/";
  }

  const neonBlue = "#00b3ff";
  const yellow = "#fff200";
  const blueBorder = "#0084c7";

  // 👇 Added "Leagues"
  const menuLinks = [
    ["Home", "/"],
    ["My Team", "/myteam"],
    ["Leaderboard", "/leaderboard"],
    ["Leagues", "/leagues"],
    ["Account", "/account"],
  ];

  const linkStyle = (href) => ({
    display: "block",
    padding: "10px 12px",
    border: `2px solid ${yellow}`,
    borderRadius: 12,
    fontWeight: 800,
    textDecoration: "none",
    color: yellow,
    background: pathname === href ? "rgba(0,0,0,0.18)" : "transparent",
  });

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: neonBlue,
        color: yellow,
        borderBottom: `2px solid ${blueBorder}`,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          style={{
            background: "transparent",
            border: `2px solid ${yellow}`,
            color: yellow,
            borderRadius: 8,
            padding: "6px 10px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          ☰
        </button>

        <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>FantaTennis</div>

        <div style={{ marginLeft: "auto", fontWeight: 700 }}>
          {userEmail ? `Signed in: ${userEmail}` : ""}
        </div>
      </div>

      {open && (
        <div
          aria-hidden={!open}
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)" }}
        >
          <nav
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 280,
              background: neonBlue,
              color: yellow,
              padding: 16,
              borderRight: `2px solid ${blueBorder}`,
              boxShadow: "8px 0 30px rgba(0,0,0,0.35)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 900 }}>Menu</div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                style={{
                  background: "transparent",
                  border: `2px solid ${yellow}`,
                  color: yellow,
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {menuLinks.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setOpen(false)} style={linkStyle(href)}>
                {label}
              </a>
            ))}

            {!userEmail ? (
              <>
                <a href="/signup" onClick={() => setOpen(false)} style={linkStyle("/signup")}>
                  Sign Up
                </a>
                <a href="/signin" onClick={() => setOpen(false)} style={linkStyle("/signin")}>
                  Sign In
                </a>
              </>
            ) : (
              <button
                onClick={signOut}
                style={{
                  padding: "10px 12px",
                  border: `2px solid ${yellow}`,
                  borderRadius: 12,
                  fontWeight: 800,
                  color: yellow,
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                Sign Out
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
