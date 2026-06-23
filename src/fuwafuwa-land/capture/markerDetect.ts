export interface Point {
  x: number;
  y: number;
}

export interface MarkerCorners {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
}

interface Component {
  area: number;
  cx: number;
  cy: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const MIN_AREA_RATIO = 0.003;
const MAX_AREA_RATIO = 0.08;
const ROI_RATIO = 0.45;

function otsu(gray: Uint8ClampedArray): number {
  const hist = new Array<number>(256).fill(0);
  gray.forEach((value) => {
    hist[value] += 1;
  });
  const total = gray.length;
  let sum = 0;
  hist.forEach((count, index) => {
    sum += index * count;
  });
  let sumBackground = 0;
  let weightBackground = 0;
  let bestVariance = 0;
  let threshold = 127;
  for (let index = 0; index < hist.length; index += 1) {
    weightBackground += hist[index];
    if (weightBackground === 0) {
      continue;
    }
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) {
      break;
    }
    sumBackground += index * hist[index];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = index;
    }
  }
  return threshold;
}

function grayscale(image: ImageData): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(image.width * image.height);
  for (let index = 0; index < gray.length; index += 1) {
    const offset = index * 4;
    gray[index] = Math.round(image.data[offset] * 0.299 + image.data[offset + 1] * 0.587 + image.data[offset + 2] * 0.114);
  }
  return gray;
}

function scanComponent(binary: Uint8Array, width: number, height: number, start: number, visited: Uint8Array): Component {
  const stack = [start];
  visited[start] = 1;
  let area = 0;
  let sumX = 0;
  let sumY = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  while (stack.length > 0) {
    const point = stack.pop();
    if (point === undefined) {
      break;
    }
    const x = point % width;
    const y = Math.floor(point / width);
    area += 1;
    sumX += x;
    sumY += y;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue;
        }
        const next = ny * width + nx;
        if (binary[next] === 1 && visited[next] === 0) {
          visited[next] = 1;
          stack.push(next);
        }
      }
    }
  }
  return { area, cx: sumX / area, cy: sumY / area, minX, minY, maxX, maxY };
}

function findCorner(binary: Uint8Array, width: number, height: number, corner: "tl" | "tr" | "br" | "bl"): Point | null {
  const roiWidth = Math.round(width * ROI_RATIO);
  const roiHeight = Math.round(height * ROI_RATIO);
  const startX = corner === "tr" || corner === "br" ? width - roiWidth : 0;
  const startY = corner === "bl" || corner === "br" ? height - roiHeight : 0;
  const visited = new Uint8Array(width * height);
  const minArea = width * height * MIN_AREA_RATIO;
  const maxArea = width * height * MAX_AREA_RATIO;
  const anchor = {
    x: corner === "tr" || corner === "br" ? width : 0,
    y: corner === "bl" || corner === "br" ? height : 0,
  };
  let best: Component | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let y = startY; y < startY + roiHeight; y += 1) {
    for (let x = startX; x < startX + roiWidth; x += 1) {
      const index = y * width + x;
      if (binary[index] === 0 || visited[index] === 1) {
        continue;
      }
      const component = scanComponent(binary, width, height, index, visited);
      const boxWidth = component.maxX - component.minX + 1;
      const boxHeight = component.maxY - component.minY + 1;
      const ratio = boxWidth / boxHeight;
      if (component.area < minArea || component.area > maxArea || ratio < 0.7 || ratio > 1.4) {
        continue;
      }
      const distance = (component.cx - anchor.x) ** 2 + (component.cy - anchor.y) ** 2;
      if (distance < bestDistance) {
        best = component;
        bestDistance = distance;
      }
    }
  }
  return best === null ? null : { x: best.cx, y: best.cy };
}

export function detectMarkers(image: ImageData): MarkerCorners | null {
  const gray = grayscale(image);
  const threshold = otsu(gray);
  const binary = new Uint8Array(gray.length);
  gray.forEach((value, index) => {
    binary[index] = value < threshold ? 1 : 0;
  });
  const tl = findCorner(binary, image.width, image.height, "tl");
  const tr = findCorner(binary, image.width, image.height, "tr");
  const br = findCorner(binary, image.width, image.height, "br");
  const bl = findCorner(binary, image.width, image.height, "bl");
  if (tl === null || tr === null || br === null || bl === null) {
    return null;
  }
  return { tl, tr, br, bl };
}
