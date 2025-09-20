import NavBar from "./NavBar";

export const metadata = { title: "Fanta Tennis" };

// app/layout.jsx
export const metadata = {
  appleWebApp: {
    capable: true,              // <-- key part: launches full-screen from Home Screen
    statusBarStyle: "black-translucent",
    title: "FantaTennis"
  }
};

// (your existing RootLayout component stays below)

export default function RootLayout({ children }) {
  const neonBlue = "#00b3ff";
  const yellow = "#fff200";

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: neonBlue,
          color: yellow,
          minHeight: "100vh",
        }}
      >
        <NavBar />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
