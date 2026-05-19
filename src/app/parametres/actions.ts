"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveRebootMessage(message: string) {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `.catch(() => {});
  await db.$executeRaw`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('reboot_welcome_message', ${message}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  revalidatePath("/parametres");
}
