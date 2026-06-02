"use client";

import { deleteSession } from "@/app/app-clients/[id]/programmes/actions";
import { useRef } from "react";

export default function DeleteSessionButton({
  sessionId,
  programId,
  clientId,
}: {
  sessionId: string;
  programId: string;
  clientId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteSession}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="clientId" value={clientId} />
      <button
        type="button"
        onClick={() => {
          if (window.confirm("Retirer cette séance du programme ?")) {
            formRef.current?.requestSubmit();
          }
        }}
        className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
      >
        🗑️ Retirer
      </button>
    </form>
  );
}
