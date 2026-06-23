declare module "perspective-transform" {
  export interface PerspectiveTransform {
    transform(x: number, y: number): [number, number];
    transformInverse(x: number, y: number): [number, number];
  }

  export default function perspective(
    source: [number, number, number, number, number, number, number, number],
    destination: [number, number, number, number, number, number, number, number],
  ): PerspectiveTransform;
}
