"use client";

import { useState } from "react";
import { updateVimeoId } from "@/app/exercices/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteExercise } from "@/app/exercices/actions";
import GenerateVideoButton from "./GenerateVideoButton";

type Exercise = {
  id: string;
  name: string;
  description: string | null;
  muscles: string[];
  vimeo_video_id: string | null;
  generated_video_url: string | null;
};

function VimeoEditForm({ exerciseId, currentVimeoId }: { exerciseId: string; currentVimeoId: string | null }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="text-xs px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded transition-colors"
      >
        {currentVimeoId ? "✏ Vimeo" : "+ Vimeo"}
      </button>
    );
  }
  return (
    <form
      action={async (fd) => { await updateVimeoId(fd); setOpen(false); }}
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <input type="hidden" name="id" value={exerciseId} />
      <input
        name="vimeoVideoId"
        defaultValue={currentVimeoId ?? ""}
        placeholder="ID Vimeo"
        autoFocus
        className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
      />
      <button type="submit" className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded">OK</button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs px-2 py-1 text-gray-500 hover:text-gray-300">✕</button>
    </form>
  );
}

export default function ExerciseRow({ ex }: { ex: Exercise }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-gray-800/40 transition-colors cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <span className={`text-gray-500 transition-transform text-xs ${open ? "rotate-90" : ""}`}>▶</span>
            <div>
              <p className="font-medium text-white">{ex.name}</p>
              {ex.description && !open && (
                <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{ex.description}</p>
              )}
            </div>
          </div>
        </td>
        <td className="px-5 py-4">
          <div className="flex flex-wrap gap-1">
            {ex.muscles.length === 0 ? (
              <span className="text-gray-600 text-xs">—</span>
            ) : (
              ex.muscles.map((m) => (
                <span key={m} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">{m}</span>
              ))
            )}
          </div>
        </td>
        <td className="px-5 py-4">
          {ex.vimeo_video_id ? (
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">✓ Vimeo</span>
          ) : ex.generated_video_url ? (
            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs">✓ IA</span>
          ) : (
            <span className="text-gray-600 text-xs">—</span>
          )}
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2 justify-end flex-wrap" onClick={(e) => e.stopPropagation()}>
            <VimeoEditForm exerciseId={ex.id} currentVimeoId={ex.vimeo_video_id} />
            <GenerateVideoButton exerciseId={ex.id} exerciseName={ex.name} hasVideo={!!ex.generated_video_url} />
            <ConfirmButton
              action={deleteExercise.bind(null, ex.id)}
              message={`Supprimer « ${ex.name} » ?`}
              className="text-xs text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors"
            >
              Supprimer
            </ConfirmButton>
          </div>
        </td>
      </tr>

      {open && (
        <tr className="bg-gray-800/20">
          <td colSpan={4} className="px-8 pb-6 pt-2">
            <div className="space-y-4">
              {ex.description && (
                <p className="text-sm text-gray-300 leading-relaxed">{ex.description}</p>
              )}
              {ex.vimeo_video_id && (
                <div className="rounded-xl overflow-hidden" style={{ maxWidth: 480 }}>
                  <div style={{ padding: "56.25% 0 0 0", position: "relative" }}>
                    <iframe
                      src={`https://player.vimeo.com/video/${ex.vimeo_video_id}?badge=0&autopause=0&player_id=0&app_id=58479`}
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                      title={ex.name}
                    />
                  </div>
                </div>
              )}
              {ex.generated_video_url && (
                <video
                  src={ex.generated_video_url}
                  controls
                  className="rounded-xl w-full max-w-sm h-auto bg-black"
                />
              )}
              {!ex.description && !ex.vimeo_video_id && !ex.generated_video_url && (
                <p className="text-gray-600 text-sm">Aucune description ni vidéo pour cet exercice.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
