# LocalDrop 🚀

**LocalDrop** is a self-hosted, web-based peer-to-peer file & code-snippet transfer tool.
Open it on any two devices — a laptop, a phone, a tablet — connected to the same Wi-Fi/LAN
(or paired remotely with a room code), and drag-and-drop files or paste code straight from
one browser to the other. Files travel **directly between browsers over WebRTC** — they are
never uploaded to, or stored on, any server.

Built entirely in **plain JavaScript / JSX** (no TypeScript source files) on top of the
Next.js App Router.

---

## ✨ Features

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

## 🧱 Tech stack

| Layer                | Technology |
|-----------------------|------------|
| Framework              | Next.js 16 (App Router), **JavaScript / JSX only — no TypeScript** |
| UI                     | React 19, Tailwind CSS v4 |
| Signaling transport    | Server-Sent Events (SSE) + `fetch` (`/api/signal/*` route handlers) — no extra process, works over the same HTTP port as the app |
| P2P data transport     | WebRTC `RTCPeerConnection` + `RTCDataChannel` (SCTP/DTLS/UDP), Google public STUN servers by default |
| Syntax highlighting    | Prism.js |
| Database               | PostgreSQL via Drizzle ORM (`transfer history` metadata only) |
| Integrity verification | Custom streaming CRC32 implementation (`src/lib/crc32.js`) |

### Why Server-Sent Events instead of raw WebSockets / Socket.io?

Next.js `route.js` handlers can return a streaming `Response`, which lets us implement a
classic "long-lived push channel" (SSE) using only standard Web APIs — no custom Node
server, no extra process/port to expose, and it works cleanly behind the same reverse proxy
that serves the rest of the app. The signaling server's job is intentionally tiny: broker
SDP offers/answers and ICE candidates between two browsers so they can establish a *direct*
WebRTC data channel. It never sees file bytes or snippet text.

---

## 📂 Project structure

```
src/
  app/
    api/
      health/route.js           # DB health check
      signal/
        join/route.js           # register a peer + return current peer list
        events/route.js         # SSE stream: peer-list + forwarded WebRTC signals
        message/route.js        # relay an SDP/ICE message to a specific peer
        leave/route.js          # remove a peer (sendBeacon on tab close)
      transfers/route.js        # GET/POST transfer-history metadata (Postgres)
    layout.jsx
    page.jsx                    # server component, loads initial history from DB
    globals.css
  components/
    LocalDropApp.jsx            # main client-side orchestrator (state machine)
    DeviceBadge.jsx / PeerList.jsx / RoomJoin.jsx
    TransferPanel.jsx / FileDropZone.jsx / ProgressItem.jsx
    SnippetEditor.jsx / SnippetCard.jsx
    IncomingOfferModal.jsx / HistoryPanel.jsx / Toasts.jsx / Icons.jsx
  lib/
    webrtc.js                   # PeerSession: RTCPeerConnection + data channel protocol
    signalingClient.js          # browser-side SSE/fetch signaling client
    signalStore.js              # server-side in-memory peer registry (SSE fan-out)
    crc32.js                    # streaming CRC32 checksum
    deviceInfo.js                # friendly device names + device-type detection
    format.js                   # byte/time formatting helpers
  db/
    index.js                    # Drizzle + pg Pool client
    schema.js                   # `transfers` table (history metadata only)
```

---

## 🔧 Prerequisites

- **Node.js 20+** and **npm**
- **PostgreSQL** running locally (or reachable via `DATABASE_URL`)
- A modern browser on each device you want to test with (Chrome, Edge, Firefox, Safari).
  For direct-to-disk saving of large files, use Chrome or Edge on desktop.

---

## 🚀 Running locally

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

   - **Same machine (quick smoke test):** open the URL in two browser tabs/windows (or two
     different browsers). Because they share `127.0.0.1`, they'll auto-discover each other
     under "Nearby devices".
   - **Two real devices on the same Wi-Fi:** find your computer's LAN IP
     (`ipconfig`/`ifconfig`/`ip addr`, e.g. `192.168.1.42`), then browse to
     `http://192.168.1.42:3000` from your phone/tablet/other laptop while connected to the
     **same Wi-Fi network**. They should appear in each other's device list automatically.
   - **Devices on different networks:** click "generate a new room code" on one device,
     then enter that same code in the "Discovery network" box on the other device. Both will
     re-join a shared virtual room and discover each other regardless of network, using
     WebRTC's STUN servers (and TURN, if configured — see below) to establish the
     connection.

6. **Send something!** Click a device in the list to open a direct connection, then either:
   - drag & drop (or click to browse) one or more files, or
   - type/paste a snippet, pick a language, and hit "Send snippet".

   The receiving side gets an Accept/Decline prompt for files (declining is reported back to
   the sender), a live progress bar while chunks stream in, and a checksum-verified download
   link (or an automatic "Saved to disk" confirmation if the browser supports the File
   System Access API).

---

## 🏗️ Building & running in production mode locally

```bash
npm run build
npm run start
```

This starts the compiled app on `http://localhost:3000` (or `$PORT` if set). The signaling
API and WebRTC app work identically in production mode — no separate server process is
required.

