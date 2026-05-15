"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function replyToClient(clientId: string, content: string): Promise<void> {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL,
      sender_role VARCHAR(10) NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await db.$executeRaw`
    INSERT INTO messages (client_id, sender_role, content)
    VALUES (${clientId}::uuid, 'coach', ${content})
  `

  await db.$executeRaw`
    UPDATE messages SET is_read = true
    WHERE client_id = ${clientId}::uuid AND sender_role = 'client' AND is_read = false
  `

  revalidatePath(`/app-clients/${clientId}/messages`)
  revalidatePath("/messages")
  revalidatePath("/dashboard")
}
