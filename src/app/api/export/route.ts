import { NextResponse } from "next/server";
import { buildPrompt } from "@/lib/prompt";
import { assertEnv, isRoomStyle, isRoomType } from "@/lib/validation";
import { consumeCredit, evaluateCredits } from "@/lib/credits-server";
import { getCurrentUser } from "@/lib/auth-server";
import { MAX_FILE_SIZE_MB, EXPORT_SIZE_PX, type RoomStyle, type RoomType } from "@/lib/constants";
import { applyWatermark } from "@/lib/watermark";
import { dataUrlSizeInBytes } from "@/lib/data-url";

const GENERATION_API_ENDPOINT = "https://api.nano-bana.example/v1/generate";
const EDIT_API_ENDPOINT = "https://api.nano-bana.example/v1/edit";
const API_KEY_ENV = "NANO_BANA_API_KEY";

function getEndpoint(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function encodeResponse(imageDataUrl: string, format: "jpg" | "png") {
  const mime = format === "png" ? "image/png" : "image/jpeg";
  if (imageDataUrl.startsWith("data:")) {
    const base64 = imageDataUrl.split(",")[1];
    const buffer = Buffer.from(base64, "base64");
    return { buffer, mime };
  }
  throw new Error("Unexpected image payload");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomType: roomTypeValue, roomStyle: roomStyleValue, clientSession, productImage, format = "jpg" } = body as {
      roomType?: string;
      roomStyle?: string;
      clientSession?: string;
      productImage?: string;
      format?: "jpg" | "png";
    };

    if (typeof roomTypeValue !== "string" || !isRoomType(roomTypeValue)) {
      return NextResponse.json(
        { error: "validation_error", details: { field: "roomType", message: "Unsupported room type" } },
        { status: 400 }
      );
    }

    if (typeof roomStyleValue !== "string" || !isRoomStyle(roomStyleValue)) {
      return NextResponse.json(
        { error: "validation_error", details: { field: "roomStyle", message: "Unsupported room style" } },
        { status: 400 }
      );
    }

    if (!["jpg", "png"].includes(format)) {
      return NextResponse.json(
        { error: "validation_error", details: { field: "format", message: "Unsupported format" } },
        { status: 400 }
      );
    }

    if (typeof productImage !== "string" || !productImage.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "validation_error", details: { field: "productImage", message: "Expected base64 data URL" } },
        { status: 400 }
      );
    }

    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    const productBytes = dataUrlSizeInBytes(productImage);
    if (productBytes > maxBytes) {
      return NextResponse.json(
        { error: "file_too_large", maxMb: MAX_FILE_SIZE_MB },
        { status: 413 }
      );
    }

    const roomType: RoomType = roomTypeValue;
    const roomStyle: RoomStyle = roomStyleValue;
    const prompt = buildPrompt(roomType, roomStyle);

    const user = await getCurrentUser();
    const creditEvaluation = evaluateCredits({ userId: user?.id, fingerprint: clientSession });

    if (!creditEvaluation.canExport) {
      const status = creditEvaluation.reason === "auth_required" ? 401 : 402;
      return NextResponse.json(
        {
          error: creditEvaluation.reason ?? "payment_required",
          message:
            creditEvaluation.reason === "auth_required"
              ? "Login required for additional exports"
              : "Insufficient credits",
          creditsRemaining: creditEvaluation.remainingCredits
        },
        { status }
      );
    }

    const needsWatermark = creditEvaluation.watermarked;

    const apiKey = assertEnv(API_KEY_ENV);
    const generationEndpoint = getEndpoint("GENERATION_API_ENDPOINT", GENERATION_API_ENDPOINT);
    const editEndpoint = getEndpoint("EDIT_API_ENDPOINT", EDIT_API_ENDPOINT);

    const generationResponse = await fetch(generationEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt,
        roomType,
        roomStyle,
        targetResolution: { width: EXPORT_SIZE_PX, height: EXPORT_SIZE_PX }
      })
    });

    if (!generationResponse.ok) {
      const text = await generationResponse.text();
      return NextResponse.json(
        {
          error: "export_failed",
          message: "Base scene generation failed",
          details: text
        },
        { status: 500 }
      );
    }

    const generationJson = (await generationResponse.json()) as {
      status: string;
      imageBase64: string;
    };

    if (generationJson.status !== "ok" || !generationJson.imageBase64) {
      return NextResponse.json(
        {
          error: "export_failed",
          message: "Unexpected response from generation service"
        },
        { status: 500 }
      );
    }

    const editResponse = await fetch(editEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        baseImage: generationJson.imageBase64,
        productImage,
        transform: {
          perspectiveCorrect: true,
          lightingMatch: true,
          shadow: true
        }
      })
    });

    if (!editResponse.ok) {
      const text = await editResponse.text();
      return NextResponse.json(
        {
          error: "export_failed",
          message: "Compositing failed",
          details: text
        },
        { status: 500 }
      );
    }

    const editJson = (await editResponse.json()) as {
      status: string;
      compositedImageBase64: string;
    };

    if (editJson.status !== "ok" || !editJson.compositedImageBase64) {
      return NextResponse.json(
        {
          error: "export_failed",
          message: "Unexpected response from edit service"
        },
        { status: 500 }
      );
    }

    const imagePayload = needsWatermark
      ? await applyWatermark(editJson.compositedImageBase64)
      : editJson.compositedImageBase64;

    const { buffer, mime } = encodeResponse(imagePayload, format);
    const creditResult = consumeCredit({ userId: user?.id, fingerprint: clientSession });

    const acceptsJson = request.headers.get("accept")?.includes("application/json");
    if (acceptsJson) {
      return NextResponse.json({
        finalImage: imagePayload,
        finalMimeType: mime,
        resolution: { width: EXPORT_SIZE_PX, height: EXPORT_SIZE_PX },
        watermarked: needsWatermark,
        creditsRemaining: creditResult.remainingCredits,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      });
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="ai-roomshot.${format}"`
      }
    });
  } catch (error) {
    console.error("/api/export failure", error);
    return NextResponse.json(
      {
        error: "export_failed",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
