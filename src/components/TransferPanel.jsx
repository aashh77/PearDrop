"use client";

import { deviceIcon } from "@/components/Icons";
import FileDropZone from "@/components/FileDropZone";
import ProgressItem from "@/components/ProgressItem";
import SnippetEditor from "@/components/SnippetEditor";
import SnippetCard from "@/components/SnippetCard";
import { isFileSystemAccessSupported } from "@/lib/webrtc";

const STATUS_TEXT = {
  idle: "Not connected",
  connecting: "Opening a direct connection…",
  reconnecting: "Connection dropped — attempting to reconnect…",
  connected: "Connected — direct peer-to-peer link established",
  failed: "Connection failed. Try selecting the device again.",
  closed: "Connection closed.",
};

export default function TransferPanel({ peer, status, items, snippets, onSendFiles, onSendSnippet, myName }) {
  const connected = status === "connected";
  const ordered = [...items].sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-200">
          {deviceIcon(peer.deviceType)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{peer.name}</p>
          <p className="text-xs text-slate-400">{STATUS_TEXT[status] || status}</p>
        </div>
        {!isFileSystemAccessSupported() && (
          <p className="hidden max-w-[12rem] text-right text-[11px] text-slate-500 sm:block">
            This browser buffers received files in memory (no File System Access API).
          </p>
        )}
      </div>

      <FileDropZone disabled={!connected} onFiles={(files) => onSendFiles(files)} />

      <SnippetEditor disabled={!connected} onSend={onSendSnippet} />

      {ordered.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transfers</p>
          {ordered.map((item) => (
            <ProgressItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {snippets.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Snippets</p>
          {snippets.map((snippet) => (
            <SnippetCard key={snippet.id} snippet={snippet} />
          ))}
        </div>
      )}
    </div>
  );
}
