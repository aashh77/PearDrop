"use client";

import { useState } from "react";
import { IconCheck, IconCopy, IconLink, IconQrCode, IconWifi } from "@/components/Icons";

function roomShareUrl(code) {
  if (typeof window === "undefined") return code;
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("room", code);
  return url.toString();
}

export default function RoomJoin({ networkKey, onJoinRoom, onUseLocalNetwork }) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrUnavailable, setQrUnavailable] = useState(false);

  const isRoom = networkKey?.startsWith("room:");
  const currentRoomCode = isRoom ? networkKey.slice("room:".length) : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(currentRoomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable; ignore silently
    }
  }

  async function toggleQr() {
    if (qrOpen) {
      setQrOpen(false);
      return;
    }
    setQrOpen(true);
    if (qrDataUrl || qrUnavailable) return;
    try {
      const QRCode = await import("qrcode");
      const dataUrl = await QRCode.toDataURL(roomShareUrl(currentRoomCode), {
        margin: 1,
        scale: 6,
        color: { dark: "#0a0a0a", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrUnavailable(true);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <IconWifi className="text-emerald-400" />
        <span>Discovery network</span>
      </div>

      {isRoom ? (
        <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-100">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <IconLink className="shrink-0" />
              <span className="truncate">
                Room <strong className="font-mono tracking-widest">{currentRoomCode}</strong>
              </span>
            </span>
            <button
              type="button"
              onClick={onUseLocalNetwork}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10 hover:text-emerald-100"
            >
              Leave
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-black/20 px-2.5 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-black/40"
            >
              {copied ? <IconCheck className="text-emerald-300" /> : <IconCopy />}
              {copied ? "Copied" : "Copy code"}
            </button>
            <button
              type="button"
              onClick={toggleQr}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-black/20 px-2.5 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-black/40"
            >
              <IconQrCode />
              {qrOpen ? "Hide QR" : "Show QR"}
            </button>
          </div>

          {qrOpen && (
            <div className="mt-3 flex flex-col items-center gap-2 rounded-xl bg-white p-3">
              {qrDataUrl && (
                <img src={qrDataUrl} alt={`QR code to join room ${currentRoomCode}`} className="h-40 w-40" />
              )}
              {!qrDataUrl && !qrUnavailable && (
                <p className="py-8 text-xs text-neutral-500">Generating QR code…</p>
              )}
              {qrUnavailable && (
                <p className="py-8 text-center text-xs text-neutral-500">
                  QR code isn&apos;t available right now — share the room code instead.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="mb-3 text-sm leading-relaxed text-neutral-400">
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
          aria-label="Room code"
          className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-black px-3 py-2.5 text-sm uppercase tracking-widest text-white placeholder:text-neutral-600 placeholder:normal-case placeholder:tracking-normal outline-none transition focus:border-emerald-500"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
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
        className="mt-3 w-full rounded-xl border border-emerald-500/60 bg-gradient-to-r from-emerald-600 to-violet-600 px-3 py-3 text-sm font-medium text-white transition hover:opacity-90"
      >
        Create new room
      </button>
    </div>
  );
}
