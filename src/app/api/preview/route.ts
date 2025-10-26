import { NextResponse } from "next/server";
import { buildPrompt } from "@/lib/prompt";
import { isRoomStyle, isRoomType, assertEnv } from "@/lib/validation";
import { MAX_FILE_SIZE_MB, PREVIEW_SIZE_PX, type RoomStyle, type RoomType } from "@/lib/constants";
import { dataUrlSizeInBytes } from "@/lib/data-url";

const GENERATION_API_ENDPOINT = "https://api.nano-bana.example/v1/generate";
const EDIT_API_ENDPOINT = "https://api.nano-bana.example/v1/edit";
const API_KEY_ENV = "NANO_BANA_API_KEY";

function getEndpoint(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const roomTypeValue = formData.get("roomType");
    const roomStyleValue = formData.get("roomStyle");

    if (typeof file !== "string" || !file.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "validation_error", details: { field: "file", message: "Expected base64 data URL" } },
        { status: 400 }
      );
    }

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

    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    const fileSize = dataUrlSizeInBytes(file);
    if (fileSize > maxBytes) {
      return NextResponse.json(
        { error: "file_too_large", maxMb: MAX_FILE_SIZE_MB },
        { status: 413 }
      );
    }

    const roomType: RoomType = roomTypeValue;
    const roomStyle: RoomStyle = roomStyleValue;
    const prompt = buildPrompt(roomType, roomStyle);

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
        targetResolution: { width: PREVIEW_SIZE_PX, height: PREVIEW_SIZE_PX }
      })
    });

    if (!generationResponse.ok) {
      const body = await generationResponse.text();
      return NextResponse.json(
        {
          error: "generation_failed",
          message: "Base scene generation failed",
          details: body
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
          error: "generation_failed",
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
        productImage: file,
        transform: {
          perspectiveCorrect: true,
          lightingMatch: true,
          shadow: true
        }
      })
    });

    if (!editResponse.ok) {
      const body = await editResponse.text();
      return NextResponse.json(
        {
          error: "generation_failed",
          message: "Compositing failed",
          details: body
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
          error: "generation_failed",
          message: "Unexpected response from edit service"
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      previewImage: editJson.compositedImageBase64,
      previewMimeType: "image/jpeg",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      metadata: {
        roomType,
        roomStyle,
        prompt
      }
    });
  } catch (error) {
    console.error("/api/preview failure", error);
    return NextResponse.json(
      {
        error: "generation_failed",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
