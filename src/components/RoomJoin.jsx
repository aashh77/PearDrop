"use client";

import { useState } from "react";
import { IconLink, IconWifi } from "@/components/Icons";

export default function RoomJoin({ networkKey, onJoinRoom, onUseLocalNetwork }) {
  const [code, setCode] = useState("");
  const isRoom = networkKey?.startsWith("room:");
  const currentRoomCode = isRoom ? networkKey.slice("room:".length) : "";

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <IconWifi className="text-violet-400" />
        <span>Discovery network</span>
      </div>

      {isRoom ? (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
          <span className="flex items-center gap-2">
            <IconLink /> Room <strong className="tracking-widest">{currentRoomCode}</strong>
          </span>
          <button
            type="button"
            onClick={onUseLocalNetwork}
            className="rounded-lg px-2 py-1 text-xs font-medium text-violet-300 transition hover:bg-violet-500/10 hover:text-violet-100"
          >
            Leave room
          </button>
        </div>
      ) : (
        <p className="mb-3 text-xs leading-relaxed text-neutral-400">
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
          className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-black px-3 py-2 text-sm uppercase tracking-widest text-white placeholder:text-neutral-600 placeholder:normal-case placeholder:tracking-normal outline-none transition focus:border-violet-500"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
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
  className="mt-3 w-full rounded-xl border border-violet-500 bg-violet-600 px-3 py-3 text-sm font-medium text-white transition hover:bg-violet-500"
>
  Create new room
</button>

    </div>
  );
}
