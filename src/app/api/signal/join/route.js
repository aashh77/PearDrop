import {
  networkKeyFor,
  upsertPeer,
  listNetworkPeers,
  extractClientIp,
  broadcastPeerList,
} from "@/lib/signalStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { peerId, name, deviceType, roomCode } = body || {};
  if (!peerId || typeof peerId !== "string") {
    return Response.json({ error: "peerId is required" }, { status: 400 });
  }

  const ip = extractClientIp(request);
  const networkKey = networkKeyFor(ip, roomCode);

  const peer = upsertPeer({ peerId, name, deviceType, networkKey });
  const peers = listNetworkPeers(networkKey, peer.id);

  // Let existing peers on this network know a newcomer has registered (their
  // SSE stream will show it as "online" once it attaches a connection).
  broadcastPeerList(networkKey);

  return Response.json({
    peerId: peer.id,
    networkKey,
    peers,
  });
}
