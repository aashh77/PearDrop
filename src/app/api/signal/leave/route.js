import { removePeer, broadcastPeerList } from "@/lib/signalStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handleLeave(request) {
  let body = {};
  try {
    // navigator.sendBeacon sends a Blob/string body; both parse as JSON here.
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }

  const { peerId } = body || {};
  if (peerId) {
    const removed = removePeer(peerId);
    if (removed) broadcastPeerList(removed.networkKey);
  }

  return Response.json({ ok: true });
}

export async function POST(request) {
  return handleLeave(request);
}
