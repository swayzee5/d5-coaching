"use server";

import { db } from "@/lib/db";
import { sendCoachMessage } from "@/lib/messages";
import { revalidatePath } from "next/cache";

// Ce que le coach répond depuis le dashboard part dans la messagerie : c'est le
// seul canal que l'app client affiche déjà (sender_role = 'coach' apparaît comme
// « Coach » dans la conversation). Le contexte est cité en tête du message, sinon
// le client reçoit une réponse sans savoir à quoi elle se rapporte.
export async function replyToActivity({
  clientId,
  quote,
  content,
  markRead,
}: {
  clientId: string;
  quote: string;
  content: string;
  markRead?: { kind: "session_note" | "weekly_checkin"; id: string };
}): Promise<{ error?: string }> {
  const body = content.trim();
  if (!body) return { error: "Message vide" };

  const full = quote.trim() ? `↪ ${quote.trim()}\n\n${body}` : body;

  const sent = await sendCoachMessage(clientId, full);
  if (sent.error) return sent;

  // Répondre vaut lecture : l'élément sort des « non lus ».
  if (markRead?.kind === "session_note") {
    await db.$executeRaw`
      UPDATE session_notes SET is_read = true WHERE id = ${markRead.id}::uuid
    `.catch(() => {});
  } else if (markRead?.kind === "weekly_checkin") {
    await db.$executeRaw`
      UPDATE weekly_checkins SET is_read = true WHERE id = ${markRead.id}::uuid
    `.catch(() => {});
  }

  revalidatePath("/dashboard");
  revalidatePath("/activites");
  revalidatePath(`/app-clients/${clientId}/messages`);
  revalidatePath("/messages");
  return {};
}
