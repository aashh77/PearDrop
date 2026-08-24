"use client";

import { IconCode, IconFile } from "@/components/Icons";
import { formatBytes, formatRelativeTime, cx } from "@/lib/format";

export default function HistoryPanel({ history }) {
  if (!history.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-4 text-center text-sm text-neutral-500">
        Completed transfers will show up here.
      </div>
    );
  }

  return (
    <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
      {history.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 px-3 py-2.5 text-xs transition hover:border-neutral-700 hover:bg-neutral-800/50"
        >
          <span
            className={cx(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
              entry.itemType === "text" ? "bg-violet-500/10 text-violet-300" : "bg-emerald-500/10 text-emerald-300",
            )}
          >
            {entry.itemType === "text" ? <IconCode /> : <IconFile />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-neutral-200">
              <span className="font-semibold">{entry.senderName}</span>
              <span className="text-neutral-600"> → </span>
              <span className="font-semibold">{entry.receiverName}</span>
            </p>
            <p className="truncate text-neutral-500">{entry.itemName}</p>
          </div>
          <div className="shrink-0 text-right text-neutral-500">
            <p>{entry.sizeBytes ? formatBytes(entry.sizeBytes) : "—"}</p>
            <p>{formatRelativeTime(entry.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
