"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PreviewPanel } from "@/components/preview-panel";
import { SelectField } from "@/components/select-field";
import { UploadArea } from "@/components/upload-area";
import { PaywallModal } from "@/components/paywall-modal";
import { requestExport, requestPreview } from "@/lib/api-client";
import { ROOM_STYLES, ROOM_TYPES, type RoomStyle, type RoomType } from "@/lib/constants";
import { ensureFingerprint, getFingerprint } from "@/lib/fingerprint";
import { buildPrompt } from "@/lib/prompt";

interface PreviewState {
  image: string;
  prompt: string;
  expiresAt: string;
}

export default function HomePage() {
  const [roomType, setRoomType] = useState<RoomType>("living_room");
  const [roomStyle, setRoomStyle] = useState<RoomStyle>("modern");
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    ensureFingerprint();
  }, []);

  const prompt = useMemo(() => buildPrompt(roomType, roomStyle), [roomType, roomStyle]);

  const handleFileSelected = useCallback((_: File, dataUrl: string) => {
    setFileDataUrl(dataUrl);
    setPreview(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!fileDataUrl) {
      setError("Upload a product photo first");
      return;
    }
    try {
      setIsGenerating(true);
      setError(null);
      const fingerprint = getFingerprint() ?? undefined;
      const response = await requestPreview({
        file: fileDataUrl,
        roomType,
        roomStyle,
        clientSession: fingerprint
      });
      setPreview({
        image: response.previewImage,
        prompt: response.metadata.prompt,
        expiresAt: response.expiresAt
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [fileDataUrl, roomStyle, roomType]);

  const handleExport = useCallback(async () => {
    if (!preview) {
      setError("Generate a preview first");
      return;
    }
    try {
      setIsExporting(true);
      setError(null);
      const fingerprint = getFingerprint() ?? undefined;
      const blob = await requestExport({
        roomType,
        roomStyle,
        clientSession: fingerprint,
        productImage: fileDataUrl ?? undefined,
        format: "jpg"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ai-roomshot.jpg";
      anchor.rel = "noopener";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = (err as Error).message;
      if (message.toLowerCase().includes("credit")) {
        setShowPaywall(true);
      } else {
        setError(message);
      }
    } finally {
      setIsExporting(false);
    }
  }, [fileDataUrl, preview, roomStyle, roomType]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-white">AI Roomshots</h1>
        <p className="text-sm text-slate-300">Generate photorealistic staged rooms from your product imagery.</p>
      </header>

      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <UploadArea onFileSelected={handleFileSelected} />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="room-type"
              label="Room type"
              value={roomType}
              options={ROOM_TYPES}
              onChange={setRoomType}
            />
            <SelectField
              id="room-style"
              label="Room style"
              value={roomStyle}
              options={ROOM_STYLES}
              onChange={setRoomStyle}
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            <h2 className="text-base font-semibold text-white">Model prompt</h2>
            <p className="mt-2 whitespace-pre-line break-words text-slate-300">{prompt}</p>
          </div>

          <button
            type="button"
            className="w-full rounded-lg bg-indigo-500 px-5 py-3 text-base font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            onClick={handleGenerate}
            disabled={!fileDataUrl || isGenerating}
          >
            {isGenerating ? "Generating preview..." : "Generate Roomshot"}
          </button>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        </div>

        <div className="space-y-6">
          <PreviewPanel
            previewImage={preview?.image}
            isGenerating={isGenerating}
            onRegenerate={handleGenerate}
            onContinue={handleExport}
            disabled={isExporting}
          />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
            <h3 className="text-base font-semibold text-white">Credit policy</h3>
            <ul className="mt-3 space-y-2 list-disc list-inside">
              <li>Anonymous users receive one free high-resolution export with a watermark.</li>
              <li>Sign in to unlock credit packs and remove the watermark from exports.</li>
              <li>Credits are consumed only when exporting final imagery.</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="w-full rounded-lg border border-indigo-400 px-5 py-3 text-base font-semibold text-indigo-200 hover:bg-indigo-500/10 disabled:opacity-50"
            disabled={!preview || isExporting}
          >
            {isExporting ? "Preparing download..." : "Download Final"}
          </button>
        </div>
      </section>

      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onLogin={() => {
          setShowPaywall(false);
          window.location.href = "/api/auth/signin";
        }}
        onPurchaseCredits={() => {
          setShowPaywall(false);
          window.location.href = "/billing";
        }}
      />
    </main>
  );
}
