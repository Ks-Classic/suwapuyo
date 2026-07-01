#!/usr/bin/env node
/**
 * LINE Messaging API でリッチメニューを作成・画像アップロード・デフォルト設定するCLI。
 * 依存パッケージ追加なし(Node組み込みfetchのみ)。
 *
 * 前提: LINE_CHANNEL_ACCESS_TOKEN 環境変数(長期チャネルアクセストークン)が必要。
 *   発行手順: LINE Developers Console → 対象のMessaging APIチャネル →
 *   「Messaging API設定」タブ → 「チャネルアクセストークン(長期)」→ 発行。
 *   これだけはコンソールでの手動発行が必須(LINEの認証モデル上、CLIでは代替不可)。
 *
 * 使い方:
 *   export LINE_CHANNEL_ACCESS_TOKEN=xxxx
 *   node tools/line/richmenu.mjs info              # アカウント情報(basicId・友だち追加URL)を表示
 *   node tools/line/richmenu.mjs list               # 既存リッチメニュー一覧
 *   node tools/line/richmenu.mjs create             # 作成+画像アップロード+全員デフォルト設定まで一括実行
 *   node tools/line/richmenu.mjs delete <richMenuId> # 削除
 */
import { readFileSync } from "node:fs";

const API = "https://api.line.me/v2/bot";
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const IMAGE_PATH = "public/content/yourtime-platform/menu/rich-menu-2500x843.png";
const SITE_BASE = process.env.CONCIERGE_SITE_BASE ?? "https://fuwafuwa-land.vercel.app";

function readEnvLocal(key) {
  try {
    const content = readFileSync(".env.local", "utf8");
    const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

function requireToken() {
  if (!TOKEN) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN が設定されていません。");
    console.error("export LINE_CHANNEL_ACCESS_TOKEN=xxxx してから再実行してください。");
    process.exit(1);
  }
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${options.method ?? "GET"} ${path} -> ${res.status}: ${text}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  return contentType.includes("application/json") ? res.json() : res.text();
}

async function cmdInfo() {
  requireToken();
  const info = await api("/info");
  console.log(JSON.stringify(info, null, 2));
  if (info.basicId) {
    console.log(`\n友だち追加URL: https://line.me/R/ti/p/${info.basicId}`);
    console.log("↑このURLをqrcode等でPNG化すれば受付QRになります。");
  }
}

async function cmdList() {
  requireToken();
  const result = await api("/richmenu/list");
  console.log(JSON.stringify(result, null, 2));
}

function richMenuDefinition(liffId) {
  const liffUrl = `https://liff.line.me/${liffId}`;
  const cellW = 1250;
  const cellH = 421;
  return {
    size: { width: 2500, height: 843 },
    selected: true,
    name: "村の案内所 メニュー",
    chatBarText: "メニュー",
    areas: [
      {
        bounds: { x: 0, y: 0, width: cellW, height: cellH },
        action: { type: "uri", label: "すわぷよ", uri: `${SITE_BASE}/` },
      },
      {
        bounds: { x: cellW, y: 0, width: cellW, height: cellH },
        action: { type: "uri", label: "村の案内所", uri: liffUrl },
      },
      {
        bounds: { x: 0, y: cellH, width: cellW, height: 843 - cellH },
        action: { type: "uri", label: "ふわふわランド", uri: `${SITE_BASE}/fuwafuwa` },
      },
      {
        bounds: { x: cellW, y: cellH, width: cellW, height: 843 - cellH },
        action: { type: "uri", label: "お口体操", uri: `${SITE_BASE}/?taisou=1` },
      },
    ],
  };
}

async function cmdCreate() {
  requireToken();
  const liffId = readEnvLocal("VITE_LIFF_ID");
  if (!liffId) {
    console.error(".env.local に VITE_LIFF_ID が見つかりません。");
    process.exit(1);
  }

  console.log("1/4 リッチメニュー定義を作成中...");
  const created = await api("/richmenu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(richMenuDefinition(liffId)),
  });
  const richMenuId = created.richMenuId;
  console.log(`  -> richMenuId = ${richMenuId}`);

  console.log("2/4 画像をアップロード中...");
  const image = readFileSync(IMAGE_PATH);
  await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "image/png",
    },
    body: image,
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error(`image upload -> ${res.status}: ${await res.text()}`);
    }
  });
  console.log("  -> アップロード完了");

  console.log("3/4 全員のデフォルトリッチメニューに設定中...");
  await api(`/user/all/richmenu/${richMenuId}`, { method: "POST" });
  console.log("  -> 設定完了");

  console.log("4/4 完了。");
  console.log(`richMenuId: ${richMenuId}`);
  console.log("LINEアプリで公式アカウントのトーク画面を開き直すとメニューが反映されます。");
}

async function cmdDelete(richMenuId) {
  requireToken();
  if (!richMenuId) {
    console.error("使い方: node tools/line/richmenu.mjs delete <richMenuId>");
    process.exit(1);
  }
  await api(`/richmenu/${richMenuId}`, { method: "DELETE" });
  console.log(`削除しました: ${richMenuId}`);
}

const [, , command, arg] = process.argv;
const commands = { info: cmdInfo, list: cmdList, create: cmdCreate, delete: () => cmdDelete(arg) };

if (!command || !commands[command]) {
  console.error("使い方: node tools/line/richmenu.mjs <info|list|create|delete>");
  process.exit(1);
}

await commands[command]();
