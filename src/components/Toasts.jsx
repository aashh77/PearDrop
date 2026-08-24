"use client";

import { IconAlert, IconCheck, IconX } from "@/components/Icons";
import { cx } from "@/lib/format";

export default function Toasts({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 pb-safe sm:inset-x-auto sm:right-4 sm:items-end"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cx(
            "pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur",
            toast.kind === "error" && "border-rose-500/30 bg-rose-950/90 text-rose-100",
            toast.kind === "success" && "border-emerald-500/30 bg-emerald-950/90 text-emerald-100",
            (!toast.kind || toast.kind === "info") && "border-neutral-700/50 bg-neutral-900/95 text-neutral-100",
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
            aria-label="Dismiss notification"
          >
            <IconX />
          </button>
        </div>
      ))}
    </div>
  );
}
