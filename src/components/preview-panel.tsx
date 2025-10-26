"use client";

interface PreviewPanelProps {
  previewImage?: string;
  isGenerating: boolean;
  onRegenerate: () => void;
  onContinue: () => void;
  disabled?: boolean;
}

export function PreviewPanel({ previewImage, isGenerating, onRegenerate, onContinue, disabled }: PreviewPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Preview</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            className="rounded-md border border-indigo-500 px-3 py-1.5 text-sm font-medium text-indigo-300 hover:bg-indigo-500/10 disabled:opacity-50"
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Regenerate"}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
            disabled={!previewImage || disabled}
          >
            Continue to Final
          </button>
        </div>
      </div>
      <div className="mt-6 aspect-square w-full overflow-hidden rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center">
        {previewImage ? (
          <img src={previewImage} alt="Generated preview" className="h-full w-full object-cover" />
        ) : (
          <p className="text-sm text-slate-500">No preview generated yet</p>
        )}
      </div>
    </div>
  );
}
