import NavBar from "./NavBar";

export const metadata = {
  title: "Fanta Tennis",
  manifest: "/manifest.webmanifest",
  themeColor: "#0b0f1a", // dark blue
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FantaTennis",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }) {
  const white = "#ffffff";     // background
  const darkBlue = "#0b0f1a";  // primary / link / button

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

        {/* Global styles to force dark-blue links and buttons */}
        <style>{`
          a {
            color: ${darkBlue};
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          button, .btn, [role="button"] {
            background: ${darkBlue};
            color: #ffffff;
            border: 1px solid ${darkBlue};
            border-radius: 10px;
            padding: 10px 14px;
            cursor: pointer;
          }
          button:hover, .btn:hover, [role="button"]:hover {
            filter: brightness(0.95);
          }
          button:disabled, .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          /* Optional outline style if you use it anywhere */
          .btn-outline, .button-outline {
            background: transparent;
            color: ${darkBlue};
            border: 1px solid ${darkBlue};
          }
          /* Better focus visibility on keyboard navigation */
          a:focus-visible,
          button:focus-visible,
          [role="button"]:focus-visible {
            outline: 0;
            box-shadow: 0 0 0 3px rgba(11, 15, 26, 0.25);
            border-radius: 10px;
          }
          ::selection {
            background: ${darkBlue};
            color: #ffffff;
          }
        `}</style>

        <div style={{ maxWidth: 1100,

