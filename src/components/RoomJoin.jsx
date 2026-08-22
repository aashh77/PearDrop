"use client";

import { useState } from "react";
import { IconLink, IconWifi } from "@/components/Icons";

export default function RoomJoin({ networkKey, onJoinRoom, onUseLocalNetwork }) {
  const [code, setCode] = useState("");
  const isRoom = networkKey?.startsWith("room:");
  const currentRoomCode = isRoom ? networkKey.slice("room:".length) : "";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <IconWifi className="text-sky-400" />
        <span>Discovery network</span>
      </div>

      {isRoom ? (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-sky-800 bg-sky-950/50 px-3 py-2 text-sm text-sky-100">
          <span className="flex items-center gap-2">
            <IconLink /> Room <strong className="tracking-widest">{currentRoomCode}</strong>
          </span>
          <button type="button" onClick={onUseLocalNetwork} className="text-xs text-sky-300 underline hover:text-sky-100">
            Leave room
          </button>
        </div>
      ) : (
        <p className="mb-3 text-xs text-slate-400">
          Devices on the same Wi-Fi / local network are discovered automatically. To pair with a
          device on a different network, share a room code.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = code.trim();
          if (trimmed) onJoinRoom(trimmed);
          setCode("");
        }}
        className="flex gap-2"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))}
          placeholder="Enter room code"
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm uppercase tracking-widest text-white placeholder:text-slate-600 placeholder:normal-case placeholder:tracking-normal outline-none focus:border-sky-500"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
        >
          Join
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          const generated = Math.random().toString(36).slice(2, 7).toUpperCase();
          onJoinRoom(generated);
        }}
        className="mt-2 text-xs text-slate-400 underline hover:text-slate-200"
      >
        or generate a new room code to share
      </button>
    </div>
  );
}
