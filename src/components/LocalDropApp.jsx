"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DeviceBadge from "@/components/DeviceBadge";
import RoomJoin from "@/components/RoomJoin";
import PeerList from "@/components/PeerList";
import TransferPanel from "@/components/TransferPanel";
import IncomingOfferModal from "@/components/IncomingOfferModal";
import HistoryPanel from "@/components/HistoryPanel";
import Toasts from "@/components/Toasts";
import { createSignalingClient } from "@/lib/signalingClient";
import { PeerSession, isFileSystemAccessSupported } from "@/lib/webrtc";
import { detectDeviceType, loadOrCreateDeviceName, persistDeviceName } from "@/lib/deviceInfo";
import { renameFile } from "@/lib/format";

export default function LocalDropApp({ initialHistory }) {
  const [ready, setReady] = useState(false);
  const [myName, setMyName] = useState("");
  const [myDeviceType, setMyDeviceType] = useState("laptop");
  const [peers, setPeers] = useState([]);
  const [networkKey, setNetworkKey] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [connectionStatus, setConnectionStatus] = useState({});
  const [activePeerId, setActivePeerId] = useState(null);
  const [transfersByPeer, setTransfersByPeer] = useState({});
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState(initialHistory || []);

  const signalingRef = useRef(null);
  const sessionsRef = useRef({});
  const myNameRef = useRef("");
  const myDeviceTypeRef = useRef("laptop");
  const roomCodeRef = useRef("");
  const connectionStatusRef = useRef({});
  const peerNameRef = useRef({});
  const pendingSendResultsRef = useRef({});

  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  useEffect(() => {
    peerNameRef.current = Object.fromEntries(peers.map((p) => [p.id, p.name]));
  }, [peers]);

  const addToast = useCallback((message, kind = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshHistory = useCallback(() => {
    fetch("/api/transfers")
      .then((res) => res.json())
      .then((data) => setHistory(data.transfers || []))
      .catch(() => {});
  }, []);

  const logTransfer = useCallback(
    (payload) => {
      fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(refreshHistory)
        .catch(() => {});
    },
    [refreshHistory],
  );

  function updateTransfers(peerId, updater) {
    setTransfersByPeer((prev) => {
      const current = prev[peerId] || { items: [], snippets: [] };
      return { ...prev, [peerId]: updater(current) };
    });
  }

  function addItem(peerId, item) {
    updateTransfers(peerId, (cur) => ({ ...cur, items: [...cur.items, item] }));
  }

  function updateItemProgress(peerId, { transferId, bytesDone, totalBytes }) {
    updateTransfers(peerId, (cur) => ({
      ...cur,
      items: cur.items.map((it) =>
        it.id === transferId ? { ...it, bytesDone, totalBytes: totalBytes ?? it.totalBytes } : it,
      ),
    }));
  }

  function updateItemStatus(peerId, transferId, status) {
    updateTransfers(peerId, (cur) => ({
      ...cur,
      items: cur.items.map((it) => (it.id === transferId ? { ...it, status } : it)),
    }));
  }

  function updateItemFinal(peerId, transferId, patch) {
    updateTransfers(peerId, (cur) => ({
      ...cur,
      items: cur.items.map((it) => (it.id === transferId ? { ...it, ...patch, bytesDone: it.totalBytes } : it)),
    }));
  }

  function addSnippet(peerId, snippet) {
    updateTransfers(peerId, (cur) => ({ ...cur, snippets: [snippet, ...cur.snippets] }));
  }

  const handleAck = useCallback(
    (peerId, { transferId, ok }) => {
      updateItemFinal(peerId, transferId, { status: "done", checksumOk: ok });
      const pending = pendingSendResultsRef.current[transferId];
      if (pending) {
        delete pendingSendResultsRef.current[transferId];
        logTransfer({
          senderName: myNameRef.current,
          receiverName: peerNameRef.current[peerId] || "peer",
          itemType: "file",
          itemName: pending.file.name,
          sizeBytes: pending.file.size,
          checksum: pending.result.checksum,
          status: ok ? "completed" : "failed",
        });
        if (!ok) addToast(`${pending.file.name} failed checksum verification on the receiving end.`, "error");
      }
    },
    [addToast, logTransfer],
  );

  const handleFileOffer = useCallback((peerId, offer) => {
    setIncomingOffer({ peerId, offer });
  }, []);

  const handleFileComplete = useCallback(
    (peerId, result) => {
      const url = result.blob ? URL.createObjectURL(result.blob) : null;
      updateItemFinal(peerId, result.transferId, {
        status: "done",
        checksumOk: result.checksumOk,
        url,
        savedToDisk: result.savedToDisk,
      });
      if (!result.checksumOk) {
        addToast(`Checksum mismatch for "${result.name}" — the file may be corrupted.`, "error");
      } else {
        addToast(`Received "${result.name}"`, "success");
      }
      refreshHistory();
    },
    [addToast, refreshHistory],
  );

  const handleTextReceived = useCallback(
    (peerId, msg) => {
      addSnippet(peerId, { id: msg.id, name: msg.name, language: msg.language, content: msg.content, fromName: msg.fromName });
      addToast(`Received snippet "${msg.name}" from ${msg.fromName || "peer"}`, "success");
      refreshHistory();
    },
    [addToast, refreshHistory],
  );

  const handleFileCancelled = useCallback((peerId, transferId) => {
    setIncomingOffer((prev) =>
      prev && prev.peerId === peerId && prev.offer.transferId === transferId ? null : prev,
    );
    updateTransfers(peerId, (cur) => ({
      ...cur,
      items: cur.items.map((it) => (it.id === transferId ? { ...it, status: "cancelled" } : it)),
    }));
  }, []);

  const createSession = useCallback(
    (peerId, isInitiator) => {
      const session = new PeerSession({
        signaling: signalingRef.current,
        remotePeerId: peerId,
        isInitiator,
        callbacks: {
          onStateChange: (state) => setConnectionStatus((prev) => ({ ...prev, [peerId]: state })),
          onError: (err) => addToast(err?.message || "Connection error", "error"),
          onProgress: (p) => updateItemProgress(peerId, p),
          onFileOffer: (offer) => handleFileOffer(peerId, offer),
          onFileAccept: (msg) => updateItemStatus(peerId, msg.transferId, "active"),
          onFileComplete: (result) => handleFileComplete(peerId, result),
          onFileCancelled: (transferId) => handleFileCancelled(peerId, transferId),
          onAck: (ack) => handleAck(peerId, ack),
          onTextReceived: (msg) => handleTextReceived(peerId, msg),
        },
      });
      sessionsRef.current[peerId] = session;
      session.start();
      return session;
    },
    [addToast, handleAck, handleFileCancelled, handleFileComplete, handleFileOffer, handleTextReceived],
  );

  const handleSignal = useCallback(
    ({ fromPeerId, type, payload }) => {
      let session = sessionsRef.current[fromPeerId];
      if (!session && type === "offer") {
        session = createSession(fromPeerId, false);
      }
      session?.handleSignal({ type, payload });
    },
    [createSession],
  );

  const attachClientHandlers = useCallback(
    (client) => {
      client.on({
        onPeers: (list) => setPeers(list),
        onSignal: handleSignal,
        onError: () => addToast("Signaling connection interrupted — retrying…", "error"),
      });
    },
    [addToast, handleSignal],
  );

  useEffect(() => {
    const name = loadOrCreateDeviceName();
    const type = detectDeviceType();
    setMyName(name);
    setMyDeviceType(type);
    myNameRef.current = name;
    myDeviceTypeRef.current = type;

    // A room code in the URL (e.g. from a shared QR code / link) lets a
    // scanning device join that room automatically instead of typing it in.
    let initialRoomCode = "";
    try {
      const params = new URLSearchParams(window.location.search);
      initialRoomCode = (params.get("room") || "").toUpperCase().slice(0, 12);
    } catch {
      initialRoomCode = "";
    }
    roomCodeRef.current = initialRoomCode;
    if (initialRoomCode) setRoomCode(initialRoomCode);

    const client = createSignalingClient();
    signalingRef.current = client;
    attachClientHandlers(client);

    client
      .join({ name, deviceType: type, roomCode: initialRoomCode })
      .then(({ peers: initialPeers, networkKey: key }) => {
        setPeers(initialPeers);
        setNetworkKey(key);
        setReady(true);
        if (initialRoomCode) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      })
      .catch(() => addToast("Could not reach the signaling server. Retrying may help.", "error"));

    const handleUnload = () => client.leave();
    window.addEventListener("beforeunload", handleUnload);
    const historyInterval = setInterval(refreshHistory, 8000);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      clearInterval(historyInterval);
      client.leave();
      Object.values(sessionsRef.current).forEach((s) => s.close());
      sessionsRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectPeer = useCallback(
    (peer) => {
      setActivePeerId(peer.id);
      const status = connectionStatusRef.current[peer.id];
      if (!sessionsRef.current[peer.id] || status === "closed" || status === "failed") {
        createSession(peer.id, true);
      }
    },
    [createSession],
  );

  async function switchNetwork(newRoomCode) {
    Object.values(sessionsRef.current).forEach((s) => s.close());
    sessionsRef.current = {};
    setConnectionStatus({});
    setActivePeerId(null);
    setTransfersByPeer({});
    signalingRef.current?.leave();

    const client = createSignalingClient();
    signalingRef.current = client;
    attachClientHandlers(client);
    roomCodeRef.current = newRoomCode;
    setRoomCode(newRoomCode);

    try {
      const { peers: newPeers, networkKey: key } = await client.join({
        name: myNameRef.current,
        deviceType: myDeviceTypeRef.current,
        roomCode: newRoomCode,
      });
      setPeers(newPeers);
      setNetworkKey(key);
      addToast(newRoomCode ? `Joined room ${newRoomCode}` : "Back on your local network", "success");
    } catch {
      addToast("Could not switch networks.", "error");
    }
  }

  function handleRename(newName) {
    setMyName(newName);
    myNameRef.current = newName;
    persistDeviceName(newName);
    const peerId = signalingRef.current?.getPeerId();
    if (peerId) {
      fetch("/api/signal/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId, name: newName, deviceType: myDeviceTypeRef.current, roomCode: roomCodeRef.current }),
      }).catch(() => {});
    }
  }

  async function handleSendFiles(peerId, files) {
    const session = sessionsRef.current[peerId];
    if (!session || connectionStatusRef.current[peerId] !== "connected") {
      addToast("Not connected to this device yet.", "error");
      return;
    }
    for (const entry of files) {
      const file = entry?.file ? renameFile(entry.file, entry.name) : entry;
      const transferId = crypto.randomUUID();
      addItem(peerId, {
        id: transferId,
        name: file.name,
        direction: "send",
        bytesDone: 0,
        totalBytes: file.size,
        status: "pending",
        startedAt: Date.now(),
      });
      try {
        const result = await session.sendFile(file, {
          transferId,
          fromName: myNameRef.current,
          onProgress: (p) => updateItemProgress(peerId, p),
        });
        pendingSendResultsRef.current[transferId] = { file, result, peerId };
        updateItemStatus(peerId, transferId, "verifying");
      } catch (err) {
        const message = err?.message || "";
        const cancelled = /cancelled/i.test(message);
        const rejected = /rejected/i.test(message);
        const status = cancelled ? "cancelled" : rejected ? "rejected" : "failed";
        updateItemFinal(peerId, transferId, { status });
        if (cancelled) {
          addToast(`Cancelled: ${file.name}`, "info");
        } else {
          addToast(`${rejected ? "Declined" : "Failed to send"}: ${file.name}`, "error");
          logTransfer({
            senderName: myNameRef.current,
            receiverName: peerNameRef.current[peerId] || "peer",
            itemType: "file",
            itemName: file.name,
            sizeBytes: file.size,
            status,
          });
        }
      }
    }
  }

  function handleCancelSend(peerId, transferId) {
    const session = sessionsRef.current[peerId];
    session?.cancelSendFile(transferId);
  }

  function handleRenameItem(peerId, transferId, newName) {
    const trimmed = (newName || "").trim();
    if (!trimmed) return;
    updateTransfers(peerId, (cur) => ({
      ...cur,
      items: cur.items.map((it) => (it.id === transferId ? { ...it, name: trimmed } : it)),
    }));
  }

  function handleSendSnippet(peerId, { name, language, content }) {
    const session = sessionsRef.current[peerId];
    if (!session || connectionStatusRef.current[peerId] !== "connected") {
      addToast("Not connected to this device yet.", "error");
      return;
    }
    try {
      session.sendText({ name, language, content, fromName: myNameRef.current });
      addSnippet(peerId, { id: crypto.randomUUID(), name, language, content, fromName: "You" });
      logTransfer({
        senderName: myNameRef.current,
        receiverName: peerNameRef.current[peerId] || "peer",
        itemType: "text",
        itemName: name,
        sizeBytes: new Blob([content]).size,
        status: "completed",
      });
    } catch (err) {
      addToast(`Failed to send snippet: ${err.message}`, "error");
    }
  }

  async function handleAcceptOffer() {
    const { peerId, offer } = incomingOffer;
    const session = sessionsRef.current[peerId];
    setIncomingOffer(null);
    setActivePeerId(peerId);
    addItem(peerId, {
      id: offer.transferId,
      name: offer.name,
      direction: "receive",
      bytesDone: 0,
      totalBytes: offer.size,
      status: "active",
      startedAt: Date.now(),
    });

    let writer = null;
    if (isFileSystemAccessSupported()) {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName: offer.name });
        writer = await handle.createWritable();
      } catch {
        writer = null;
      }
    }

    session.beginReceivingFile(offer, writer);
    session.acceptIncomingFile(offer.transferId);
  }

  function handleRejectOffer() {
    const { peerId, offer } = incomingOffer;
    sessionsRef.current[peerId]?.rejectIncomingFile(offer.transferId);
    setIncomingOffer(null);
    logTransfer({
      senderName: offer.fromName || "peer",
      receiverName: myNameRef.current,
      itemType: "file",
      itemName: offer.name,
      sizeBytes: offer.size,
      status: "rejected",
    });
  }

  const activePeer = peers.find((p) => p.id === activePeerId);
  const activeTransfers = transfersByPeer[activePeerId] || { items: [], snippets: [] };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="pt-safe sticky top-0 z-40 border-b border-neutral-800/70 bg-neutral-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <img src="/logo.png" alt="PearDrop" className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">PearDrop</h1>
            <p className="hidden text-sm text-neutral-400 sm:block">
              Peer-to-peer file &amp; snippet transfer — nothing touches a server.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {ready ? (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs text-neutral-500">
                <span className="h-2 w-2 rounded-full bg-neutral-600" />
                Connecting…
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
          {/* Aside contains Device Info, Room Join, and Peer List. History is rendered separately below on mobile */}
          <aside className="flex flex-col gap-5">
            {ready ? (
              <DeviceBadge name={myName} deviceType={myDeviceType} onRename={handleRename} />
            ) : (
              <div className="animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 py-6 text-center text-sm text-neutral-500">
                Connecting to signaling server…
              </div>
            )}

            <RoomJoin networkKey={networkKey} onJoinRoom={(code) => switchNetwork(code)} onUseLocalNetwork={() => switchNetwork("")} />

            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Nearby devices</h2>
              <PeerList peers={peers} connections={connectionStatus} activePeerId={activePeerId} onSelectPeer={selectPeer} />
            </section>

            {/* Hidden on mobile, shown on desktop inside sidebar */}
            <section className="hidden lg:flex min-h-0 flex-1 flex-col">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Recent activity</h2>
              <HistoryPanel history={history} />
            </section>
          </aside>

          {/* Main area contains transfer panel, and recent activity directly underneath on mobile */}
          <div className="flex flex-col gap-6">
            <main className="flex min-h-[24rem] flex-1 flex-col">
              {activePeer ? (
                <TransferPanel
                  key={activePeer.id}
                  peer={activePeer}
                  status={connectionStatus[activePeer.id] || "connecting"}
                  items={activeTransfers.items}
                  snippets={activeTransfers.snippets}
                  myName={myName}
                  onSendFiles={(files) => handleSendFiles(activePeer.id, files)}
                  onSendSnippet={(payload) => handleSendSnippet(activePeer.id, payload)}
                  onCancelSend={(transferId) => handleCancelSend(activePeer.id, transferId)}
                  onRenameItem={(transferId, name) => handleRenameItem(activePeer.id, transferId, name)}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/30 p-10 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-violet-500/15 text-emerald-300">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 16V4" />
                      <path d="m6 10 6-6 6 6" />
                      <path d="M4 20h16" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-white">Select a device to start transferring</p>
                  <p className="mt-1.5 max-w-sm text-sm text-neutral-400">
                    Open PearDrop on another device and connect to it from the list.
                  </p>
                </div>
              )}
            </main>

            {/* Shown only on mobile devices below the transfer panel/placeholder */}
            <section className="flex lg:hidden flex-col">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Recent activity</h2>
              <HistoryPanel history={history} />
            </section>
          </div>
        </div>
      </div>

      <IncomingOfferModal
        offer={incomingOffer?.offer}
        senderName={incomingOffer?.offer?.fromName || "A device"}
        onAccept={handleAcceptOffer}
        onReject={handleRejectOffer}
      />

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}