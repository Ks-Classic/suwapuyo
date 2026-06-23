import { SUUSUU_CONFIG } from "../config";
import type { ProcessedArtwork } from "../types";
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

function applyWhiteKey(image: ImageData): void {
  for (let index = 0; index < image.data.length; index += 4) {
    const red = image.data[index];
    const green = image.data[index + 1];
    const blue = image.data[index + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
    if (luminance > 240 && max - min < 18) {
      image.data[index + 3] = 0;
    }
  }
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

export async function processArtworkCanvas(input: HTMLCanvasElement, useFallbackRectangle: boolean): Promise<ProcessedArtwork> {
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
      const fallback = drawScaledCanvas(input, SUUSUU_CONFIG.capture.outputLongEdge);
      const encoded = await encodeCanvasWithinBudget(fallback, "image/jpeg", warnings);
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
  const data = outCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
  if (SUUSUU_CONFIG.capture.whiteKey) {
    applyWhiteKey(data);
    outCtx.putImageData(data, 0, 0);
    const encoded = await encodeTransparentCanvas(resultCanvas, warnings);
    return {
      blob: encoded.blob,
      width: encoded.width,
      height: encoded.height,
      templateId,
      ok: corners !== null,
      warnings,
    };
  }
  const encoded = await encodeCanvasWithinBudget(resultCanvas, "image/jpeg", warnings);
  return {
    blob: encoded.blob,
    width: encoded.width,
    height: encoded.height,
    templateId,
    ok: corners !== null,
    warnings,
  };
}
