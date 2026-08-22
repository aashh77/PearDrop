import { attachConnection, getPeer, removePeer, broadcastPeerList } from "@/lib/signalStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Server-Sent Events stream: one long-lived HTTP response per connected
// browser tab. This is our "WebSocket-lite" transport for signaling -
// it works over a single plain HTTP port (friendly to proxies/tunnels) and
// needs no extra server process alongside Next.js.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const peerId = searchParams.get("peerId");

  if (!peerId) {
    return new Response("Missing peerId", { status: 400 });
  }

  const peer = getPeer(peerId);
  if (!peer) {
    return new Response("Unknown peerId - call /api/signal/join first", { status: 404 });
  }

  const encoder = new TextEncoder();
  let keepAlive;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event, data) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      attachConnection(peerId, send);
      send("hello", { peerId });
      broadcastPeerList(peer.networkKey);

      keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          // stream already closed; cleanup handled by 'abort' below.
        }
      }, 25000);

      const cleanup = () => {
        clearInterval(keepAlive);
        const removed = removePeer(peerId);
        if (removed) broadcastPeerList(removed.networkKey);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      clearInterval(keepAlive);
      const removed = removePeer(peerId);
      if (removed) broadcastPeerList(removed.networkKey);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
