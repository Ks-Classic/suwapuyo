const objectUrls = new Map<string, string>();

export function objectUrlForBlob(key: string, blob: Blob): string {
  const current = objectUrls.get(key);
  if (current !== undefined) {
    return current;
  }
  const next = URL.createObjectURL(blob);
  objectUrls.set(key, next);
  return next;
}

export function revokeObjectUrl(key: string): void {
  const current = objectUrls.get(key);
  if (current !== undefined) {
    URL.revokeObjectURL(current);
    objectUrls.delete(key);
  }
}

export async function blobToImageBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

export async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (blob === null) {
    throw new Error("canvas_to_blob_failed");
  }
  return blob;
}

export function fitWithin(width: number, height: number, longEdge: number): { width: number; height: number } {
  const scale = longEdge / Math.max(width, height);
  if (scale >= 1) {
    return { width, height };
  }
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function resizeBlob(blob: Blob, longEdge: number, type: string, quality?: number): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const size = fitWithin(bitmap.width, bitmap.height, longEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    bitmap.close();
    throw new Error("canvas_context_unavailable");
  }
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return {
    blob: await canvasToBlob(canvas, type, quality),
    width: size.width,
    height: size.height,
  };
}
