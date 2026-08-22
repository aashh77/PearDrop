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
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition",
        disabled && "cursor-not-allowed opacity-50",
        dragging ? "border-sky-500 bg-sky-950/30" : "border-slate-700 bg-slate-900/40 hover:border-slate-600",
      )}
    >
      <IconUpload className="text-sky-400" />
      <p className="text-sm font-medium text-white">Drag & drop files here</p>
      <p className="text-xs text-slate-400">or click to browse — any size, sent directly in 64KB chunks</p>
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
