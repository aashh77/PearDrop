"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import FileDropZone from "@/components/FileDropZone";
import PendingFileList from "@/components/PendingFileList";
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

export default function TransferPanel({
  peer,
  status,
  items,
  snippets,
  onSendFiles,
  onSendSnippet,
  onCancelSend,
  onRenameItem,
  myName,
}) {
  const connected = status === "connected";
  const ordered = [...items].sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
  const [staged, setStaged] = useState([]);

  function stageFiles(files) {
    setStaged((prev) => [...prev, ...files.map((file) => ({ localId: crypto.randomUUID(), file, name: file.name }))]);
  }

  function renameStaged(localId, name) {
    setStaged((prev) => prev.map((entry) => (entry.localId === localId ? { ...entry, name } : entry)));
  }

  function removeStaged(localId) {
    setStaged((prev) => prev.filter((entry) => entry.localId !== localId));
  }

  function sendStaged(localId) {
    const entry = staged.find((e) => e.localId === localId);
    if (!entry) return;
    setStaged((prev) => prev.filter((e) => e.localId !== localId));
    onSendFiles([{ file: entry.file, name: entry.name }]);
  }

  function sendAllStaged() {
    if (!staged.length) return;
    const toSend = staged.map((entry) => ({ file: entry.file, name: entry.name }));
    setStaged([]);
    onSendFiles(toSend);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 backdrop-blur-sm">
        <Avatar name={peer.name} deviceType={peer.deviceType} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{peer.name}</p>
          <p className="text-xs text-neutral-400">{STATUS_TEXT[status] || status}</p>
        </div>
        {!isFileSystemAccessSupported() && (
          <p className="hidden max-w-[12rem] text-right text-[11px] text-neutral-500 sm:block">
            This browser buffers received files in memory (no File System Access API).
          </p>
        )}
      </div>

      <FileDropZone disabled={!connected} onFiles={stageFiles} />

      {staged.length > 0 && (
        <PendingFileList
          entries={staged}
          disabled={!connected}
          onRename={renameStaged}
          onRemove={removeStaged}
          onSend={sendStaged}
          onSendAll={sendAllStaged}
        />
      )}

      <SnippetEditor disabled={!connected} onSend={onSendSnippet} />

      {ordered.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Transfers</p>
          {ordered.map((item) => (
            <ProgressItem key={item.id} item={item} onCancel={onCancelSend} onRename={onRenameItem} />
          ))}
        </div>
      )}

      {snippets.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Snippets</p>
          {snippets.map((snippet) => (
            <SnippetCard key={snippet.id} snippet={snippet} />
          ))}
        </div>
      )}
    </div>
  );
}
