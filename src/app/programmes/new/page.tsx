import { createTemplate } from "../actions";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nouveau template — D5 CRM" };

export default function NewProgrammePage() {
  return (
    <div className="p-6 max-w-2xl">
      <Link href="/programmes" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
        ← Bibliothèque de programmes
      </Link>
      <h1 className="text-xl font-bold text-white mt-4 mb-6">Nouveau template de programme</h1>

      <form action={createTemplate} className="space-y-5 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Nom du programme *</label>
          <input
            name="name"
            required
            placeholder="ex : Programme Force — 8 semaines"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Description</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Objectif du programme, type d’entraînement…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Durée (semaines)</label>
          <input
            type="number"
            name="weeksDuration"
            min={1}
            max={52}
            placeholder="ex : 8"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Créer le template
        </button>
      </form>
    </div>
  );
}
