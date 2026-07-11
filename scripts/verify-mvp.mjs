import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium as playwrightChromium } from "playwright";
import chromium from "@sparticuz/chromium";

const baseUrl = "http://127.0.0.1:4173";
const evidenceDir = "docs/70_すわぷよ・ユアタイム統合仕様/05_テスト/evidence";
const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"], { stdio: ["ignore", "pipe", "pipe"] });

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("vite_server_not_ready");
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  assert.ok(dimensions.width <= dimensions.viewport + 1, `${label}: horizontal overflow ${dimensions.width}/${dimensions.viewport}`);
}

async function runViewport(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
  await page.goto(`${baseUrl}/welcome`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await page.getByRole("heading", { name: "すわぷよへ ようこそ" }).isVisible(), true);
  await assertNoHorizontalOverflow(page, `${width} welcome`);

  await page.goto(`${baseUrl}/village/map`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.getByText("正確なブース位置が確認できるまでは、推測したピンを表示しません。一覧から探せます。").isVisible(), true);
  assert.equal(await page.locator("[aria-label*='ブース']").count(), 0);
  await assertNoHorizontalOverflow(page, `${width} map`);

  await page.goto(`${baseUrl}/reports/exhibitors/86da2704-835e-4e7b-9cf0-41f18be8cb21`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.getByText("デモデータ", { exact: true }).isVisible(), true);
  assert.equal(await page.getByRole("button", { name: "相談してみる" }).isVisible(), true);
  await assertNoHorizontalOverflow(page, `${width} report`);
  await page.close();
}

async function runMainFlow(browser) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  await page.goto(`${baseUrl}/welcome`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "先に教える" }).click();
  await page.getByRole("button", { name: "同意してはじめる" }).click();
  await page.getByRole("button", { name: "教えてあげる" }).click();
  await page.getByRole("button", { name: "おやこ" }).click();
  await page.getByRole("button", { name: "1人" }).click();
  await page.getByRole("button", { name: "いない" }).click();
  await page.getByRole("button", { name: "Instagram" }).click();
  await page.getByRole("button", { name: "いいえ" }).click();
  await page.getByRole("button", { name: "なかまに会いにいく" }).click();
  assert.ok(page.url().endsWith("/arrival"));
  await page.getByRole("button", { name: "演出をスキップ" }).click();
  assert.ok(page.url().endsWith("/characters"));
  await page.screenshot({ path: "/tmp/suwapuyo-characters.png", fullPage: true });
  const characterButtons = page.locator("main button").filter({ has: page.locator("img") });
  assert.ok((await characterButtons.count()) > 0);
  await page.getByRole("button", { name: "このこと あそぶ" }).evaluate((element) => element.click());
  assert.ok(page.url().endsWith("/play"));
  await page.goto(`${baseUrl}/exercise/mouth`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "できた" }).click();
  await page.waitForURL("**/exercise/complete");
  assert.ok(page.url().endsWith("/exercise/complete"));
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "あとで" }).click();
  await page.waitForURL("**/progress");
  assert.ok(page.url().endsWith("/progress"));

  await mkdir(evidenceDir, { recursive: true });
  await page.goto(`${baseUrl}/legacy/game`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${evidenceDir}/old-game-375x667.png`, fullPage: true });
  await page.goto(`${baseUrl}/play`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${evidenceDir}/new-game-375x667.png`, fullPage: true });
  await page.goto(`${baseUrl}/welcome`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidenceDir}/new-welcome-375x667.png`, fullPage: true });
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidenceDir}/new-home-375x667.png`, fullPage: true });
  await page.close();
}

async function runSkipFlow(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/welcome`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "あとで" }).click();
  await page.getByRole("button", { name: "同意してはじめる" }).click();
  await page.waitForURL(`${baseUrl}/`);
  await page.goto(`${baseUrl}/survey/family`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "あとで" }).click();
  await page.waitForURL("**/play");
  await page.goto(`${baseUrl}/exercise/mouth`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "あとで" }).click();
  await page.waitForURL("**/play");
  await page.close();
}

let exitCode = 0;
try {
  await waitForServer();
  const browser = await playwrightChromium.launch({
    executablePath: await chromium.executablePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--headless"],
  });
  await runViewport(browser, 375, 667);
  await runViewport(browser, 390, 844);
  await runMainFlow(browser);
  await runSkipFlow(browser);
  console.log("MVP Chromium verification passed: 375x667, 390x844, main flow, map fallback, report CTA");
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  server.kill("SIGTERM");
  process.exit(exitCode);
}
