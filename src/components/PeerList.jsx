"use client";

import { deviceIcon } from "@/components/Icons";
import { cx } from "@/lib/format";

const STATUS_LABEL = {
  idle: "Tap to connect",
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
  connected: "Connected",
  failed: "Connection failed",
  closed: "Disconnected",
};

const STATUS_DOT = {
  idle: "bg-slate-500",
  connecting: "bg-amber-400 animate-pulse",
  reconnecting: "bg-amber-400 animate-pulse",
  connected: "bg-emerald-400",
  failed: "bg-rose-500",
  closed: "bg-slate-600",
};

export default function PeerList({ peers, connections, activePeerId, onSelectPeer }) {
  if (!peers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
        Looking for other devices on this network… open LocalDrop on another device (phone,
        tablet, laptop) connected to the same Wi-Fi, or join a shared room code.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {peers.map((peer) => {
        const status = connections[peer.id]?.status || "idle";
        const isActive = peer.id === activePeerId;
        return (
          <li key={peer.id}>
            <button
              type="button"
              onClick={() => onSelectPeer(peer)}
              className={cx(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                isActive
                  ? "border-sky-500 bg-sky-950/50"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-200">
                {deviceIcon(peer.deviceType)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{peer.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className={cx("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
                  {STATUS_LABEL[status] || status}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
