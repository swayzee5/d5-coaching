"use client";

import { useTransition } from "react";

export function DeleteProgramButton({
  deleteAction,
  programName,
}: {
  deleteAction: () => Promise<void>;
  programName: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        `Supprimer le programme "${programName}" ?\nToutes les séances et exercices seront supprimés. Cette action est irréversible.`
      )
    )
      return;
    startTransition(() => deleteAction());
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-red-400/20 hover:border-red-400/40 rounded-lg transition-colors disabled:opacity-40"
    >
      {isPending ? "Suppression..." : "Supprimer le programme"}
    </button>
  );
}
