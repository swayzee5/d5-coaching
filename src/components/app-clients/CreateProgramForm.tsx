"use client";

import { useState } from "react";
import { createProgram } from "@/app/app-clients/[id]/programmes/actions";
import { applyTemplate } from "@/app/templates/actions";

type ProgramTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  weeks_duration: number;
  session_count: number;
};

const CATEGORY_COLORS: Record<string, string> = {
  "Débutant": "bg-green-500/10 text-green-400 border-green-500/20",
  "Intermédiaire": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Femme": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "Rééducation": "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function CreateProgramForm({
  clientId,
  programTemplates,
}: {
  clientId: string;
  programTemplates: ProgramTemplate[];
}) {
  const [mode, setMode] = useState<"template" | "manual">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplate | null>(null);
  const today = new Date().toISOString().split("T")[0];

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
        <div className="space-y-3">
          {programTemplates.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              Aucun template disponible.
              <a href={`/api/seed/templates?secret=${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`}
                className="text-brand-400 hover:underline ml-1">Charger les templates</a>
            </p>
          )}
          {!selectedTemplate ? (
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
              {programTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className="flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{t.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {t.session_count} séance{t.session_count > 1 ? "s" : ""} · {t.weeks_duration} semaines
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                    CATEGORY_COLORS[t.category] ?? "bg-gray-700 text-gray-400 border-gray-600"
                  }`}>
                    {t.category}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <form action={applyTemplate} className="space-y-3">
              <input type="hidden" name="templateId" value={selectedTemplate.id} />
              <input type="hidden" name="clientId" value={clientId} />
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => setSelectedTemplate(null)}
                  className="text-gray-400 hover:text-white text-xs">←</button>
                <p className="text-white text-sm font-medium">{selectedTemplate.name}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nom du programme</label>
                <input name="programName" required defaultValue={selectedTemplate.name}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date de début</label>
                <input type="date" name="startDate" defaultValue={today}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500" />
              </div>
              <button type="submit"
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-semibold transition-colors">
                ✦ Créer depuis le template
              </button>
            </form>
          )}
        </div>
      )}

      {/* Manual mode */}
      {mode === "manual" && (
        <form action={createProgram} className="space-y-3">
          <input type="hidden" name="clientId" value={clientId} />
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nom du programme *</label>
            <input name="name" required placeholder="ex: Programme Force — 8 semaines"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Durée (semaines)</label>
              <input type="number" name="weeksDuration" min={1} max={52} placeholder="8"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Date de début</label>
              <input type="date" name="startDate" defaultValue={today}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>
          <button type="submit"
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors">
            Créer le programme
          </button>
        </form>
      )}
    </div>
  );
}
