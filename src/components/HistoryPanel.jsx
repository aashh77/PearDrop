"use client";

import { IconCode, IconFile } from "@/components/Icons";
import { formatBytes, formatRelativeTime } from "@/lib/format";

export default function HistoryPanel({ history }) {
  if (!history.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-center text-xs text-slate-500">
        Completed transfers will show up here.
      </div>
    );
  }

  return (
    <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
      {history.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs"
        >
          <span className="shrink-0 text-slate-500">{entry.itemType === "text" ? <IconCode /> : <IconFile />}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-slate-200">
              <span className="font-medium">{entry.senderName}</span>
              <span className="text-slate-500"> → </span>
              <span className="font-medium">{entry.receiverName}</span>
            </p>
            <p className="truncate text-slate-500">{entry.itemName}</p>
          </div>
          <div className="shrink-0 text-right text-slate-500">
            <p>{entry.sizeBytes ? formatBytes(entry.sizeBytes) : "—"}</p>
            <p>{formatRelativeTime(entry.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
