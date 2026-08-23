"use client";

import { IconAlert, IconCheck, IconDownload, IconFile } from "@/components/Icons";
import { formatBytes } from "@/lib/format";
import { cx } from "@/lib/format";

export default function ProgressItem({ item }) {
  const pct = item.totalBytes ? Math.min(100, Math.round((item.bytesDone / item.totalBytes) * 100)) : 0;
  const isDone = item.status === "done";
  const isFailed = item.status === "failed" || item.status === "rejected";

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300">
          <IconFile className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{item.name}</p>
          <p className="text-xs text-neutral-400">
            {item.direction === "send" ? "Sending" : "Receiving"} · {formatBytes(item.bytesDone)} /{" "}
            {formatBytes(item.totalBytes)}
          </p>
        </div>
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
        {isFailed && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-rose-400">
            <IconAlert /> {item.status === "rejected" ? "Rejected" : "Failed"}
          </span>
        )}
        {item.direction === "receive" && isDone && item.url && (
          <a
            href={item.url}
            download={item.name}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90"
          >
            <IconDownload /> Save
          </a>
        )}
        {item.direction === "receive" && isDone && item.savedToDisk && (
          <span className="text-xs text-emerald-400">Saved to disk</span>
        )}
      </div>
      {!isDone && !isFailed && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
