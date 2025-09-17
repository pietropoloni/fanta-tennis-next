export const metadata = { title: "Fanta Tennis" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 20 }}>
        <header style={{ marginBottom: 20 }}>
          <a href="/" style={{ marginRight: 12 }}>Home</a>
          <a href="/signup" style={{ marginRight: 12 }}>Sign Up</a>
          <a href="/signin" style={{ marginRight: 12 }}>Sign In</a>
          <a href="/dashboard">My Team</a>
        </header>
        {children}
      </body>
    </html>
  );
}
