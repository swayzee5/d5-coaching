"use client";

import { useTransition } from "react";
import { deleteClient } from "@/app/app-clients/[id]/actions";

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Supprimer définitivement ${clientName} ? Cette action est irréversible.`)) return;
    startTransition(() => deleteClient(clientId));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white transition-colors"
    >
      {isPending ? "Suppression…" : "🗑️ Supprimer"}
    </button>
  );
}
