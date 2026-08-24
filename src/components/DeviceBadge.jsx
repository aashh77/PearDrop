"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import { IconPencil } from "@/components/Icons";

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
      <Avatar name={name} deviceType={deviceType} size="lg" ringed />

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
            aria-label="Your device name"
            className="w-full rounded-lg border border-emerald-500/60 bg-black/60 px-2.5 py-1.5 text-base font-semibold text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex max-w-full items-center gap-2 rounded text-left text-base font-semibold text-neutral-100 transition hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            title="Click to rename this device"
          >
            <span className="truncate">{name}</span>
            <IconPencil className="shrink-0 text-neutral-600 opacity-0 transition group-hover:opacity-100 group-hover:text-neutral-400" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
