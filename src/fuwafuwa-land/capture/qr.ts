import jsQR from "jsqr";

export function readQrText(image: ImageData): string | undefined {
  const code = jsQR(image.data, image.width, image.height);
  return code?.data;
}
