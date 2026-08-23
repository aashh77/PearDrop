"use client";

import { useRef, useState } from "react";
import { IconUpload } from "@/components/Icons";
import { cx } from "@/lib/format";

export default function FileDropZone({ disabled, onFiles }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length) onFiles(files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cx(
        "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition",
        disabled && "cursor-not-allowed opacity-50",
        dragging
          ? "border-violet-400 bg-violet-500/10"
          : "border-neutral-700 bg-neutral-900/40 hover:border-violet-500/60 hover:bg-neutral-900/60",
      )}
    >
      <div
        className={cx(
          "flex h-14 w-14 items-center justify-center rounded-2xl transition",
          dragging ? "bg-violet-500 text-white" : "bg-neutral-800 text-neutral-400 group-hover:text-violet-300",
        )}
      >
        <IconUpload className="h-7 w-7" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">Drop files to send</p>
        <p className="text-xs text-neutral-400">or click to browse · 64 KB chunks · direct P2P</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
