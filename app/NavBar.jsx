"use client";
import { useEffect, useState } from "react";

export default function NavBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const neonBlue = "#00b3ff";   // neon-ish blue
  const yellow = "#fff200";     // bright yellow
  const blueBorder = "#0084c7"; // darker blue border

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

        <div style={{ marginLeft: "auto" }} />
      </div>

      {open && (
        <div
          aria-hidden={!open}
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
          }}
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
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
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

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Home", "/"],
                ["Sign Up", "/signup"],
                ["Sign In", "/signin"],
                ["My Team", "/myteam"],
                ["Leaderboard", "/leaderboard"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "block",
                    padding: "10px 12px",
                    border: `2px solid ${yellow}`,
                    borderRadius: 12,
                    fontWeight: 800,
                    textDecoration: "none",
                    color: yellow,
                    background: "transparent",
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
