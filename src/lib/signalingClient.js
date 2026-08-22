// Thin client for the SSE + fetch signaling API. Handles:
//  - registering this browser tab as a "peer" (POST /api/signal/join)
//  - opening a persistent event stream to receive peer-list updates and
//    forwarded WebRTC offers/answers/ICE candidates (GET /api/signal/events)
//  - relaying our own offers/answers/ICE candidates to a specific peer
//    (POST /api/signal/message)
//  - best-effort cleanup on tab close (POST /api/signal/leave via sendBeacon)

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `peer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createSignalingClient() {
  let peerId = null;
  let source = null;
  let handlers = { onPeers: null, onSignal: null, onOpen: null, onError: null };

  async function join({ name, deviceType, roomCode }) {
    peerId = randomId();

    const res = await fetch("/api/signal/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peerId, name, deviceType, roomCode }),
    });

    if (!res.ok) throw new Error("Failed to join the signaling network");
    const data = await res.json();

    source = new EventSource(`/api/signal/events?peerId=${encodeURIComponent(peerId)}`);
    source.addEventListener("peers", (event) => handlers.onPeers?.(JSON.parse(event.data)));
    source.addEventListener("signal", (event) => handlers.onSignal?.(JSON.parse(event.data)));
    source.onopen = () => handlers.onOpen?.();
    source.onerror = (event) => handlers.onError?.(event);

    return { peerId, peers: data.peers || [], networkKey: data.networkKey };
  }

  function on(events) {
    handlers = { ...handlers, ...events };
  }

  async function send(toPeerId, type, payload) {
    if (!peerId) throw new Error("Not joined yet");
    const res = await fetch("/api/signal/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toPeerId, fromPeerId: peerId, type, payload }),
    });
    if (!res.ok && res.status !== 404) {
      throw new Error("Failed to deliver signaling message");
    }
    return res.ok;
  }

  function leave() {
    if (peerId && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/signal/leave", JSON.stringify({ peerId }));
    }
    source?.close();
    source = null;
  }

  function getPeerId() {
    return peerId;
  }

  return { join, on, send, leave, getPeerId };
}
