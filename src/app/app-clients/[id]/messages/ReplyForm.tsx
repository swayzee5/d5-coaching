"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { replyToClient } from "./actions";

export default function ReplyForm({ clientId }: { clientId: string }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await replyToClient(clientId, trimmed);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setError(null);
      setContent("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
    <div className="flex gap-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Répondre au client..."
        rows={2}
        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
      />
      <button
        onClick={handleSend}
        disabled={isPending || !content.trim()}
        className="px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-colors self-end"
      >
        {isPending ? "..." : "Envoyer"}
      </button>
    </div>
    {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
