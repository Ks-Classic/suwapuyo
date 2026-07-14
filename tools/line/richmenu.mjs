#!/usr/bin/env node
/**
 * すわぷよLINE公式アカウントの開催前リッチメニューCLI。
 * Node組み込みAPIだけを使い、作成と本番default切替を意図的に分離する。
 *
 * Secret:
 *   LINE_CHANNEL_ACCESS_TOKEN は実行中のWSL shell環境変数だけに設定する。
 *   .env.local、Git、VITE_環境変数、Cloudflare Pagesへ保存しない。
 *
 * Public config:
 *   VITE_SUWAPUYO_LIFF_ID は環境変数または .env.local から読む。
 *
 * Commands:
 *   node tools/line/richmenu.mjs validate
 *   node tools/line/richmenu.mjs definition
 *   node tools/line/richmenu.mjs remote-validate
 *   node tools/line/richmenu.mjs info
 *   node tools/line/richmenu.mjs list
 *   node tools/line/richmenu.mjs current-default
 *   node tools/line/richmenu.mjs create --confirm-create
 *   node tools/line/richmenu.mjs link-test <richMenuId> --confirm-test-user
 *   node tools/line/richmenu.mjs unlink-test --confirm-test-user
 *   node tools/line/richmenu.mjs set-default <richMenuId> --confirm-production
 *   node tools/line/richmenu.mjs delete <richMenuId> --confirm-delete
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";

const API = "https://api.line.me/v2/bot";
const DATA_API = "https://api-data.line.me/v2/bot";
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const IMAGE_PATH = process.env.LINE_RICH_MENU_IMAGE
  ?? "public/content/02_ユアタイム/01_リッチメニュー/01_開催前_gpt-image2_v6.jpg";
const MANIFEST_PATH = process.env.LINE_RICH_MENU_MANIFEST
  ?? "tools/richmenu/asset-manifest.json";
const MAX_IMAGE_BYTES = 1_000_000;

const AREAS = Object.freeze({
  main: { x: 0, y: 0, width: 1000, height: 1686 },
  rightTopLeft: { x: 1000, y: 0, width: 750, height: 843 },
  rightTopRight: { x: 1750, y: 0, width: 750, height: 843 },
  rightBottomLeft: { x: 1000, y: 843, width: 750, height: 843 },
  rightBottomRight: { x: 1750, y: 843, width: 750, height: 843 },
});

const KEYWORDS = Object.freeze({
  booths: "YourTIME.出展ブース紹介",
  eventInfo: "YourTIME.日時／アクセス",
  about: "すわぷよって？",
  makers: "すわぷよの作り手",
});

function readEnvLocal(key) {
  try {
    const content = readFileSync(".env.local", "utf8");
    const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
    return match?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function getLiffId() {
  return process.env.VITE_SUWAPUYO_LIFF_ID ?? readEnvLocal("VITE_SUWAPUYO_LIFF_ID");
}

function requireLiffId() {
  const liffId = getLiffId();
  if (!liffId) {
    throw new Error("VITE_SUWAPUYO_LIFF_ID が環境変数または .env.local にありません。");
  }
  return liffId;
}

function requireToken() {
  if (!TOKEN) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN を実行中のWSL shell環境変数へ設定してください。");
  }
}

function imageContentType(path) {
  if (/\.png$/i.test(path)) return "image/png";
  if (/\.jpe?g$/i.test(path)) return "image/jpeg";
  throw new Error(`画像形式はPNGまたはJPEGにしてください: ${path}`);
}

function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    const isStartOfFrame = (marker >= 0xc0 && marker <= 0xc3)
      || (marker >= 0xc5 && marker <= 0xc7)
      || (marker >= 0xc9 && marker <= 0xcb)
      || (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame) {
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  return null;
}

function inspectImage() {
  if (!existsSync(IMAGE_PATH)) throw new Error(`画像がありません: ${IMAGE_PATH}`);
  const contentType = imageContentType(IMAGE_PATH);
  const image = readFileSync(IMAGE_PATH);
  const dimensions = contentType === "image/png" ? pngDimensions(image) : jpegDimensions(image);
  if (dimensions === null) throw new Error(`画像の寸法を読めません: ${IMAGE_PATH}`);
  if (dimensions.width !== 2500 || dimensions.height !== 1686) {
    throw new Error(`画像寸法は2500x1686必須です: ${dimensions.width}x${dimensions.height}`);
  }
  const bytes = statSync(IMAGE_PATH).size;
  if (bytes > MAX_IMAGE_BYTES) throw new Error(`画像は1MB以下必須です: ${bytes} bytes`);
  return {
    path: IMAGE_PATH,
    contentType,
    width: dimensions.width,
    height: dimensions.height,
    bytes,
    sha256: createHash("sha256").update(image).digest("hex"),
    image,
  };
}

function inspectAssetGate(image) {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`GPT Image 2生成マニフェストがありません: ${MANIFEST_PATH}`);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  if (manifest.status !== "approved"
    || manifest.generation_model !== "gpt-image-2"
    || manifest.generation_method !== "openai-imagegen"
    || manifest.human_review?.visual !== true
    || manifest.human_review?.text_exact !== true
    || manifest.sha256 !== image.sha256) {
    throw new Error("画像はGPT Image 2生成・人の目視承認・sha256一致を満たしていません。");
  }
}

function richMenuDefinition(liffId) {
  const playUrl = `https://liff.line.me/${liffId}/?source=richmenu_before`;
  return {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "すわぷよ 開催前 v5",
    chatBarText: "すわぷよメニュー",
    areas: [
      {
        bounds: AREAS.main,
        action: { type: "uri", label: "すわぷよで遊ぶ", uri: playUrl },
      },
      {
        bounds: AREAS.rightTopLeft,
        action: { type: "message", label: "YourTIME.出展ブース紹介", text: KEYWORDS.booths },
      },
      {
        bounds: AREAS.rightTopRight,
        action: { type: "message", label: "YourTIME.日時／アクセス", text: KEYWORDS.eventInfo },
      },
      {
        bounds: AREAS.rightBottomLeft,
        action: { type: "message", label: "すわぷよって？", text: KEYWORDS.about },
      },
      {
        bounds: AREAS.rightBottomRight,
        action: { type: "message", label: "すわぷよの作り手", text: KEYWORDS.makers },
      },
    ],
  };
}

function validationReport() {
  const image = inspectImage();
  inspectAssetGate(image);
  const liffId = requireLiffId();
  const definition = richMenuDefinition(liffId);
  return {
    assetValidation: "passed",
    productionReady: false,
    image: {
      path: image.path,
      contentType: image.contentType,
      width: image.width,
      height: image.height,
      bytes: image.bytes,
      sha256: image.sha256,
    },
    liff: { configured: true, idMasked: `${liffId.slice(0, 4)}…${liffId.slice(-4)}` },
    activeAreas: definition.areas.map((area) => ({ bounds: area.bounds, action: area.action.type, label: area.action.label })),
    comingSoonAreas: [],
    externalGates: [
      "LINE Official Account ManagerまたはWebhookで4キーワードの応答を設定する",
      "出店カテゴリをBOOTH-102/103の確認済み台帳から確定する",
      "日時・会場・申込／チケットURLを運営正本で確定する",
      "4つのmessage actionに対するLINE返信文を設定する",
      "テストアカウントへper-user linkし、iOS／Androidで確認する",
    ],
  };
}

async function api(path, options = {}) {
  requireToken();
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} -> ${response.status}: ${await response.text()}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

async function cmdValidate() {
  console.log(JSON.stringify(validationReport(), null, 2));
}

async function cmdDefinition() {
  const image = inspectImage();
  inspectAssetGate(image);
  console.log(JSON.stringify(richMenuDefinition(requireLiffId()), null, 2));
}

async function cmdRemoteValidate() {
  const image = inspectImage();
  inspectAssetGate(image);
  await api("/richmenu/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(richMenuDefinition(requireLiffId())),
  });
  console.log(JSON.stringify({ status: "line_definition_valid" }, null, 2));
}

async function cmdInfo() {
  const info = await api("/info");
  console.log(JSON.stringify(info, null, 2));
  if (info.basicId) console.log(`友だち追加URL: https://line.me/R/ti/p/${info.basicId}`);
}

async function cmdList() {
  console.log(JSON.stringify(await api("/richmenu/list"), null, 2));
}

async function cmdCurrentDefault() {
  console.log(JSON.stringify(await api("/user/all/richmenu"), null, 2));
}

async function cmdCreate() {
  if (arg1 !== "--confirm-create") {
    throw new Error("使い方: create --confirm-create（LINE側に新規作成します。defaultにはしません）");
  }
  const report = validationReport();
  const definition = richMenuDefinition(requireLiffId());
  await api("/richmenu/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(definition),
  });
  console.log("1/2 リッチメニュー定義を作成中（defaultには設定しません）...");
  const created = await api("/richmenu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(definition),
  });
  const richMenuId = created.richMenuId;
  try {
    console.log("2/2 画像をアップロード中...");
    const response = await fetch(`${DATA_API}/richmenu/${richMenuId}/content`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": report.image.contentType },
      body: inspectImage().image,
    });
    if (!response.ok) throw new Error(`image upload -> ${response.status}: ${await response.text()}`);
  } catch (error) {
    await api(`/richmenu/${richMenuId}`, { method: "DELETE" }).catch(() => undefined);
    throw error;
  }
  console.log(JSON.stringify({
    status: "created_not_default",
    richMenuId,
    imageSha256: report.image.sha256,
    next: `テスト後: node tools/line/richmenu.mjs set-default ${richMenuId} --confirm-production`,
  }, null, 2));
}

function requireTestUserId() {
  const userId = process.env.LINE_TEST_USER_ID;
  if (!userId) {
    throw new Error("LINE_TEST_USER_ID を実行中のWSL shell環境変数へ設定してください。");
  }
  return userId;
}

async function cmdLinkTest(richMenuId, confirmation) {
  if (!richMenuId || confirmation !== "--confirm-test-user") {
    throw new Error("使い方: link-test <richMenuId> --confirm-test-user");
  }
  const userId = requireTestUserId();
  await api(`/user/${encodeURIComponent(userId)}/richmenu/${richMenuId}`, { method: "POST" });
  console.log(JSON.stringify({ status: "linked_to_test_user", richMenuId }, null, 2));
}

async function cmdUnlinkTest(confirmation) {
  if (confirmation !== "--confirm-test-user") {
    throw new Error("使い方: unlink-test --confirm-test-user");
  }
  const userId = requireTestUserId();
  await api(`/user/${encodeURIComponent(userId)}/richmenu`, { method: "DELETE" });
  console.log(JSON.stringify({ status: "unlinked_from_test_user" }, null, 2));
}

async function cmdSetDefault(richMenuId, confirmation) {
  if (!richMenuId || confirmation !== "--confirm-production") {
    throw new Error("使い方: set-default <richMenuId> --confirm-production");
  }
  await api(`/user/all/richmenu/${richMenuId}`, { method: "POST" });
  console.log(JSON.stringify({ status: "default_updated", richMenuId }, null, 2));
}

async function cmdDelete(richMenuId, confirmation) {
  if (!richMenuId || confirmation !== "--confirm-delete") {
    throw new Error("使い方: delete <richMenuId> --confirm-delete");
  }
  await api(`/richmenu/${richMenuId}`, { method: "DELETE" });
  console.log(JSON.stringify({ status: "deleted", richMenuId }, null, 2));
}

const [, , command, arg1, arg2] = process.argv;
const commands = {
  validate: cmdValidate,
  definition: cmdDefinition,
  "remote-validate": cmdRemoteValidate,
  info: cmdInfo,
  list: cmdList,
  "current-default": cmdCurrentDefault,
  create: cmdCreate,
  "link-test": () => cmdLinkTest(arg1, arg2),
  "unlink-test": () => cmdUnlinkTest(arg1),
  "set-default": () => cmdSetDefault(arg1, arg2),
  delete: () => cmdDelete(arg1, arg2),
};

if (!command || !commands[command]) {
  console.error("使い方: node tools/line/richmenu.mjs <validate|definition|remote-validate|info|list|current-default|create|link-test|unlink-test|set-default|delete>");
  process.exit(1);
}

try {
  await commands[command]();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
