import { db } from "@/db";
import { transfers } from "@/db/schema";
import { desc } from "drizzle-orm";
import LocalDropApp from "@/components/LocalDropApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialHistory = [];
  try {
    initialHistory = await db.select().from(transfers).orderBy(desc(transfers.createdAt)).limit(50);
  } catch (error) {
    console.error("Failed to load initial transfer history", error);
  }

  return <LocalDropApp initialHistory={initialHistory} />;
}
