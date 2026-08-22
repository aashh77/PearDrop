import { db } from "@/db";
import { transfers } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/transfers - most recent transfer-history entries (metadata only,
// never file contents) for the "Recent Activity" panel.
export async function GET() {
  try {
    const rows = await db.select().from(transfers).orderBy(desc(transfers.createdAt)).limit(50);
    return Response.json({ transfers: rows });
  } catch (error) {
    console.error("Failed to load transfer history", error);
    return Response.json({ transfers: [] }, { status: 500 });
  }
}

// POST /api/transfers - log a completed/failed/rejected transfer.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { senderName, receiverName, itemType, itemName, sizeBytes, checksum, status } = body || {};

  if (!senderName || !receiverName || !itemType || !itemName) {
    return Response.json(
      { error: "senderName, receiverName, itemType and itemName are required" },
      { status: 400 },
    );
  }

  try {
    const [row] = await db
      .insert(transfers)
      .values({
        senderName: String(senderName).slice(0, 120),
        receiverName: String(receiverName).slice(0, 120),
        itemType: String(itemType).slice(0, 20),
        itemName: String(itemName).slice(0, 2000),
        sizeBytes: Number.isFinite(sizeBytes) ? Math.max(0, Math.trunc(sizeBytes)) : 0,
        checksum: checksum ? String(checksum).slice(0, 32) : null,
        status: status ? String(status).slice(0, 20) : "completed",
      })
      .returning();

    return Response.json({ transfer: row }, { status: 201 });
  } catch (error) {
    console.error("Failed to log transfer", error);
    return Response.json({ error: "Failed to log transfer" }, { status: 500 });
  }
}
