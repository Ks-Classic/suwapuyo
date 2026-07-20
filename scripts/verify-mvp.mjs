import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { arch } from "node:process";
import { chromium as playwrightChromium } from "playwright";
import chromium from "@sparticuz/chromium";

const baseUrl = "http://127.0.0.1:4173";
const evidenceDir = "docs/70_すわぷよ・ユアタイム統合仕様/05_テスト/evidence";
const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"], { env: { ...process.env, VITE_SUWAPUYO_LIFF_MODE: "demo" }, stdio: ["ignore", "pipe", "pipe"] });

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

async function assertVillageBackground(page, label) {
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
  assert.ok(background.includes("village-bg.png"), `${label}: village background is not applied`);
}

async function runViewport(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
  await page.goto(`${baseUrl}/welcome`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await page.getByRole("heading", { name: "すわぷよへ ようこそ" }).isVisible(), true);
  await assertNoHorizontalOverflow(page, `${width} welcome`);
  await assertVillageBackground(page, `${width} welcome`);

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
  const startedAt = Date.now();
  await page.goto(`${baseUrl}/welcome`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "先に教える" }).click();
  await page.getByRole("button", { name: "同意してはじめる" }).click();
  await page.getByRole("button", { name: "設定する" }).click();
  await page.getByRole("button", { name: "子どもと大人" }).click();
  await page.getByRole("button", { name: "前の質問へ戻る" }).click();
  await page.getByRole("button", { name: "子どもと大人" }).click();
  const birthYear = String(new Date().getFullYear() - 5);
  await page.getByLabel("1人目の生まれた年").selectOption(birthYear);
  await page.getByLabel("1人目の生まれた月").selectOption("5");
  await page.getByRole("button", { name: "もうひとり追加" }).click();
  await page.getByLabel("2人目の生まれた年").selectOption(String(new Date().getFullYear() - 8));
  await page.getByLabel("2人目の生まれた月").selectOption("8");
  await assertNoHorizontalOverflow(page, "375 multiple children");
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: `${evidenceDir}/survey-children-375x667.png`, fullPage: true });
  await page.getByRole("button", { name: "次へ" }).click();
  await page.getByRole("button", { name: "お口あそび" }).click();
  await page.getByRole("button", { name: "村へすすむ" }).click();
  assert.ok(Date.now() - startedAt < 60_000, "onboarding must complete within 60 seconds");
  const storedSurvey = await page.evaluate(() => localStorage.getItem("suwapuyo_mvp_state_v1"));
  assert.equal(storedSurvey?.includes(birthYear), false, "birth year must not be persisted");
  assert.equal(JSON.parse(storedSurvey ?? "{}").survey.children.length, 2);
  assert.ok(page.url().endsWith("/arrival"));
  await page.getByRole("button", { name: "演出をスキップ" }).click();
  assert.ok(page.url().endsWith("/characters"));
  await page.getByRole("heading", { name: "だれと あそぶ？" }).waitFor();
  assert.equal(await page.locator("[aria-label='ぷよ枠'] button").count(), 4);
  assert.equal(await page.getByText("？？？", { exact: true }).count(), 0);

  const selections = [
    { slot: 0, name: "炎症", id: "sample-enshou" },
    { slot: 1, name: "糖化", id: "sample-touka" },
    { slot: 2, name: "酸化", id: "sample-sanka" },
    { slot: 3, name: "えまひめ", id: "sample-emahime" },
  ];
  for (const selection of selections) {
    await page.locator("[aria-label='ぷよ枠'] button").nth(selection.slot).click();
    await page.locator("button", { has: page.locator(`img[alt='${selection.name}']`) }).click();
  }
  const selectedIds = await page.evaluate(() => {
    const raw = localStorage.getItem("suwapuyo_progress");
    return raw === null ? null : JSON.parse(raw).selected_puyo_character_ids;
  });
  assert.deepEqual(selectedIds, {
    ghost: "sample-enshou",
    tooth: "sample-touka",
    blob: "sample-sanka",
    tanuki: "sample-emahime",
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidenceDir}/fix-01-after-characters-375x667.png` });
  await page.getByRole("button", { name: "この4枠で遊ぶ" }).click();
  assert.ok(page.url().endsWith("/play"));
  await page.getByText("Loading...").waitFor({ state: "hidden", timeout: 15_000 });
  await page.screenshot({ path: `${evidenceDir}/fix-01-after-play-375x667.png` });
  await page.goto(`${baseUrl}/exercise/mouth`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "できた" }).click();
  await page.waitForURL("**/exercise/complete");
  assert.ok(page.url().endsWith("/exercise/complete"));
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "あとで" }).click();
  await page.waitForURL("**/progress");
  assert.ok(page.url().endsWith("/progress"));

  await page.goto(`${baseUrl}/welcome`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidenceDir}/fix-01-after-welcome-375x667.png` });
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await assertVillageBackground(page, "375 home");
  await page.screenshot({ path: `${evidenceDir}/fix-01-after-home-375x667.png` });
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
  await page.goto(`${baseUrl}/onboarding`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "今は設定しない" }).click();
  await page.waitForURL("**/play");
  await page.goto(`${baseUrl}/exercise/mouth`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "あとで" }).click();
  await page.waitForURL("**/play");
  await page.close();
}

async function runEventPhases(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/welcome`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "あとで" }).click();
  await page.getByRole("button", { name: "同意してはじめる" }).click();
  for (const [phase, heading] of [["before", "YourTIMEに行く予定はある？"], ["during", "今日は何人で来た？"], ["after", "YourTIMEには行った？"]]) {
    await page.goto(`${baseUrl}/events/yourtime-2026-08/survey/${phase}`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.getByRole("heading", { name: heading }).isVisible(), true);
    await assertNoHorizontalOverflow(page, `390 event ${phase}`);
    await page.screenshot({ path: `${evidenceDir}/survey-event-${phase}-390x844.png`, fullPage: true });
  }
  await page.goto(`${baseUrl}/events/yourtime-2026-08/survey/normal`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.getByRole("heading", { name: "イベント質問はありません" }).isVisible(), true);
  assert.equal(await page.getByText("今日は何人で来た？").count(), 0);
  await page.close();
}

async function runUnansweredFlow(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await page.goto(`${baseUrl}/welcome`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "先に教える" }).click();
  await page.getByRole("button", { name: "同意してはじめる" }).click();
  await page.getByRole("button", { name: "設定する" }).click();
  await page.getByRole("button", { name: "今は選ばない" }).click();
  await page.getByRole("button", { name: "あとで" }).click();
  await page.getByRole("heading", { name: "遊ぶ準備ができたよ！" }).waitFor();
  const stored = JSON.parse(await page.evaluate(() => localStorage.getItem("suwapuyo_mvp_state_v1") ?? "{}"));
  assert.equal(stored.survey.primaryPlayer, "unanswered");
  assert.equal(stored.survey.preferredActivity, "unanswered");
  assert.deepEqual(stored.survey.children, []);
  await page.close();
}

let exitCode = 0;
try {
  await waitForServer();
  const browser = await playwrightChromium.launch({
    executablePath: arch === "arm64" ? "/usr/bin/chromium-browser" : await chromium.executablePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--headless"],
  });
  await runViewport(browser, 375, 667);
  await runViewport(browser, 390, 844);
  await runMainFlow(browser);
  await runSkipFlow(browser);
  await runUnansweredFlow(browser);
  await runEventPhases(browser);
  console.log("MVP Chromium verification passed: 375x667, 390x844, onboarding, event phases, map fallback, report CTA");
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  server.kill("SIGTERM");
  process.exit(exitCode);
}
