"use client";

import { IconAlert, IconCheck, IconDownload, IconFile } from "@/components/Icons";
import { formatBytes } from "@/lib/format";
import { cx } from "@/lib/format";

export default function ProgressItem({ item }) {
  const pct = item.totalBytes ? Math.min(100, Math.round((item.bytesDone / item.totalBytes) * 100)) : 0;
  const isDone = item.status === "done";
  const isFailed = item.status === "failed" || item.status === "rejected";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex items-center gap-2">
        <IconFile className="shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{item.name}</p>
          <p className="text-xs text-slate-400">
            {item.direction === "send" ? "Sending" : "Receiving"} · {formatBytes(item.bytesDone)} /{" "}
            {formatBytes(item.totalBytes)}
          </p>
        </div>
        {isDone && (
          <span className={cx("flex items-center gap-1 text-xs", item.checksumOk === false ? "text-rose-400" : "text-emerald-400")}>
            {item.checksumOk === false ? <IconAlert /> : <IconCheck />}
            {item.checksumOk === false ? "Checksum mismatch" : "Verified"}
          </span>
        )}
        {isFailed && (
          <span className="flex items-center gap-1 text-xs text-rose-400">
            <IconAlert /> {item.status === "rejected" ? "Rejected" : "Failed"}
          </span>
        )}
        {item.direction === "receive" && isDone && item.url && (
          <a
            href={item.url}
            download={item.name}
            className="flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-500"
          >
            <IconDownload /> Save
          </a>
        )}
        {item.direction === "receive" && isDone && item.savedToDisk && (
          <span className="text-xs text-emerald-400">Saved to disk</span>
        )}
      </div>
      {!isDone && !isFailed && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
