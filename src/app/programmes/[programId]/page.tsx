export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSession, renameSession, duplicateSession, deleteSession } from "./actions";
import { TemplateSessionList } from "@/components/programme/TemplateSessionList";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Template programme — D5 CRM" };
const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default async function TemplateProgramPage({
  params,
}: {
  params: { programId: string };
}) {
  const program = await db.trainingProgram.findUnique({
    where: { id: params.programId },
    include: {
      sessions: {
        orderBy: { orderIndex: "asc" },
        include: { _count: { select: { exercises: true } } },
      },
    },
  });
  if (!program || !program.isTemplate) notFound();

  const createSessionAction = createSession.bind(null, program.id);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <Link href="/programmes" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Bibliothèque de programmes
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{program.name}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              {program.weeksDuration && (
                <span className="text-gray-400 text-sm">{program.weeksDuration} semaines</span>
              )}
              {program.description && (
                <span className="text-gray-400 text-sm">{program.description}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 text-xs font-medium rounded-full">
              Template
            </span>
            <Link
              href={`/programmes/${program.id}/attribuer`}
              className="px-3 py-1.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Attribuer →
            </Link>
          </div>
        </div>
      </div>

      {program.sessions.length > 0 && (
        <div className="flex gap-6 px-5 py-4 bg-gray-900 border border-gray-800 rounded-xl">
          <div>
            <p className="text-2xl font-black text-white">{program.sessions.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Séance{program.sessions.length !== 1 ? "s" : ""}</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">
              {program.sessions.reduce((a, s) => a + s._count.exercises, 0)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Exercices au total</p>
          </div>
        </div>
      )}

      {program.sessions.length === 0 ? (
        <div className="bg-gray-900 border border-brand-500/30 rounded-xl p-8 text-center space-y-5">
          <div>
            <p className="text-white font-semibold text-lg">Créez votre première séance</p>
            <p className="text-gray-500 text-sm mt-1">Donnez-lui un nom, puis vous pourrez y ajouter des exercices</p>
          </div>
          <form action={createSessionAction} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              name="name"
              required
              autoFocus
              placeholder="ex : Séance A — Push"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
            <button
              type="submit"
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Créer →
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          <TemplateSessionList
            sessions={program.sessions}
            programId={program.id}
            renameAction={renameSession}
            duplicateAction={duplicateSession}
            deleteAction={deleteSession}
          />

          {/* Ajouter une séance supplémentaire */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-3 text-sm">+ Ajouter une séance</h2>
            <form action={createSessionAction} className="flex flex-wrap gap-3">
              <input
                name="name"
                required
                placeholder="ex : Séance B — Pull"
                className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <select
                name="dayOfWeek"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">Jour (optionnel)</option>
                {DAY_NAMES.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Créer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
