"use client";

import { IconAlert, IconCheck, IconX } from "@/components/Icons";
import { cx } from "@/lib/format";

export default function Toasts({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cx(
            "pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur",
            toast.kind === "error" && "border-rose-500/40 bg-rose-950/80 text-rose-100",
            toast.kind === "success" && "border-emerald-500/40 bg-emerald-950/80 text-emerald-100",
            (!toast.kind || toast.kind === "info") && "border-slate-600/40 bg-slate-900/90 text-slate-100",
          )}
        >
          <span className="mt-0.5 shrink-0">
            {toast.kind === "error" ? <IconAlert /> : toast.kind === "success" ? <IconCheck /> : <IconAlert />}
          </span>
          <p className="flex-1 leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="mt-0.5 shrink-0 rounded p-0.5 text-current/70 hover:text-current"
            aria-label="Dismiss"
          >
            <IconX />
          </button>
        </div>
      ))}
    </div>
  );
}
