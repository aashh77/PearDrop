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
          onFileComplete: (result) => handleFileComplete(peerId, result),
          onAck: (ack) => handleAck(peerId, ack),
          onTextReceived: (msg) => handleTextReceived(peerId, msg),
        },
      });
      sessionsRef.current[peerId] = session;
      session.start();
      return session;
    },
    [addToast, handleAck, handleFileComplete, handleFileOffer, handleTextReceived],
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

    const client = createSignalingClient();
    signalingRef.current = client;
    attachClientHandlers(client);

    client
      .join({ name, deviceType: type, roomCode: "" })
      .then(({ peers: initialPeers, networkKey: key }) => {
        setPeers(initialPeers);
        setNetworkKey(key);
        setReady(true);
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
    for (const file of files) {
      const transferId = crypto.randomUUID();
      addItem(peerId, {
        id: transferId,
        name: file.name,
        direction: "send",
        bytesDone: 0,
        totalBytes: file.size,
        status: "active",
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
        const rejected = /rejected/i.test(err?.message || "");
        updateItemFinal(peerId, transferId, { status: rejected ? "rejected" : "failed" });
        addToast(`${rejected ? "Declined" : "Failed to send"}: ${file.name}`, "error");
        logTransfer({
          senderName: myNameRef.current,
          receiverName: peerNameRef.current[peerId] || "peer",
          itemType: "file",
          itemName: file.name,
          sizeBytes: file.size,
          status: rejected ? "rejected" : "failed",
        });
      }
    }
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
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-3xl font-bold text-transparent">
          LocalDrop
        </h1>
        <p className="text-sm text-slate-400">
          Peer-to-peer file &amp; snippet transfer. Files stream directly between browsers over WebRTC — nothing is
          uploaded to a server.
        </p>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
        <aside className="flex flex-col gap-4">
          {ready ? (
            <DeviceBadge name={myName} deviceType={myDeviceType} onRename={handleRename} />
          ) : (
            <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-6 text-center text-xs text-slate-500">
              Connecting to signaling server…
            </div>
          )}

          <RoomJoin networkKey={networkKey} onJoinRoom={(code) => switchNetwork(code)} onUseLocalNetwork={() => switchNetwork("")} />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Nearby devices</p>
            <PeerList peers={peers} connections={connectionStatus} activePeerId={activePeerId} onSelectPeer={selectPeer} />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent activity</p>
            <HistoryPanel history={history} />
          </div>
        </aside>

        <main className="flex flex-1 flex-col">
          {activePeer ? (
            <TransferPanel
              peer={activePeer}
              status={connectionStatus[activePeer.id] || "connecting"}
              items={activeTransfers.items}
              snippets={activeTransfers.snippets}
              myName={myName}
              onSendFiles={(files) => handleSendFiles(activePeer.id, files)}
              onSendSnippet={(payload) => handleSendSnippet(activePeer.id, payload)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center">
              <p className="text-lg font-medium text-white">Select a device to start transferring</p>
              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Open LocalDrop on another device connected to the same network (or share a room code) and pick it
                from the list on the left.
              </p>
            </div>
          )}
        </main>
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
