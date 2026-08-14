"use server";

import { revalidatePath } from "next/cache";
import { sendCoachMessage, markClientMessagesRead } from "@/lib/messages";

export async function replyToClient(
  clientId: string,
  content: string
): Promise<{ error?: string }> {
  const body = content.trim();
  if (!body) return { error: "Message vide" };

  const sent = await sendCoachMessage(clientId, body);
  if (sent.error) return sent;

  await markClientMessagesRead(clientId);

  revalidatePath(`/app-clients/${clientId}/messages`);
  revalidatePath("/messages");
  revalidatePath("/dashboard");
  return {};
}
