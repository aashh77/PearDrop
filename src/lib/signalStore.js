// In-memory signaling store shared by the /api/signal/* route handlers.
//
// This process never sees file bytes or text content - it only ever brokers
// tiny WebRTC SDP/ICE messages so two browsers can find each other and open
// a direct peer-to-peer data channel. State lives in memory (a Map) because
// LocalDrop is designed to run as a single Node.js process (self-hosted on a
// laptop, a Raspberry Pi, a small VPS, ...), exactly like the reference
// "Snapdrop" style tools it draws inspiration from.
//
// Peers are grouped into "networks" so that devices connected to the same
// Wi-Fi / LAN (and therefore sharing the same public IP behind a router/NAT)
// automatically discover each other with zero configuration - just like
// AirDrop. Anyone can also opt into a manual "room code" to bridge two
// different networks (e.g. a phone on cellular data joining a laptop on
// Wi-Fi) which is where WebRTC's STUN/TURN traversal earns its keep.

const globalStore = globalThis;

function createStore() {
  return {
    // peerId -> peer record
    peers: new Map(),
  };
}

const store = globalStore.__localDropSignalStore || createStore();
globalStore.__localDropSignalStore = store;

const STALE_MS = 60_000;

export function networkKeyFor(ip, roomCode) {
  const trimmedRoom = (roomCode || "").trim().toUpperCase();
  if (trimmedRoom) return `room:${trimmedRoom}`;
  return `lan:${ip || "unknown"}`;
}

export function upsertPeer({ peerId, name, deviceType, networkKey }) {
  const existing = store.peers.get(peerId);
  const peer = {
    id: peerId,
    name: name || "Unknown device",
    deviceType: deviceType || "laptop",
    networkKey,
    send: existing?.send || null,
    lastSeen: Date.now(),
  };
  store.peers.set(peerId, peer);
  return peer;
}

export function attachConnection(peerId, send) {
  const peer = store.peers.get(peerId);
  if (!peer) return null;
  peer.send = send;
  peer.lastSeen = Date.now();
  return peer;
}

export function removePeer(peerId) {
  const peer = store.peers.get(peerId);
  if (!peer) return null;
  store.peers.delete(peerId);
  return peer;
}

export function touchPeer(peerId) {
  const peer = store.peers.get(peerId);
  if (peer) peer.lastSeen = Date.now();
}

function isFresh(peer) {
  return Date.now() - peer.lastSeen < STALE_MS;
}

export function listNetworkPeers(networkKey, excludePeerId) {
  const results = [];
  for (const peer of store.peers.values()) {
    if (peer.networkKey !== networkKey) continue;
    if (peer.id === excludePeerId) continue;
    if (!isFresh(peer)) continue;
    results.push({ id: peer.id, name: peer.name, deviceType: peer.deviceType });
  }
  return results;
}

export function getPeer(peerId) {
  return store.peers.get(peerId) || null;
}

export function broadcastPeerList(networkKey) {
  for (const peer of store.peers.values()) {
    if (peer.networkKey !== networkKey) continue;
    if (!peer.send) continue;
    const list = listNetworkPeers(networkKey, peer.id);
    try {
      peer.send("peers", list);
    } catch {
      // Connection likely already closed; it will be cleaned up on its own.
    }
  }
}

export function sendToPeer(peerId, event, data) {
  const peer = store.peers.get(peerId);
  if (!peer || !peer.send) return false;
  try {
    peer.send(event, data);
    return true;
  } catch {
    return false;
  }
}

/** Best-effort extraction of the caller's IP address behind proxies. */
export function extractClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // No proxy headers available (e.g. plain local dev server) - fall back to
  // a constant bucket so peers on the same machine/dev server can still
  // discover one another out of the box.
  return "local-network";
}
