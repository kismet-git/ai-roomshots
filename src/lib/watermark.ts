import { createCanvas, loadImage } from "@napi-rs/canvas";
import { parseDataUrl } from "@/lib/data-url";

export async function applyWatermark(dataUrl: string): Promise<string> {
  const { buffer, mime } = parseDataUrl(dataUrl);
  const image = await loadImage(buffer);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(image, 0, 0, image.width, image.height);

  const watermarkWidth = Math.floor(image.width * 0.2);
  const fontSize = Math.floor(watermarkWidth / 8);
  const padding = 24;

  ctx.font = `${fontSize}px 'Inter', 'Helvetica Neue', Arial, sans-serif`;
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  const text = "AI Roomshots Preview";
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const targetWidth = watermarkWidth;
  const scale = targetWidth / textWidth;

  ctx.save();
  ctx.scale(scale, scale);
  const scaledPaddingX = padding / scale;
  const scaledPaddingY = padding / scale;
  const x = (image.width / scale) - scaledPaddingX - textWidth;
  const y = (image.height / scale) - scaledPaddingY;
  ctx.fillText(text, x, y);
  ctx.restore();

  const outputMime = mime === "image/png" ? "image/png" : "image/jpeg";
  return canvas.toDataURL(outputMime, 0.95);
}
