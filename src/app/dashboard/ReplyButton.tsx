"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { replyToActivity } from "./actions";

// Bouton replié par défaut : le dashboard est une liste dense, on n'affiche le
// champ de saisie que pour l'élément auquel le coach décide de répondre.
export default function ReplyButton({
  clientId,
  clientName,
  quote,
  markRead,
}: {
  clientId: string;
  clientName: string;
  quote: string;
  markRead?: { kind: "session_note" | "weekly_checkin"; id: string };
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function send() {
    const body = content.trim();
    if (!body || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await replyToActivity({ clientId, quote, content: body, markRead });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setContent("");
      setSent(true);
      setOpen(false);
      router.refresh();
    });
  }

  if (sent && !open) {
    return (
      <p className="text-xs text-green-400 mt-2">
        ✓ Réponse envoyée à {clientName.split(" ")[0]}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-brand-400 hover:text-brand-300 border border-brand-500/30 rounded-lg px-2.5 py-1 hover:bg-brand-500/10 transition-colors"
      >
        ↩ Répondre
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={`Répondre à ${clientName.split(" ")[0]}...`}
        rows={2}
        autoFocus
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={send}
          disabled={isPending || !content.trim()}
          className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors"
        >
          {isPending ? "Envoi..." : "Envoyer"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          Annuler
        </button>
        <span className="text-[10px] text-gray-600 ml-auto">Entrée pour envoyer</span>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
