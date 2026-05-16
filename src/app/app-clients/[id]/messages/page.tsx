export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { replyToClient } from "./actions";

type Message = {
  id: string;
  sender_role: string;
  content: string;
  created_at: Date;
};

async function getConversation(clientId: string) {
  let messages: Message[] = [];
  let client = null;

  try {
    client = await db.appClient.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true },
    });
  } catch {}

  try {
    messages = await db.$queryRaw`
      SELECT id, sender_role, content, created_at
      FROM messages
      WHERE client_id = ${clientId}::uuid
      ORDER BY created_at ASC
    ` as Message[];

    await db.$executeRaw`
      UPDATE messages SET is_read = true
      WHERE client_id = ${clientId}::uuid AND sender_role = 'client' AND is_read = false
    `;
  } catch {}

  return { messages, client };
}

export default async function ClientMessagesPage({ params }: { params: { id: string } }) {
  const { messages, client } = await getConversation(params.id);
  if (!client) notFound();

  const replyAction = replyToClient.bind(null, params.id);

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <Link href={`/app-clients/${params.id}`} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← {client.firstName} {client.lastName}
        </Link>
        <div className="flex items-center justify-between mt-3">
          <h1 className="text-xl font-bold text-white">Conversation</h1>
          <span className="text-xs text-gray-500">{messages.length} message{messages.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="space-y-3 min-h-[200px]">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-12">Aucun message pour l&apos;instant</p>
        ) : (
          messages.map((m) => {
            const isCoach = m.sender_role === "coach";
            const time = new Date(m.created_at).toLocaleString("fr-FR", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            });
            return (
              <div key={m.id} className={`flex ${isCoach ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  isCoach
                    ? "bg-brand-500 text-white rounded-br-sm"
                    : "bg-gray-800 text-white rounded-bl-sm"
                }`}>
                  <p className={`text-[10px] font-bold mb-1 ${
                    isCoach ? "text-brand-200" : "text-gray-400"
                  }`}>
                    {isCoach ? "Vous" : `${client.firstName} ${client.lastName}`}
                  </p>
                  <p className="text-sm leading-relaxed">{m.content}</p>
                  <p className={`text-[10px] mt-1.5 text-right ${
                    isCoach ? "text-brand-200" : "text-gray-500"
                  }`}>{time}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        action={async (fd) => {
          "use server";
          const content = fd.get("content") as string;
          if (content?.trim()) await replyAction(content.trim());
        }}
        className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3"
      >
        <label className="block text-sm font-medium text-gray-300">Répondre à {client.firstName}</label>
        <textarea
          name="content"
          rows={3}
          placeholder="Écris ta réponse..."
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none transition-colors"
        />
        <button
          type="submit"
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
