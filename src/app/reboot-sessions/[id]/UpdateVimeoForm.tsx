"use client";

import { useState, useTransition } from "react";
import { updateVimeoId } from "./actions";

export function UpdateVimeoForm({ exerciseId, sessionId, currentVimeoId }: {
  exerciseId: string;
  sessionId: string;
  currentVimeoId: string;
}) {
  const [value, setValue] = useState(currentVimeoId);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await updateVimeoId(exerciseId, sessionId, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  const changed = value !== currentVimeoId;

  return (
    <div className="flex items-center gap-2 pt-1">
      <input value={value} onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        placeholder="ID Vimeo (ex: 123456789)"
        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 placeholder:text-gray-600" />
      <button type="button" onClick={handleSave} disabled={isPending || (!changed && !saved)}
        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0 ${
          saved ? "bg-green-500/20 text-green-400" : changed ? "bg-brand-500 hover:bg-brand-600 text-white" : "bg-gray-800 text-gray-500 cursor-default"
        }`}>
        {saved ? "✓ Sauvegardé" : isPending ? "…" : "Vimeo"}
      </button>
    </div>
  );
}
