import type { MarkerCorners } from "./markerDetect";

type Matrix3 = [number, number, number, number, number, number, number, number, number];

function solveLinearSystem(matrix: number[][], values: number[]): number[] {
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
        pivot = row;
      }
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    if (Math.abs(divisor) < 1e-10) {
      throw new Error("homography_singular");
    }
    for (let item = column; item <= size; item += 1) {
      augmented[column][item] /= divisor;
    }
    for (let row = 0; row < size; row += 1) {
      if (row === column) {
        continue;
      }
      const factor = augmented[row][column];
      for (let item = column; item <= size; item += 1) {
        augmented[row][item] -= factor * augmented[column][item];
      }
    }
  }
  return augmented.map((row) => row[size]);
}

function homography(source: [number, number][], destination: [number, number][]): Matrix3 {
  const rows: number[][] = [];
  const values: number[] = [];
  source.forEach(([x, y], index) => {
    const [u, v] = destination[index];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    values.push(u);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    values.push(v);
  });
  const solved = solveLinearSystem(rows, values);
  return [solved[0], solved[1], solved[2], solved[3], solved[4], solved[5], solved[6], solved[7], 1];
}

function invert(matrix: Matrix3): Matrix3 {
  const [a, b, c, d, e, f, g, h, i] = matrix;
  const a11 = e * i - f * h;
  const a12 = c * h - b * i;
  const a13 = b * f - c * e;
  const a21 = f * g - d * i;
  const a22 = a * i - c * g;
  const a23 = c * d - a * f;
  const a31 = d * h - e * g;
  const a32 = b * g - a * h;
  const a33 = a * e - b * d;
  const determinant = a * a11 + b * a21 + c * a31;
  if (Math.abs(determinant) < 1e-10) {
    throw new Error("homography_inverse_singular");
  }
  return [a11 / determinant, a12 / determinant, a13 / determinant, a21 / determinant, a22 / determinant, a23 / determinant, a31 / determinant, a32 / determinant, a33 / determinant];
}

function transformPoint(matrix: Matrix3, x: number, y: number): [number, number] {
  const denominator = matrix[6] * x + matrix[7] * y + matrix[8];
  return [(matrix[0] * x + matrix[1] * y + matrix[2]) / denominator, (matrix[3] * x + matrix[4] * y + matrix[5]) / denominator];
}

function sample(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, channel: number): number {
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1));
  const tx = x - x0;
  const ty = y - y0;
  const p00 = data[(y0 * width + x0) * 4 + channel];
  const p10 = data[(y0 * width + x1) * 4 + channel];
  const p01 = data[(y1 * width + x0) * 4 + channel];
  const p11 = data[(y1 * width + x1) * 4 + channel];
  return p00 * (1 - tx) * (1 - ty) + p10 * tx * (1 - ty) + p01 * (1 - tx) * ty + p11 * tx * ty;
}

export function warpToRectangle(source: ImageData, corners: MarkerCorners, width: number, height: number): ImageData {
  const forward = homography(
    [
      [corners.tl.x, corners.tl.y],
      [corners.tr.x, corners.tr.y],
      [corners.br.x, corners.br.y],
      [corners.bl.x, corners.bl.y],
    ],
    [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ],
  );
  const inverse = invert(forward);
  const output = new ImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [sx, sy] = transformPoint(inverse, x, y);
      const out = (y * width + x) * 4;
      output.data[out] = sample(source.data, source.width, source.height, sx, sy, 0);
      output.data[out + 1] = sample(source.data, source.width, source.height, sx, sy, 1);
      output.data[out + 2] = sample(source.data, source.width, source.height, sx, sy, 2);
      output.data[out + 3] = sample(source.data, source.width, source.height, sx, sy, 3);
    }
  }
  return output;
}
