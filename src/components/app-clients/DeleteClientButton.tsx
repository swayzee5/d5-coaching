"use client";

import { useState, useTransition } from "react";
import { deleteClient } from "@/app/app-clients/[id]/actions";

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(`Supprimer définitivement ${clientName} ?\nCette action est irréversible.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteClient(clientId);
      // If deleteClient returns an error object (not a redirect), show it
      if (result && "error" in result) {
        setError(result.error);
      }
      // A successful delete triggers redirect() server-side — no result is returned
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
      >
        {isPending ? "Suppression…" : "Supprimer"}
      </button>
      {error && (
        <p className="text-xs text-red-400 max-w-[200px] text-right">{error}</p>
      )}
    </div>
  );
}
