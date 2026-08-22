import { sendToPeer, touchPeer } from "@/lib/signalStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Forwards a tiny WebRTC signaling payload (SDP offer/answer or ICE
// candidate) from one browser to another. The server only relays bytes; it
// never inspects or stores them.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { toPeerId, fromPeerId, type, payload } = body || {};
  if (!toPeerId || !fromPeerId || !type) {
    return Response.json({ error: "toPeerId, fromPeerId and type are required" }, { status: 400 });
  }

  touchPeer(fromPeerId);

  const delivered = sendToPeer(toPeerId, "signal", { fromPeerId, type, payload });
  if (!delivered) {
    return Response.json({ error: "Target peer is not connected" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
