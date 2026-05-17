export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { applyTemplate } from "../../actions";

type Client = { id: string; first_name: string; last_name: string };

export default async function ApplyTemplatePage({ params }: { params: { id: string } }) {
  const { id } = params;

  const templates = await db.$queryRaw<{ id: string; name: string; weeks_duration: number }[]>`
    SELECT id::text, name, weeks_duration FROM program_templates WHERE id = ${id}::uuid
  `.catch(() => []);

  if (!templates.length) notFound();
  const tpl = templates[0];

  const clients = await db.$queryRaw<Client[]>`
    SELECT id::text, first_name, last_name FROM clients WHERE is_active = true ORDER BY first_name ASC
  `.catch(() => [] as Client[]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/templates/${id}`} className="text-gray-400 hover:text-white text-sm">← {tpl.name}</Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-white">Appliquer le template</h1>
        <p className="text-gray-500 text-sm mt-1">Crée un programme complet à partir de ce template.</p>
      </div>

      <form action={applyTemplate} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <input type="hidden" name="templateId" value={id} />

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Client *</label>
          <select
            name="clientId"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
          >
            <option value="">Sélectionner un client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Nom du programme</label>
          <input
            name="programName"
            required
            defaultValue={tpl.name}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Date de début</label>
          <input
            type="date"
            name="startDate"
            defaultValue={today}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="bg-gray-800 rounded-lg px-4 py-3 text-xs text-gray-400 space-y-1">
          <p>📋 Toutes les séances du template seront copiées</p>
          <p>⏱ Temps de repos : 90 secondes par défaut</p>
          <p>📅 Durée : {tpl.weeks_duration} semaines</p>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-lg font-semibold text-sm transition-colors"
        >
          ✦ Créer le programme
        </button>
      </form>
    </div>
  );
}
