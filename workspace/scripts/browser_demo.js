/**
 * DAVE DevBox — Node.js Playwright demo
 * Run: node workspace/scripts/browser_demo.js
 */
const { chromium } = require("playwright");

async function main() {
  console.log("=== DAVE DevBox — Node Playwright Demo ===\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Basic navigation
  console.log("Opening example.com...");
  await page.goto("https://example.com");
  console.log("Title:", await page.title());

  // Screenshot
  await page.screenshot({ path: "workspace/logs/node-screenshot.png" });
  console.log("Screenshot saved: workspace/logs/node-screenshot.png");

  // Scraping example
  console.log("\nFetching GitHub trending...");
  await page.goto("https://github.com/trending");
  const repos = await page.locator("article h2 a").allTextContents();
  repos.slice(0, 5).forEach((r, i) => console.log(`${i + 1}. ${r.trim()}`));

  await browser.close();
  console.log("\nDone!");
}

main().catch(console.error);
