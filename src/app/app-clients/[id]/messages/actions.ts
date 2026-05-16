"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function ensureMessagesTable() {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `.catch(() => {});
}

export async function replyToClient(clientId: string, content: string) {
  await ensureMessagesTable();
  await db.$executeRaw`
    INSERT INTO messages (client_id, sender_role, content, is_read)
    VALUES (${clientId}, 'coach', ${content}, false)
  `;
  await db.$executeRaw`
    UPDATE messages
    SET is_read = true
    WHERE client_id = ${clientId}
      AND sender_role = 'client'
      AND is_read = false
  `.catch(() => {});
  revalidatePath(`/app-clients/${clientId}/messages`);
  revalidatePath("/messages");
  revalidatePath("/dashboard");
}
