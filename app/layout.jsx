import NavBar from "./NavBar";

export const metadata = {
  title: "Fanta Tennis",
  manifest: "/manifest.webmanifest",
  themeColor: "#0b0f1a", // dark blue (kept to match your new scheme)
  appleWebApp: {
    capable: true,              // launches full-screen from Home Screen
    statusBarStyle: "black-translucent",
    title: "FantaTennis"
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }]
  }
};

export default function RootLayout({ children }) {
  const white = "#ffffff";     // replaces the light blue page bg
  const darkBlue = "#0b0f1a";  // replaces the yellow text color

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: white,
          color: darkBlue,
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
