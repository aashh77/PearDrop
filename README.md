# PearDrop

**PearDrop** is a self-hosted, web-based peer-to-peer file & code-snippet transfer tool.
Open it on any two devices — a laptop, a phone, a tablet — connected to the same Wi-Fi/LAN
(or paired remotely with a room code), and drag-and-drop files or paste code straight from
one browser to the other. Files travel **directly between browsers over WebRTC** — they are
never uploaded to, or stored on, any server.

---

## Features

- **Zero-config discovery** — devices on the same network are grouped automatically (by
  public IP, the same trick AirDrop/Snapdrop-style tools use) and show up in a live "Nearby
  devices" list within a second or two, no login, no pairing code required.
- **Cross-network pairing via room codes** — generate/share a short room code so a phone on
  cellular data can find a laptop on Wi-Fi; WebRTC's STUN (and optional TURN) servers handle
  NAT traversal.
- **True peer-to-peer transport** — once two browsers discover each other, a signaling
  server (Next.js Server-Sent Events + fetch) only exchanges tiny SDP/ICE handshake
  messages. All file bytes flow through an `RTCDataChannel` (SCTP over DTLS/UDP) straight
  from sender to receiver.
- **Chunked, memory-safe file transfer** — files are sliced with `File.slice()` into 64KB
  chunks and streamed sequentially, so multi-gigabyte files never need to be loaded into
  memory all at once on the sending side.
- **Backpressure / buffer management** — the sender watches
  `RTCDataChannel.bufferedAmount` and pauses (via the `bufferedamountlow` event) whenever the
  receiver can't keep up, preventing runaway memory growth on either end.
- **Streaming CRC32 integrity checksums** — a rolling CRC32 is computed chunk-by-chunk on
  both sides (no need to buffer the whole file to hash it) and compared after every
  transfer, with a clear "✅ verified" / "⚠️ checksum mismatch" badge in the UI.
- **Direct-to-disk saving (File System Access API)** — on supported browsers (Chrome/Edge
  desktop) accepting a file opens a native "Save As" dialog and chunks are streamed straight
  to disk, so even huge files never sit fully in browser memory on the receiving end either.
  Unsupported browsers gracefully fall back to in-memory buffering.
- **Code/text snippet sharing** — paste text or code, pick a language, and send it instantly
  with Prism.js syntax highlighting and a one-click "Copy to clipboard" action on the
  receiving side.
- **Resilience** — dropped Wi-Fi or a backgrounded tab triggers automatic ICE-restart
  reconnection attempts; failed/rejected transfers are clearly reported instead of hanging.
- **Transfer history** — a lightweight, privacy-friendly Postgres-backed log of *metadata
  only* (who sent what to whom, size, checksum, status, timestamp) — never file contents —
  is kept so you can see recent activity across your devices.

---

## Tech stack

| Layer                | Technology |
|-----------------------|------------|
| Framework              | Next.js 16 (App Router), **JavaScript** |
| UI                     | React 19, Tailwind CSS v4 |
| Signaling transport    | Server-Sent Events (SSE) + `fetch` (`/api/signal/*` route handlers) — no extra process, works over the same HTTP port as the app |
| P2P data transport     | WebRTC `RTCPeerConnection` + `RTCDataChannel` (SCTP/DTLS/UDP), Google public STUN servers by default |
| Syntax highlighting    | Prism.js |
| Database               | PostgreSQL via Drizzle ORM (`transfer history` metadata only) |
| Integrity verification | Custom streaming CRC32 implementation (`src/lib/crc32.js`) |


---

## Prerequisites

- **Node.js 20+** and **npm**
- **PostgreSQL** running locally (or reachable via `DATABASE_URL`)
- A modern browser on each device you want to test with (Chrome, Edge, Firefox, Safari).
  For direct-to-disk saving of large files, use Chrome or Edge on desktop.

---

## Running locally

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure the database connection**

   The project reads `DATABASE_URL` from `.env`. A local Postgres example:

   ```bash
   # .env
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
   ```

   Make sure a Postgres server is running and the `app_db` database exists, e.g.:

   ```bash
   createdb app_db   # or: psql -c "CREATE DATABASE app_db;"
   ```

3. **Push the schema** (creates the `transfers` table — no migration files needed)

   ```bash
   npx drizzle-kit push
   ```

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000> in your browser.

5. **Test a transfer between two devices**

   - **Same machine (quick smoke test):**
   - **Two real devices on the same Wi-Fi:** 
   - **Devices on different networks:**

6. **Send something!** Click a device in the list to open a direct connection, then either:
   - drag & drop (or click to browse) one or more files, or
   - type/paste a snippet, pick a language, and hit "Send snippet".

   The receiving side gets an Accept/Decline prompt for files (declining is reported back to
   the sender), a live progress bar while chunks stream in, and a checksum-verified download
   link (or an automatic "Saved to disk" confirmation if the browser supports the File
   System Access API).

---

## Building & running in production mode locally

```bash
npm run build
npm run start
```

This starts the compiled app on `http://localhost:3000` (or `$PORT` if set). The signaling
API and WebRTC app work identically in production mode — no separate server process is
required.

---

## How the transfer protocol works

1. Browser A registers with the signaling server (`POST /api/signal/join`) and opens a
   Server-Sent Events stream (`GET /api/signal/events`) to receive live peer-list updates and
   forwarded signaling messages.
2. When you click a discovered peer, browser A creates an `RTCPeerConnection`, opens a data
   channel named `PearDrop`, creates an SDP offer, and relays it through
   `POST /api/signal/message` to browser B.
3. Browser B receives the offer via its own SSE stream, creates its `RTCPeerConnection`,
   answers, and both sides exchange ICE candidates the same way until a **direct**
   UDP/DTLS/SCTP data channel is established — no more server involvement from this point
   on for actual data.
4. **Files:** the sender sends a JSON `file-offer` control message (name/size/mime) over the
   data channel. The receiver's UI shows an Accept/Decline prompt. On accept, the sender
   streams the file in 64KB `ArrayBuffer` chunks (pausing whenever
   `bufferedAmount` gets too high), updating a rolling CRC32 as it goes, and finishes with a
   `file-end` message containing the final checksum. The receiver verifies its own
   independently-computed CRC32 against that value and replies with a `file-ack`.
5. **Snippets:** sent as a single JSON message (`kind: "text"`) since they're small — no
   chunking needed.
6. Every completed/failed/rejected file transfer (and every sent snippet) is logged via
   `POST /api/transfers` purely for the "Recent activity" history panel.

---


## Scope for Future Development

- Only one file transfer is streamed at a time *per direction* on a given connection
  (additional files you drop are queued and sent sequentially) to keep the chunk-framing
  protocol simple.
- There is no resumable-transfer support yet — if a connection drops mid-file, the transfer
  is marked failed and needs to be restarted from the beginning.
- The signaling store is in-memory and single-process by design (see the deployment section
  above) — it's perfect for a self-hosted LAN tool, but would need a shared store (e.g.
  Redis pub/sub) if you wanted to run multiple horizontally-scaled instances behind a load
  balancer.
- Browsers without the File System Access API (Firefox, Safari, all mobile browsers today)
  buffer received files fully in memory before offering a download link, so extremely large
  transfers (multi-GB) work best in Chrome/Edge on desktop on both ends.
