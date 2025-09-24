import { chromium } from "playwright";

const TARGET_URL = "https://www.atptour.com/en/rankings/singles";

async function scrapeRankings() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Wait for the rankings table to appear (selector is tolerant to minor changes)
  await page.waitForSelector("table[class*='rankings'] tbody tr", { timeout: 60000 });

  const rows = await page.$$eval("table[class*='rankings'] tbody tr", (trs) => {
    const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
    return trs.slice(0, 50).map((tr) => {
      const tds = Array.from(tr.querySelectorAll("td")).map((td) => clean(td.textContent));
      // Common columns: Rank, Move, Player, Age, Points, Tourn Played, etc.
      // We normalize a minimal subset that tends to exist.
      const rank = parseInt((tds[0] || "").replace(/\D+/g, ""), 10) || null;
      const player = (tr.querySelector("td a[href*='/players/']")?.textContent || "").trim();
      const country = tr.querySelector("img[alt][src*='/flags/']")?.getAttribute("alt") || null;
      const points = parseInt((tds.find((t) => t.match(/^\d{3,}$/)) || "").replace(/\D+/g, ""), 10) || null;

      // Try to extract a player slug/id from the link (e.g., /players/novak-djokovic/D643/overview)
      const playerHref = tr.querySelector("td a[href*='/players/']")?.getAttribute("href") || "";
      const match = playerHref.match(/\/players\/([^/]+)\/([A-Z0-9]{3,})/i);
      const player_slug = match?.[1] || null;
      const player_code = match?.[2] || null;

      return { rank, player, country, points, player_slug, player_code };
    });
  });

  console.log(JSON.stringify(rows, null, 2));

  await browser.close();
}

scrapeRankings().catch((err) => {
  console.error(err);
  process.exit(1);
});
