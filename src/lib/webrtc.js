// PeerSession: wraps a single RTCPeerConnection + RTCDataChannel between the
// local browser and one remote peer, implementing:
//   - chunked file sending (File.slice) with backpressure-aware buffering
//   - a tiny JSON control protocol multiplexed on the same data channel
//   - streaming CRC32 checksum verification
//   - graceful handling of dropped connections / ICE restarts
//
// The data channel only ever carries two kinds of messages:
//   1. UTF-8 JSON strings   -> control messages (offers to send a file,
//      accept/reject, text snippets, end-of-file + checksum, ack, ...)
//   2. Raw ArrayBuffers     -> the next chunk of whichever file transfer is
//      currently "active" for that direction. Only one file is ever
//      in-flight per direction at a time, which keeps chunk framing trivial
//      (no per-chunk header/transferId overhead needed).
import { crc32Init, crc32Update, crc32Finalize } from "@/lib/crc32";

export const CHUNK_SIZE = 64 * 1024; // 64KB chunks
const BUFFERED_AMOUNT_HIGH_WATERMARK = 8 * CHUNK_SIZE; // pause sending above this
const BUFFERED_AMOUNT_LOW_WATERMARK = 2 * CHUNK_SIZE; // resume sending below this

function buildIceServers() {
  const servers = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }

  return servers;
}

