"use client";

import { IconFile } from "@/components/Icons";
import { formatBytes } from "@/lib/format";

export default function IncomingOfferModal({ offer, senderName, onAccept, onReject }) {
  if (!offer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-600/20 text-sky-300">
            <IconFile />
          </div>
          <div>
            <p className="text-sm text-slate-400">{senderName} wants to send</p>
            <p className="font-semibold text-white">{offer.name}</p>
          </div>
        </div>
        <p className="mb-5 text-sm text-slate-400">Size: {formatBytes(offer.size)}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReject}
            className="flex-1 rounded-lg border border-slate-700 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
