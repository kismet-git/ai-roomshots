"use client";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onPurchaseCredits: () => void;
  onLogin: () => void;
}

export function PaywallModal({ open, onClose, onPurchaseCredits, onLogin }: PaywallModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Out of credits</h2>
        <p className="mt-3 text-sm text-slate-300">
          Sign in to continue generating roomshots or purchase additional credits to unlock more exports.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            className="w-full rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            onClick={onLogin}
          >
            Sign in
          </button>
          <button
            type="button"
            className="w-full rounded-md border border-indigo-400 px-4 py-2 text-sm font-medium text-indigo-200 hover:bg-indigo-500/10"
            onClick={onPurchaseCredits}
          >
            Buy credits
          </button>
          <button
            type="button"
            className="w-full rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            onClick={onClose}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
