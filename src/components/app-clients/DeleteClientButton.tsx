"use client";

import { useTransition } from "react";
import { deleteClient } from "@/app/app-clients/[id]/actions";

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Supprimer ${clientName} ? Cette action est irréversible.`)) return;
    startTransition(() => deleteClient(clientId));
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
    >
      {isPending ? "Suppression…" : "Supprimer"}
    </button>
  );
}
