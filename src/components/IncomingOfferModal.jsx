"use client";

import { IconFile } from "@/components/Icons";
import { formatBytes } from "@/lib/format";

export default function IncomingOfferModal({ offer, senderName, onAccept, onReject }) {
  if (!offer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20">
            <IconFile />
          </div>
          <div>
            <p className="text-sm text-neutral-400">{senderName} wants to send</p>
            <p className="font-semibold text-white">{offer.name}</p>
          </div>
        </div>
        <p className="mb-5 text-sm text-neutral-400">Size: {formatBytes(offer.size)}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReject}
            className="flex-1 rounded-xl border border-neutral-700 bg-neutral-800/60 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 hover:text-white"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