function waitForBufferedAmountLow(channel) {
  if (channel.bufferedAmount <= BUFFERED_AMOUNT_LOW_WATERMARK) return Promise.resolve();
  return new Promise((resolve) => {
    const handler = () => {
      channel.removeEventListener("bufferedamountlow", handler);
      resolve();
    };
    channel.addEventListener("bufferedamountlow", handler);
  });
}

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class PeerSession {
  /**
   * @param {object} opts
   * @param {object} opts.signaling - signaling client (see signalingClient.js)
   * @param {string} opts.remotePeerId
   * @param {boolean} opts.isInitiator
   * @param {object} opts.callbacks - { onStateChange, onFileOffer, onProgress,
   *   onFileComplete, onTextReceived, onAck, onError }
   */
  constructor({ signaling, remotePeerId, isInitiator, callbacks }) {
    this.signaling = signaling;
    this.remotePeerId = remotePeerId;
    this.isInitiator = isInitiator;
    this.callbacks = callbacks || {};
    this.pc = null;
    this.channel = null;
    this.state = "connecting";
    this.sendQueue = [];
    this.sendingActive = false;
    this.incoming = null; // active inbound transfer state
    this.reconnectAttempts = 0;
    this.pendingCandidates = [];
    this.pendingSends = new Map(); // transferId -> { cancel() }
  }

  _setState(state) {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  async start() {
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    this.pc = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send(this.remotePeerId, "ice-candidate", event.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const cs = this.pc.connectionState;
      if (cs === "connected") {
        this.reconnectAttempts = 0;
        this._setState("connected");
      } else if (cs === "failed" || cs === "disconnected") {
        this._setState(cs === "failed" ? "failed" : "reconnecting");
        this._tryIceRestart();
      } else if (cs === "closed") {
        this._setState("closed");
      }
    };

    if (this.isInitiator) {
      const channel = pc.createDataChannel("localdrop", { ordered: true });
      this._setupChannel(channel);
    } else {
      pc.ondatachannel = (event) => this._setupChannel(event.channel);
    }

    if (this.isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.signaling.send(this.remotePeerId, "offer", { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
    }
  }

  async _tryIceRestart() {
    if (!this.pc || !this.isInitiator) return;
    if (this.reconnectAttempts >= 3) return;
    this.reconnectAttempts += 1;
    try {
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      this.signaling.send(this.remotePeerId, "offer", {
        sdp: this.pc.localDescription.sdp,
        type: this.pc.localDescription.type,
      });
    } catch (error) {
      this.callbacks.onError?.(error);
    }
  }

  async handleSignal({ type, payload }) {
    const pc = this.pc;
    if (!pc) return;
    try {
      if (type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        await this._drainPendingCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.signaling.send(this.remotePeerId, "answer", {
          sdp: pc.localDescription.sdp,
          type: pc.localDescription.type,
        });
      } else if (type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        await this._drainPendingCandidates();
      } else if (type === "ice-candidate") {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(payload));
        } else {
          this.pendingCandidates.push(payload);
        }
      }
    } catch (error) {
      this.callbacks.onError?.(error);
    }
  }

  async _drainPendingCandidates() {
    const candidates = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of candidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        this.callbacks.onError?.(error);
      }
    }
  }

  _setupChannel(channel) {
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_WATERMARK;
    this.channel = channel;

    channel.onopen = () => this._setState("connected");
    channel.onclose = () => this._setState("closed");
    channel.onerror = (event) => this.callbacks.onError?.(event?.error || event);

    channel.onmessage = (event) => {
      if (typeof event.data === "string") {
        this._handleControlMessage(JSON.parse(event.data));
      } else {
        this._handleChunk(event.data);
      }
    };
  }

  _handleControlMessage(message) {
    switch (message.kind) {
      case "file-offer":
        this.callbacks.onFileOffer?.(message);
        break;
      case "file-accept":
        this.callbacks.onFileAccept?.(message);
        break;
      case "file-reject":
        this.callbacks.onFileReject?.(message);
        break;
      case "file-cancel":
        this._handleFileCancelled(message);
        break;
      case "file-end":
        this._finalizeIncomingFile(message);
        break;
      case "file-ack":
        this.callbacks.onAck?.(message);
        break;
      case "text":
        this.callbacks.onTextReceived?.(message);
        break;
      default:
        break;
    }
  }

  _handleChunk(buffer) {
    const incoming = this.incoming;
    if (!incoming) return;
    const bytes = new Uint8Array(buffer);
    incoming.crc = crc32Update(incoming.crc, bytes);
    incoming.receivedBytes += bytes.byteLength;

    if (incoming.writer) {
      incoming.writer.write(bytes).catch((error) => this.callbacks.onError?.(error));
    } else {
      incoming.chunks.push(bytes);
    }

    this.callbacks.onProgress?.({
      transferId: incoming.transferId,
      direction: "receive",
      bytesDone: incoming.receivedBytes,
      totalBytes: incoming.size,
    });
  }

  /** Called by the UI once the user accepts (or auto-accepts) an incoming file-offer. */
  beginReceivingFile({ transferId, name, size, mime }, writer) {
    this.incoming = {
      transferId,
      name,
      size,
      mime,
      crc: crc32Init(),
      receivedBytes: 0,
      chunks: writer ? null : [],
      writer: writer || null,
    };
  }

  async _finalizeIncomingFile(message) {
    const incoming = this.incoming;
    if (!incoming) return;
    const expectedCrc = message.crc32;
    const actualCrc = crc32Finalize(incoming.crc);
    const ok = expectedCrc === actualCrc;

    let blob = null;
    if (incoming.writer) {
      try {
        await incoming.writer.close();
      } catch (error) {
        this.callbacks.onError?.(error);
      }
    } else {
      blob = new Blob(incoming.chunks, { type: incoming.mime || "application/octet-stream" });
    }

    this.channel?.send(
      JSON.stringify({ kind: "file-ack", transferId: incoming.transferId, ok }),
    );

    this.callbacks.onFileComplete?.({
      transferId: incoming.transferId,
      name: incoming.name,
      size: incoming.size,
      mime: incoming.mime,
      checksum: actualCrc,
      checksumOk: ok,
      blob,
      savedToDisk: !!incoming.writer,
    });

    this.incoming = null;
  }

  rejectIncomingFile(transferId) {
    this.channel?.send(JSON.stringify({ kind: "file-reject", transferId }));
  }

  /** Called when the remote peer cancels an offer we haven't finished receiving. */
  _handleFileCancelled(message) {
    if (this.incoming && this.incoming.transferId === message.transferId) {
      if (this.incoming.writer) {
        this.incoming.writer.abort?.().catch(() => {});
      }
      this.incoming = null;
    }
    this.callbacks.onFileCancelled?.(message.transferId);
  }

  acceptIncomingFile(transferId) {
    this.channel?.send(JSON.stringify({ kind: "file-accept", transferId }));
  }

  sendText({ name, language, content, fromName }) {
    if (!this.channel || this.channel.readyState !== "open") throw new Error("Data channel not open");
    const id = randomId();
    this.channel.send(
      JSON.stringify({
        kind: "text",
        id,
        name: name || "snippet.txt",
        language: language || "plaintext",
        content,
        fromName: fromName || "",
      }),
    );
    return id;
  }

  /**
   * Sends a file offer and (once accepted) streams it in CHUNK_SIZE pieces,
   * respecting the data channel's buffered amount so we never pile megabytes
   * of unsent data into browser memory faster than the network can drain it.
   */
  sendFile(file, { onProgress, fromName, transferId: providedId } = {}) {
    const transferId = providedId || randomId();
    const channel = this.channel;
    if (!channel || channel.readyState !== "open") {
      return Promise.reject(new Error("Data channel not open"));
    }

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.callbacks.onFileAccept = originalAccept;
        this.callbacks.onFileReject = originalReject;
        this.pendingSends.delete(transferId);
      };
      const onAccept = (message) => {
        if (message.transferId !== transferId) return;
        cleanup();
        this._streamFile(file, transferId, onProgress).then(resolve, reject);
      };
      const onReject = (message) => {
        if (message.transferId !== transferId) return;
        cleanup();
        reject(new Error("Transfer rejected by peer"));
      };

      const originalAccept = this.callbacks.onFileAccept;
      const originalReject = this.callbacks.onFileReject;
      this.callbacks.onFileAccept = (message) => {
        originalAccept?.(message);
        onAccept(message);
      };
      this.callbacks.onFileReject = (message) => {
        originalReject?.(message);
        onReject(message);
      };

      this.pendingSends.set(transferId, {
        cancel: () => {
          cleanup();
          try {
            if (channel.readyState === "open") {
              channel.send(JSON.stringify({ kind: "file-cancel", transferId }));
            }
          } catch {
            // ignore - channel may already be closing
          }
          reject(new Error("Transfer cancelled by sender"));
        },
      });

      channel.send(
        JSON.stringify({
          kind: "file-offer",
          transferId,
          name: file.name,
          size: file.size,
          mime: file.type || "application/octet-stream",
          chunkSize: CHUNK_SIZE,
          totalChunks: Math.ceil(file.size / CHUNK_SIZE) || 1,
          fromName: fromName || "",
        }),
      );
    });
  }

  /**
   * Cancels a file offer that's still waiting on the receiver's decision
   * (i.e. before any bytes have been streamed). Returns true if there was a
   * pending offer to cancel.
   */
  cancelSendFile(transferId) {
    const pending = this.pendingSends.get(transferId);
    if (!pending) return false;
    pending.cancel();
    return true;
  }

  async _streamFile(file, transferId, onProgress) {
    const channel = this.channel;
    let crc = crc32Init();
    let offset = 0;

    while (offset < file.size) {
      if (channel.readyState !== "open") throw new Error("Connection lost mid-transfer");
      if (channel.bufferedAmount > BUFFERED_AMOUNT_HIGH_WATERMARK) {
        await waitForBufferedAmountLow(channel);
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      crc = crc32Update(crc, new Uint8Array(buffer));
      channel.send(buffer);

      offset += buffer.byteLength;
      onProgress?.({ transferId, direction: "send", bytesDone: offset, totalBytes: file.size });
      // Yield to the event loop so the UI stays responsive on huge files.
      await new Promise((r) => setTimeout(r, 0));
    }

    const finalCrc = crc32Finalize(crc);
    channel.send(JSON.stringify({ kind: "file-end", transferId, crc32: finalCrc }));
    return { transferId, checksum: finalCrc, size: file.size };
  }

  close() {
    this.pendingSends.clear();
    try {
      this.channel?.close();
    } catch {
      // ignore
    }
    try {
      this.pc?.close();
    } catch {
      // ignore
    }
    this._setState("closed");
  }
}

export function isFileSystemAccessSupported() {
  return typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";
}
