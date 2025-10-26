"use client";

import { useCallback, useRef, useState } from "react";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import { fileToDataUrl, validateFileSize } from "@/lib/file";

interface UploadAreaProps {
  onFileSelected: (file: File, dataUrl: string) => void;
}

export function UploadArea({ onFileSelected }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }
      const file = files[0];
      try {
        validateFileSize(file, MAX_FILE_SIZE_MB);
        const dataUrl = await fileToDataUrl(file);
        setError(null);
        onFileSelected(file, dataUrl);
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [onFileSelected]
  );

  return (
    <div className="space-y-2">
      <div
        className="border border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-indigo-400 transition"
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleFiles(event.dataTransfer?.files ?? null);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
      >
        <p className="text-lg font-semibold">Upload product photo</p>
        <p className="text-sm text-slate-400 mt-2">PNG, JPG, or WEBP up to {MAX_FILE_SIZE_MB} MB</p>
        <button
          type="button"
          className="mt-4 px-4 py-2 rounded-md bg-indigo-500 text-white font-medium hover:bg-indigo-400"
        >
          Browse files
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
