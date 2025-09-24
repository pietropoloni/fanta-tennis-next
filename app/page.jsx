// app/page.tsx
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="home">
      <div className="home-card">
        <Image
          src="/icon-180.png"
          alt="Fanta Tennis"
          width={120}
          height={120}
          className="home-icon"
          priority
        />

        <h1 className="home-title">Welcome to Fanta Tennis 🎾</h1>
        <p className="home-subtitle">
          Build your dream team and follow live tennis action.
        </p>

        <div className="home-actions">
          <a
            href="https://www.atptour.com/en/scores/current"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            📊 Live Scores (ATP)
          </a>

          <Link href="/my-team" className="btn btn-secondary">
            👥 My Team
          </Link>
        </div>
      </div>
    </main>
  );
}