---

## 🌐 Deploying / running on your local network permanently

LocalDrop is designed to be **self-hosted** — e.g. on a laptop, a home server, a Raspberry
Pi, or a small VPS — rather than deployed to a serverless platform, because the signaling
store is a lightweight **in-memory** registry that expects a single, long-running Node.js
process (this is also why `npm run build && npm run start` is the recommended way to run it,
rather than a serverless/edge deployment).

1. Provision PostgreSQL reachable from that machine and set `DATABASE_URL` accordingly.
2. `npm install && npx drizzle-kit push && npm run build`
3. Run it as a long-lived process, e.g. with `pm2`:
   ```bash
   npm install -g pm2
   pm2 start npm --name localdrop -- start
   pm2 save
   ```
4. Devices on the same LAN can reach it at `http://<host-ip>:3000`. For access outside your
   LAN (e.g. from cellular data), put it behind a reverse proxy with HTTPS (WebRTC/`getUserMedia`-adjacent
   browser APIs — and some mobile browsers' clipboard/File System Access APIs — require a
   secure context, i.e. HTTPS, once you're not on `localhost`).

### Optional: configuring a TURN server for stricter NATs

Plain STUN (used by default, via Google's public STUN servers) is enough for the vast
majority of home/office networks and for same-LAN transfers. If you routinely need to
connect devices behind symmetric NATs / restrictive corporate firewalls, add a TURN server
by setting these **build-time** environment variables before `npm run build`:

```bash
NEXT_PUBLIC_TURN_URL=turn:your-turn-server:3478
NEXT_PUBLIC_TURN_USERNAME=your-username
NEXT_PUBLIC_TURN_CREDENTIAL=your-credential
```

(Free options for testing include running your own [coturn](https://github.com/coturn/coturn)
instance.)

---

## 🗄️ Database notes

LocalDrop **never stores file contents or snippet text** in Postgres. The only table,
`transfers`, records lightweight metadata for the "Recent activity" panel:

| column          | type      | notes                                   |
|-----------------|-----------|------------------------------------------|
| `id`            | serial    | primary key |
| `sender_name`   | varchar   | friendly device name of the sender |
| `receiver_name` | varchar   | friendly device name of the receiver |
| `item_type`     | varchar   | `"file"` or `"text"` |
| `item_name`     | text      | file name, or snippet label |
| `size_bytes`    | bigint    | transferred size in bytes |
| `checksum`      | varchar   | CRC32 hex checksum (files only) |
| `status`        | varchar   | `"completed"`, `"failed"`, or `"rejected"` |
| `created_at`    | timestamp | defaults to `now()` |

Schema source of truth: [`src/db/schema.js`](./src/db/schema.js). After editing it, apply
changes with:

```bash
npx drizzle-kit push
```

---

## 🧠 How the transfer protocol works

1. Browser A registers with the signaling server (`POST /api/signal/join`) and opens a
   Server-Sent Events stream (`GET /api/signal/events`) to receive live peer-list updates and
   forwarded signaling messages.
2. When you click a discovered peer, browser A creates an `RTCPeerConnection`, opens a data
   channel named `localdrop`, creates an SDP offer, and relays it through
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

## 🧪 Linting & type-checking

Even though the project contains **no `.ts`/`.tsx` source files**, it keeps a minimal
`tsconfig.json` (with `allowJs: true`) purely so editor tooling and Next.js's route-type
generation continue to work smoothly:

```bash
npx next typegen        # generates .next/types for the App Router
npm exec tsc -- --noEmit  # sanity-checks Next.js's generated route types
npm run lint             # ESLint (eslint-config-next)
```

---

## ⚠️ Known limitations / good next steps

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









  LocalDrop — P2P Local File & Snippet Transfer Tool
Stack (all plain JavaScript/JSX, zero .ts/.tsx source files): Next.js 16 App Router, React 19, Tailwind CSS v4, WebRTC, Server-Sent Events, PostgreSQL + Drizzle ORM, Prism.js.

Architecture:

Signaling (src/app/api/signal/*, src/lib/signalStore.js): Instead of a separate WebSocket/Socket.io process, I implemented signaling using Next.js route handlers with Server-Sent Events + fetch — runs on the same HTTP port, no extra process needed. Peers are auto-grouped by public IP (Snapdrop-style), so any devices on the same Wi-Fi/LAN instantly discover each other; a shareable room code lets devices on different networks pair up too.
Transport (src/lib/webrtc.js): Real RTCPeerConnection + RTCDataChannel, chunked File.slice() transfer (64KB chunks), backpressure handling via bufferedAmount/bufferedamountlow, streaming CRC32 checksums (memory-safe, no full-file hashing), an offer/accept/reject handshake per file, ICE-restart reconnection logic, and optional direct-to-disk writing via the File System Access API.
UI (src/components/*): device identity/rename, live peer list with connection status, drag-and-drop file transfers with progress + checksum badges, a Prism.js-powered code/text snippet composer with copy-to-clipboard, incoming-file accept/decline modal, toast notifications, and a Postgres-backed "recent activity" history panel.
Database: a single transfers table logs only transfer metadata (never file contents) for the history panel.
