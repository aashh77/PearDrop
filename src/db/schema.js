// Drizzle ORM schema for LocalDrop.
//
// LocalDrop never stores file contents or text snippet bodies in the
// database - transfers happen directly browser-to-browser over WebRTC.
// The only thing persisted server-side is a lightweight, privacy-friendly
// audit trail ("Transfer History") so users can see what was recently
// sent/received on this signaling server, plus basic transfer metadata.
import { pgTable, serial, varchar, text, bigint, timestamp } from "drizzle-orm/pg-core";

export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),

  // Human readable device names, e.g. "Quiet Falcon" -> "Sunny Otter".
  senderName: varchar("sender_name", { length: 120 }).notNull(),
  receiverName: varchar("receiver_name", { length: 120 }).notNull(),

  // "file" | "text"
  itemType: varchar("item_type", { length: 20 }).notNull(),

  // File name, or a short label/preview for text snippets.
  itemName: text("item_name").notNull(),

  // Size in bytes (0 for very short text snippets is fine).
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),

  // CRC32 checksum (hex string) used for file integrity verification.
  checksum: varchar("checksum", { length: 32 }),

  // "completed" | "failed" | "rejected"
  status: varchar("status", { length: 20 }).notNull().default("completed"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
