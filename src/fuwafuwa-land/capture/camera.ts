export function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("video_not_ready"));
    }, 4000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("canplay", onReady);
    };
    const onReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup();
        resolve();
      }
    };
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);
  });
}

export async function startEnvironmentCamera(video: HTMLVideoElement): Promise<MediaStream> {
  if (navigator.mediaDevices?.getUserMedia === undefined) {
    throw new Error("標準カメラ撮影を使ってください");
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
  video.srcObject = stream;
  await video.play();
  await waitForVideoReady(video);
  return stream;
}

export async function waitForDrawableVideoFrame(video: HTMLVideoElement): Promise<void> {
  await waitForVideoReady(video);
  if ("requestVideoFrameCallback" in video) {
    await new Promise<void>((resolve) => {
      video.requestVideoFrameCallback(() => resolve());
    });
    return;
  }
  await new Promise<void>((resolve) => window.setTimeout(resolve, 120));
}

export function stopCamera(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

export function captureVideoFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (width <= 0 || height <= 0) {
    throw new Error("video_not_ready");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("canvas_context_unavailable");
  }
  ctx.drawImage(video, 0, 0, width, height);
  return canvas;
}

export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    URL.revokeObjectURL(url);
    throw new Error("canvas_context_unavailable");
  }
  ctx.drawImage(image, 0, 0);
  URL.revokeObjectURL(url);
  return canvas;
}
