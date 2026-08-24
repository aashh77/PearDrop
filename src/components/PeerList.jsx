"use client";

import Avatar from "@/components/Avatar";
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
  idle: "bg-neutral-500",
  connecting: "bg-amber-400 animate-pulse",
  reconnecting: "bg-amber-400 animate-pulse",
  connected: "bg-emerald-400",
  failed: "bg-rose-500",
  closed: "bg-neutral-600",
};

export default function PeerList({ peers, connections, activePeerId, onSelectPeer }) {
  if (!peers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/40 p-6 text-center text-sm text-neutral-400">
        Looking for other available devices.
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
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
                isActive
                  ? "border-emerald-500/70 bg-emerald-500/10"
                  : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-800/60",
              )}
            >
              <Avatar name={peer.name} deviceType={peer.deviceType} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{peer.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-neutral-400">
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
