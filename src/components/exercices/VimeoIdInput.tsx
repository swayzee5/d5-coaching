"use client";

import { useState, useTransition } from "react";

export function VimeoIdInput({
  exerciseId,
  initialVimeoId,
  updateAction,
}: {
  exerciseId: string;
  initialVimeoId: string | null;
  updateAction: (id: string, vimeoId: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialVimeoId ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await updateAction(exerciseId, value.trim() || null);
      setEditing(false);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") { setValue(initialVimeoId ?? ""); setEditing(false); }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ID Vimeo..."
          className="w-28 bg-gray-800 border border-blue-600 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={isPending}
          className="text-xs px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {isPending ? "…" : "OK"}
        </button>
        <button
          onClick={() => { setValue(initialVimeoId ?? ""); setEditing(false); }}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 group"
      title="Modifier l'ID Vimeo"
    >
      {value ? (
        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs group-hover:bg-blue-500/20 transition-colors">
          ✓ Vimeo
        </span>
      ) : (
        <span className="text-gray-600 text-xs group-hover:text-gray-400 transition-colors">
          + Ajouter Vimeo
        </span>
      )}
    </button>
  );
}
