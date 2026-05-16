export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";

type ConvRow = {
  client_id: string;
  unread_count: bigint;
  last_message: string;
  last_at: Date;
};

export default async function MessagesPage() {
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

  const rows = await db.$queryRaw<ConvRow[]>`
    SELECT
      client_id,
      COUNT(*) FILTER (WHERE sender_role = 'client' AND is_read = false) AS unread_count,
      (
        SELECT content FROM messages m2
        WHERE m2.client_id = m.client_id
        ORDER BY created_at DESC LIMIT 1
      ) AS last_message,
      MAX(created_at) AS last_at
    FROM messages m
    GROUP BY client_id
    ORDER BY MAX(created_at) DESC
  `.catch(() => [] as ConvRow[]);

  const conversations = await Promise.all(
    rows.map(async (row) => {
      const client = await db.appClient
        .findUnique({
          where: { id: row.client_id },
          select: { id: true, firstName: true, lastName: true },
        })
        .catch(() => null);
      return { ...row, client, unread: Number(row.unread_count) };
    })
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Messagerie</h1>

      {conversations.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500">Aucun message pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden max-w-2xl">
          {conversations.map((conv, i) => (
            <Link
              key={conv.client_id}
              href={`/app-clients/${conv.client_id}/messages`}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-800 transition-colors ${
                i > 0 ? "border-t border-gray-800" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                <span className="text-brand-400 font-bold text-sm">
                  {conv.client
                    ? `${conv.client.firstName[0]}${conv.client.lastName[0]}`
                    : "?"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium ${
                    conv.unread > 0 ? "text-white" : "text-gray-300"
                  }`}
                >
                  {conv.client
                    ? `${conv.client.firstName} ${conv.client.lastName}`
                    : conv.client_id}
                </p>
                <p className="text-sm text-gray-500 truncate">{conv.last_message}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <p className="text-xs text-gray-500">
                  {new Date(conv.last_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </p>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {conv.unread}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
