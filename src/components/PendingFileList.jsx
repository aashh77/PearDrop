"use client";

import { useState } from "react";
import { IconFile, IconPencil, IconSend, IconTrash } from "@/components/Icons";
import { formatBytes } from "@/lib/format";

function PendingRow({ entry, disabled, onRename, onRemove, onSend }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.name);

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== entry.name) onRename(entry.localId, trimmed);
    else setDraft(entry.name);
  }

  return (
    <li className="flex items-center gap-2.5 rounded-xl border border-neutral-800 bg-black/40 px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300">
        <IconFile className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(entry.name);
                setEditing(false);
              }
            }}
            aria-label="Rename file before sending"
            className="w-full rounded-lg border border-emerald-500/60 bg-black/60 px-2 py-1 text-sm font-medium text-white outline-none focus:border-emerald-400"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="group flex max-w-full items-center gap-1.5 rounded text-left text-sm font-medium text-white hover:text-emerald-300"
            title="Click to rename before sending"
          >
            <span className="truncate">{entry.name}</span>
            <IconPencil className="shrink-0 text-neutral-600 opacity-0 transition group-hover:opacity-100 group-hover:text-neutral-400" aria-hidden="true" />
          </button>
        )}
        <p className="text-xs text-neutral-500">{formatBytes(entry.file.size)}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(entry.localId)}
        aria-label={`Remove ${entry.name} from queue`}
        className="shrink-0 rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-800 hover:text-rose-400"
      >
        <IconTrash />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSend(entry.localId)}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <IconSend /> Send
      </button>
    </li>
  );
}

export default function PendingFileList({ entries, disabled, onRename, onRemove, onSend, onSendAll }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3.5 backdrop-blur-sm">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Ready to send · {entries.length} {entries.length === 1 ? "file" : "files"}
        </p>
        {entries.length > 1 && (
          <button
            type="button"
            disabled={disabled}
            onClick={onSendAll}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconSend /> Send all
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <PendingRow
            key={entry.localId}
            entry={entry}
            disabled={disabled}
            onRename={onRename}
            onRemove={onRemove}
            onSend={onSend}
          />
        ))}
      </ul>
    </div>
  );
}
