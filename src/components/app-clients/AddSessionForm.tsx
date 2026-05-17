"use client";

import { useState } from "react";
import { createSession, createSessionFromTemplate } from "@/app/app-clients/[id]/programmes/actions";

type SeanceTemplate = {
  id: string;
  name: string;
  category: string;
  duration_minutes: number | null;
  exercise_count: number;
};

const CATEGORY_ICONS: Record<string, string> = {
  "Pectoraux": "💪",
  "Dos": "💪",
  "Épaules": "💪",
  "Bras": "💪",
  "Jambes Homme": "🦵",
  "Jambes Femme": "🦵",
  "Full Body": "⚡",
  "Gainage": "🔥",
  "Cardio": "🏃",
};

export default function AddSessionForm({
  programId,
  clientId,
  seanceTemplates,
}: {
  programId: string;
  clientId: string;
  seanceTemplates: SeanceTemplate[];
}) {
  const [mode, setMode] = useState<"template" | "manual">("template");

  const byCategory = seanceTemplates.reduce<Record<string, SeanceTemplate[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("template")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "template"
              ? "bg-brand-500 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-200"
          }`}
        >
          ✦ Depuis un template
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "manual"
              ? "bg-brand-500 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-200"
          }`}
        >
          + Manuellement
        </button>
      </div>

      {/* Template mode */}
      {mode === "template" && (
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {seanceTemplates.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              Aucun template de séance disponible.
            </p>
          )}
          {Object.entries(byCategory).map(([cat, sessions]) => (
            <div key={cat}>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                {CATEGORY_ICONS[cat] ?? "📋"} {cat}
              </p>
              <div className="space-y-1">
                {sessions.map((s) => (
                  <form key={s.id} action={createSessionFromTemplate}>
                    <input type="hidden" name="programId" value={programId} />
                    <input type="hidden" name="clientId" value={clientId} />
                    <input type="hidden" name="seanceTemplateId" value={s.id} />
                    <button
                      type="submit"
                      className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <div>
                        <p className="text-white text-sm">{s.name}</p>
                        <p className="text-gray-500 text-xs">
                          {s.exercise_count} exercices
                          {s.duration_minutes ? ` · ~${s.duration_minutes} min` : ""}
                        </p>
                      </div>
                      <span className="text-brand-400 text-xs font-medium shrink-0">Importer →</span>
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual mode */}
      {mode === "manual" && (
        <form action={createSession} className="flex flex-wrap gap-3">
          <input type="hidden" name="programId" value={programId} />
          <input type="hidden" name="clientId" value={clientId} />
          <input
            name="name"
            required
            placeholder="Nom de la séance (ex: Push — Pectoraux)"
            className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <select
            name="dayOfWeek"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="">Jour (optionnel)</option>
            {DAY_NAMES.map((d, idx) => (
              <option key={idx} value={idx}>{d}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Créer
          </button>
        </form>
      )}
    </div>
  );
}
