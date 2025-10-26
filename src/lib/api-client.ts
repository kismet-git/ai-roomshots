import type { RoomStyle, RoomType } from "@/lib/constants";

export interface PreviewResponse {
  previewImage: string;
  previewMimeType: string;
  expiresAt: string;
  metadata: {
    roomType: RoomType;
    roomStyle: RoomStyle;
    prompt: string;
  };
}

export interface ExportResponse {
  finalImage?: string;
  finalMimeType?: string;
  resolution?: { width: number; height: number };
  watermarked?: boolean;
  creditsRemaining?: number;
  expiresAt?: string;
}

interface PreviewRequest {
  file: string;
  roomType: RoomType;
  roomStyle: RoomStyle;
  clientSession?: string;
}

export async function requestPreview(request: PreviewRequest): Promise<PreviewResponse> {
  const body = new FormData();
  body.set("file", request.file);
  body.set("roomType", request.roomType);
  body.set("roomStyle", request.roomStyle);
  if (request.clientSession) {
    body.set("clientSession", request.clientSession);
  }

  const res = await fetch("/api/preview", {
    method: "POST",
    body
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "unknown" }));
    throw new Error(error.message ?? error.error ?? "Preview failed");
  }

  return res.json();
}

interface ExportRequest {
  roomType: RoomType;
  roomStyle: RoomStyle;
  clientSession?: string;
  sourcePreviewToken?: string;
  productImage?: string;
  format: "jpg" | "png";
}

export async function requestExport(request: ExportRequest): Promise<Blob> {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });

  if (res.headers.get("content-type")?.includes("application/json")) {
    const json = (await res.json()) as ExportResponse & { error?: string; message?: string };
    if (!res.ok) {
      throw new Error(json.message ?? json.error ?? "Export failed");
    }
    if (!json.finalImage) {
      throw new Error("Final image payload missing");
    }
    const data = json.finalImage.split(",")[1];
    const buffer = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    return new Blob([buffer], { type: json.finalMimeType ?? "image/jpeg" });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Export failed");
  }

  return res.blob();
}
