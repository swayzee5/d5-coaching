export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import ReplyForm from "./ReplyForm";

type Message = {
  id: string;
  sender_role: string;
  content: string;
  created_at: Date;
};

export default async function ClientMessagesPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

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

  await db.$executeRaw`
    UPDATE messages
    SET is_read = true
    WHERE client_id = ${id}
      AND sender_role = 'client'
      AND is_read = false
  `.catch(() => {});

  const client = await db.appClient
    .findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true },
    })
    .catch(() => null);

  const messages = await db.$queryRaw<Message[]>`
    SELECT id, sender_role, content, created_at
    FROM messages
    WHERE client_id = ${id}
    ORDER BY created_at ASC
  `.catch(() => [] as Message[]);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/messages" className="text-gray-400 hover:text-white text-sm">
          ← Messagerie
        </Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-xl font-bold text-white">
          {client ? `${client.firstName} ${client.lastName}` : "Client"}
        </h1>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col">
        <div className="p-5 space-y-4 min-h-[300px] max-h-[60vh] overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aucun message pour l&apos;instant.
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender_role === "coach" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.sender_role === "coach"
                      ? "bg-brand-500 text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-100 rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.sender_role === "coach"
                        ? "text-brand-200"
                        : "text-gray-500"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-gray-800 p-4">
          <ReplyForm clientId={id} />
        </div>
      </div>
    </div>
  );
}
