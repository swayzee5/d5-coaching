"use client";

import { useState } from "react";
import { updateVimeoId } from "@/app/exercices/actions";

export default function VimeoEditForm({
  exerciseId,
  currentVimeoId,
}: {
  exerciseId: string;
  currentVimeoId: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded transition-colors"
      >
        {currentVimeoId ? "✏ Vimeo" : "+ Vimeo"}
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await updateVimeoId(fd);
        setOpen(false);
      }}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="id" value={exerciseId} />
      <input
        name="vimeoVideoId"
        defaultValue={currentVimeoId ?? ""}
        placeholder="ID Vimeo"
        autoFocus
        className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
      />
      <button
        type="submit"
        className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded transition-colors"
      >
        OK
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs px-2 py-1 text-gray-500 hover:text-gray-300 transition-colors"
      >
        ✕
      </button>
    </form>
  );
}
