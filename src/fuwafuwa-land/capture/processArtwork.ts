import { SUUSUU_CONFIG } from "../config";
import type { ProcessedArtwork, TransparencyMode } from "../types";
import { canvasToBlob, fitWithin } from "../utils/image";
import { detectMarkers } from "./markerDetect";
import { readQrText } from "./qr";
import { warpToRectangle } from "./warp";

function drawScaledCanvas(input: HTMLCanvasElement, longEdge: number): HTMLCanvasElement {
  const size = fitWithin(input.width, input.height, longEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("canvas_context_unavailable");
  }
  ctx.drawImage(input, 0, 0, size.width, size.height);
  return canvas;
}

function drawOnSolidBackground(input: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = input.width;
  canvas.height = input.height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("canvas_context_unavailable");
  }
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(input, 0, 0);
  return canvas;
}

function imageDataToCanvas(image: ImageData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("canvas_context_unavailable");
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function isNearWhite(data: Uint8ClampedArray, pixelIndex: number): boolean {
  const offset = pixelIndex * 4;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
  return luminance > 235 && max - min < 28;
}

function applyEdgeWhiteTransparency(image: ImageData): void {
  const { width, height, data } = image;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  function enqueue(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const index = y * width + x;
    if (visited[index] === 1 || !isNearWhite(data, index)) {
      return;
    }
    visited[index] = 1;
    queue.push(index);
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head];
    const x = index % width;
    const y = Math.floor(index / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let index = 0; index < visited.length; index += 1) {
    if (visited[index] === 1) {
      data[index * 4 + 3] = 0;
    }
  }
}

function trimCanvas(input: HTMLCanvasElement, insetRatio: number): HTMLCanvasElement {
  const insetX = Math.max(0, Math.round(input.width * insetRatio));
  const insetY = Math.max(0, Math.round(input.height * insetRatio));
  const width = Math.max(1, input.width - insetX * 2);
  const height = Math.max(1, input.height - insetY * 2);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("canvas_context_unavailable");
  }
  ctx.drawImage(input, insetX, insetY, width, height, 0, 0, width, height);
  return canvas;
}

function hasTransparentPixels(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) {
    throw new Error("canvas_context_unavailable");
  }
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 3; index < image.data.length; index += 4) {
    if (image.data[index] < 255) {
      return true;
    }
  }
  return false;
}

function applyTransparencyMode(canvas: HTMLCanvasElement, mode: TransparencyMode): HTMLCanvasElement {
  const target = mode === "coloring-sheet" ? trimCanvas(canvas, 0.028) : canvas;
  if (mode === "none") {
    return target;
  }
  const ctx = target.getContext("2d", { willReadFrequently: true });
  if (ctx === null) {
    throw new Error("canvas_context_unavailable");
  }
  const data = ctx.getImageData(0, 0, target.width, target.height);
  applyEdgeWhiteTransparency(data);
  ctx.putImageData(data, 0, 0);
  return target;
}

async function encodeProcessedCanvas(canvas: HTMLCanvasElement, mode: TransparencyMode, warnings: string[]): Promise<{ blob: Blob; width: number; height: number }> {
  if (mode !== "none" && hasTransparentPixels(canvas)) {
    return encodeTransparentCanvas(canvas, warnings);
  }
  return encodeCanvasWithinBudget(canvas, "image/jpeg", warnings);
}

async function encodeCanvasWithinBudget(
  canvas: HTMLCanvasElement,
  preferredType: "image/png" | "image/jpeg",
  warnings: string[],
): Promise<{ blob: Blob; width: number; height: number }> {
  const maxBytes = SUUSUU_CONFIG.capture.maxUploadBytes;
  const minLongEdge = SUUSUU_CONFIG.capture.minOutputLongEdge;
  const quality = SUUSUU_CONFIG.capture.jpegQuality;
  let current = canvas;
  let currentLongEdge = Math.max(current.width, current.height);

  while (true) {
    const blob = await canvasToBlob(current, preferredType, preferredType === "image/jpeg" ? quality : undefined);
    if (blob.size <= maxBytes || currentLongEdge <= minLongEdge) {
      if (blob.size > maxBytes) {
        warnings.push("image_size_over_budget");
      }
      return { blob, width: current.width, height: current.height };
    }
    currentLongEdge = Math.max(minLongEdge, Math.round(currentLongEdge * 0.82));
    current = drawScaledCanvas(current, currentLongEdge);
    warnings.push("image_resized_for_upload");
  }
}

async function encodeTransparentCanvas(canvas: HTMLCanvasElement, warnings: string[]): Promise<{ blob: Blob; width: number; height: number }> {
  const png = await encodeCanvasWithinBudget(canvas, "image/png", warnings);
  if (png.blob.size <= SUUSUU_CONFIG.capture.maxUploadBytes) {
    return png;
  }
  warnings.push("transparent_png_too_large_jpeg_fallback");
  return encodeCanvasWithinBudget(drawOnSolidBackground(canvas, "#ffffff"), "image/jpeg", warnings);
}

export async function processArtworkCanvas(input: HTMLCanvasElement, useFallbackRectangle: boolean, transparencyMode: TransparencyMode): Promise<ProcessedArtwork> {
  const workingCanvas = drawScaledCanvas(input, 1000);
  const ctx = workingCanvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) {
    throw new Error("canvas_context_unavailable");
  }
  const source = ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height);
  const corners = detectMarkers(source);
  const warnings: string[] = [];
  let resultCanvas: HTMLCanvasElement;
  let resultImage: ImageData | null = null;
  if (corners === null) {
    warnings.push("markers_not_found");
    if (!useFallbackRectangle) {
      const fallback = applyTransparencyMode(drawScaledCanvas(input, SUUSUU_CONFIG.capture.outputLongEdge), transparencyMode);
      const encoded = await encodeProcessedCanvas(fallback, transparencyMode, warnings);
      return {
        blob: encoded.blob,
        width: encoded.width,
        height: encoded.height,
        ok: false,
        warnings,
      };
    }
    resultCanvas = drawScaledCanvas(input, SUUSUU_CONFIG.capture.outputLongEdge);
  } else {
    try {
      resultImage = warpToRectangle(source, corners, 904, 1280);
      resultCanvas = imageDataToCanvas(resultImage);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "warp_failed");
      resultImage = null;
      resultCanvas = drawScaledCanvas(input, SUUSUU_CONFIG.capture.outputLongEdge);
    }
  }
  const outCtx = resultCanvas.getContext("2d", { willReadFrequently: true });
  if (outCtx === null) {
    throw new Error("canvas_context_unavailable");
  }
  let templateId: string | undefined;
  if (resultImage !== null) {
    templateId = readQrText(resultImage);
  }
  if (SUUSUU_CONFIG.capture.whiteKey && transparencyMode !== "none") {
    const transparentCanvas = applyTransparencyMode(resultCanvas, transparencyMode);
    const encoded = await encodeProcessedCanvas(transparentCanvas, transparencyMode, warnings);
    return {
      blob: encoded.blob,
      width: encoded.width,
      height: encoded.height,
      templateId,
      ok: corners !== null,
      warnings,
    };
  }
  const outputCanvas = applyTransparencyMode(resultCanvas, transparencyMode);
  const encoded = await encodeProcessedCanvas(outputCanvas, transparencyMode, warnings);
  return {
    blob: encoded.blob,
    width: encoded.width,
    height: encoded.height,
    templateId,
    ok: corners !== null,
    warnings,
  };
}
