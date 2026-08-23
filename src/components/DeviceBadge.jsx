"use client";

import { useState } from "react";
import { deviceIcon } from "@/components/Icons";

export default function DeviceBadge({ name, deviceType, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setDraft(name);
  }

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-neutral-800/80 bg-neutral-900/70 p-4 shadow-sm shadow-black/20 transition hover:border-neutral-700 hover:bg-neutral-900">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/15">
        <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition group-hover:opacity-100" />
        <div className="relative">
          {deviceIcon(deviceType)}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            This device
          </p>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
        </div>

        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(name);
                setEditing(false);
              }
            }}
            className="w-full rounded-lg border border-violet-500/60 bg-black/60 px-2.5 py-1.5 text-base font-semibold text-white outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex max-w-full items-center gap-2 text-left text-base font-semibold text-neutral-100 transition hover:text-violet-300"
            title="Click to rename this device"
          >
            <span className="truncate">{name}</span>
            <svg
              className="h-3.5 w-3.5 shrink-0 text-neutral-600 opacity-0 transition group-hover:opacity-100 group-hover:text-neutral-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M13.586 3.586a2 2 0 0 1 2.828 2.828l-8.5 8.5a1 1 0 0 1-.497.263l-3.25.75a1 1 0 0 1-1.2-1.2l.75-3.25a1 1 0 0 1 .263-.497l8.606-8.394ZM12.172 5 5.5 11.672l-.47 2.036 2.036-.47L13.828 6.5 12.172 5Z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
