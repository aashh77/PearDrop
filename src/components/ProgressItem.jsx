"use client";

import { useState } from "react";
import { IconAlert, IconCheck, IconDownload, IconFile, IconPencil, IconX } from "@/components/Icons";
import { formatBytes, cx } from "@/lib/format";

const TERMINAL_LABEL = {
  failed: "Failed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export default function ProgressItem({ item, onCancel, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);

  const pct = item.totalBytes ? Math.min(100, Math.round((item.bytesDone / item.totalBytes) * 100)) : 0;
  const isPending = item.status === "pending";
  const isDone = item.status === "done";
  const isTerminalFailure = item.status === "failed" || item.status === "rejected" || item.status === "cancelled";
  const canRename = item.direction === "receive" && isDone && typeof onRename === "function";

  function commitRename() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== item.name) onRename(item.id, trimmed);
    else setDraft(item.name);
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300">
          <IconFile className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraft(item.name);
                  setEditing(false);
                }
              }}
              aria-label="Rename received file"
              className="w-full rounded-lg border border-emerald-500/60 bg-black/60 px-2 py-1 text-sm font-medium text-white outline-none focus:border-emerald-400"
            />
          ) : (
            <button
              type="button"
              disabled={!canRename}
              onClick={() => canRename && setEditing(true)}
              className={cx(
                "group flex max-w-full items-center gap-1.5 rounded text-left text-sm font-medium text-white",
                canRename && "hover:text-emerald-300",
              )}
              title={canRename ? "Click to rename this file" : undefined}
            >
              <span className="truncate">{item.name}</span>
              {canRename && (
                <IconPencil
                  className="shrink-0 text-neutral-600 opacity-0 transition group-hover:opacity-100 group-hover:text-neutral-400"
                  aria-hidden="true"
                />
              )}
            </button>
          )}
          <p className="text-xs text-neutral-400">
            {isPending
              ? "Waiting for approval…"
              : isTerminalFailure
                ? item.direction === "send"
                  ? "Send"
                  : "Receive"
                : `${item.direction === "send" ? "Sending" : "Receiving"} · ${formatBytes(item.bytesDone)} / ${formatBytes(item.totalBytes)}`}
          </p>
        </div>
        {isPending && item.direction === "send" && (
          <button
            type="button"
            onClick={() => onCancel?.(item.id)}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800/60 px-2.5 py-1 text-xs font-medium text-neutral-200 transition hover:border-rose-500/50 hover:text-rose-300"
          >
            <IconX className="h-3.5 w-3.5" /> Cancel
          </button>
        )}
        {isDone && (
          <span
            className={cx(
              "flex shrink-0 items-center gap-1 text-xs",
              item.checksumOk === false ? "text-rose-400" : "text-emerald-400",
            )}
          >
            {item.checksumOk === false ? <IconAlert /> : <IconCheck />}
            {item.checksumOk === false ? "Checksum mismatch" : "Verified"}
          </span>
        )}
        {isTerminalFailure && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-rose-400">
            <IconAlert /> {TERMINAL_LABEL[item.status] || "Failed"}
          </span>
        )}
        {item.direction === "receive" && isDone && item.url && (
          <a
            href={item.url}
            download={item.name}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-500 to-violet-600 px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90"
          >
            <IconDownload /> Save
          </a>
        )}
        {item.direction === "receive" && isDone && item.savedToDisk && (
          <span className="text-xs text-emerald-400">Saved to disk</span>
        )}
      </div>
      {!isPending && !isDone && !isTerminalFailure && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
