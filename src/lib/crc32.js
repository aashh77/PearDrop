// Streaming CRC32 implementation.
//
// Why CRC32 instead of SHA-256? Browsers only expose `crypto.subtle.digest`,
// which requires the *entire* buffer up front - exactly what we're trying to
// avoid when transferring large files in small chunks. CRC32 can be updated
// incrementally, one chunk at a time, using O(1) extra memory, which keeps
// the "never load the whole file into memory" guarantee intact end-to-end
// while still giving us a real integrity check on every transfer.

let table = null;

function buildTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
}

/** Returns the initial CRC accumulator. */
export function crc32Init() {
  return 0xffffffff;
}

/**
 * Folds another chunk of bytes into the running CRC accumulator.
 * @param {number} crc - accumulator returned by crc32Init/crc32Update
 * @param {Uint8Array} bytes
 */
export function crc32Update(crc, bytes) {
  if (!table) table = buildTable();
  let c = crc;
  for (let i = 0; i < bytes.length; i++) {
    c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return c >>> 0;
}

/** Finalizes the accumulator into an 8-char lowercase hex checksum string. */
export function crc32Finalize(crc) {
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

/** Convenience helper for hashing a single, already-in-memory buffer. */
export function crc32Of(bytes) {
  return crc32Finalize(crc32Update(crc32Init(), bytes));
}
