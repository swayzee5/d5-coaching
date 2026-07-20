"use client";

import { useState, useTransition } from "react";

const CATEGORIES = [
  "Pectoraux", "Dos", "Épaules", "Bras",
  "Jambes", "Fessiers", "Jambes Femme",
  "Push / Pull / Legs", "Full Body",
  "Gainage", "Abdominaux", "Cardio",
];

export function SaveAsTemplateButton({
  sessionName,
  saveAction,
}: {
  sessionName: string;
  saveAction: (name: string, category: string) => Promise<{ ok: boolean; message: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(sessionName);
  const [category, setCategory] = useState("Dos");
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await saveAction(name, category);
      setResult(res.message);
      if (res.ok) setTimeout(() => { setOpen(false); setResult(null); }, 1500);
    });
  }

  return (
    <>
      <button
        onClick={() => { setName(sessionName); setOpen(true); }}
        className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors border border-gray-700"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        Template
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-lg font-bold text-white">Sauvegarder comme template</h2>
              <p className="text-gray-500 text-sm mt-1">Cette séance sera disponible pour tous tes clients.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nom du template</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {result && (
              <p className={`text-sm text-center ${result.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{result}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setOpen(false)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={isPending || !name.trim()}
                className="flex-1 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {isPending ? "Sauvegarde…" : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
