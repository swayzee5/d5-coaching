export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";

type ConversationRow = {
  client_id: string;
  first_name: string;
  last_name: string;
  last_message: string;
  last_at: Date;
  unread_count: bigint;
};

async function getConversations() {
  try {
    return await db.$queryRaw`
      SELECT
        m.client_id,
        c.first_name,
        c.last_name,
        (
          SELECT content FROM messages m2
          WHERE m2.client_id = m.client_id
          ORDER BY m2.created_at DESC LIMIT 1
        ) AS last_message,
        MAX(m.created_at) AS last_at,
        COUNT(*) FILTER (WHERE m.sender_role = 'client' AND m.is_read = false) AS unread_count
      FROM messages m
      JOIN app_clients c ON c.id = m.client_id
      GROUP BY m.client_id, c.first_name, c.last_name
      ORDER BY last_at DESC
    ` as ConversationRow[];
  } catch {
    return [];
  }
}

function timeAgo(date: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

export default async function MessagesPage() {
  const conversations = await getConversations();
  const totalUnread = conversations.reduce((acc, c) => acc + Number(c.unread_count), 0);

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Messagerie</h1>
          <p className="text-gray-400 text-sm mt-1">
            {totalUnread > 0 ? `${totalUnread} message${totalUnread > 1 ? "s" : ""} non lu${totalUnread > 1 ? "s" : ""}` : "Toutes les conversations"}
          </p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">Aucun message pour l&apos;instant</p>
          <p className="text-gray-600 text-xs mt-2">Les messages de vos clients apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const unread = Number(conv.unread_count);
            return (
              <Link
                key={conv.client_id}
                href={`/app-clients/${conv.client_id}/messages`}
                className="flex items-center gap-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                  <span className="text-brand-400 font-bold text-sm">
                    {conv.first_name[0]}{conv.last_name[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{conv.first_name} {conv.last_name}</p>
                  <p className="text-gray-500 text-xs truncate mt-0.5">{conv.last_message}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <p className="text-gray-600 text-xs">{timeAgo(conv.last_at)}</p>
                  {unread > 0 && (
                    <span className="px-2 py-0.5 bg-brand-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                      {unread}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
