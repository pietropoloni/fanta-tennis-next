import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-blue-50 to-blue-100 text-center">
      {/* App Icon */}
      <Image
        src="/icon-180.png" // make sure this file exists in your /public folder
        alt="Fanta Tennis App Icon"
        width={120}
        height={120}
        className="mb-6 rounded-2xl shadow-lg"
        priority
      />

      {/* Title */}
      <h1 className="text-3xl font-bold text-blue-700 mb-3">Welcome to Fanta Tennis 🎾</h1>
      <p className="text-lg text-gray-700 mb-8">
        Build your dream team and follow live tennis action!
      </p>

      {/* Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <a
          href="https://www.atptour.com/en/scores/current"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full px-4 py-3 bg-blue-600 text-white text-lg font-semibold rounded-2xl shadow hover:bg-blue-700 transition"
        >
          📊 Live Scores
        </a>

        <Link
          href="/my-team"
          className="w-full px-4 py-3 bg-green-600 text-white text-lg font-semibold rounded-2xl shadow hover:bg-green-700 transition"
        >
          👥 My Team
        </Link>
      </div>
    </main>
  );
}
