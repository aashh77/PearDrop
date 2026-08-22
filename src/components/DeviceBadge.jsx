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
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
        {deviceIcon(deviceType)}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-slate-400">This device</p>
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
            className="w-full rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-sm font-semibold text-white outline-none focus:border-sky-500"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="truncate text-left text-sm font-semibold text-white hover:underline"
            title="Click to rename this device"
          >
            {name}
          </button>
        )}
      </div>
    </div>
  );
}
