export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSession, duplicateSession, deleteSession } from "../actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Programme — D5 CRM" };
const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default async function ProgramDetailPage({
  params,
}: {
  params: { id: string; programId: string };
}) {
  const { id: clientId, programId } = params;
  const program = await db.trainingProgram.findUnique({
    where: { id: programId },
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      sessions: {
        orderBy: { orderIndex: "asc" },
        include: { _count: { select: { exercises: true } } },
      },
    },
  });
  if (!program || program.clientId !== clientId) notFound();

  const createSessionAction = createSession.bind(null, programId, clientId);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <Link
          href={`/app-clients/${clientId}`}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← {program.client?.firstName} {program.client?.lastName}
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{program.name}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              {program.weeksDuration && (
                <span className="text-gray-400 text-sm">{program.weeksDuration} semaines</span>
              )}
              {program.startDate && (
                <span className="text-gray-400 text-sm">
                  Début :{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(program.startDate))}
                </span>
              )}
            </div>
          </div>
          <span
            className={`mt-1 px-3 py-1 text-xs rounded-full font-medium ${
              program.isActive
                ? "bg-green-500/10 text-green-400"
                : "bg-gray-700 text-gray-400"
            }`}
          >
            {program.isActive ? "Actif" : "Inactif"}
          </span>
        </div>
      </div>

      <div className="flex gap-6 px-5 py-4 bg-gray-900 border border-gray-800 rounded-xl">
        <div>
          <p className="text-2xl font-black text-white">{program.sessions.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Séance{program.sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div>
          <p className="text-2xl font-black text-white">
            {program.sessions.reduce((acc, s) => acc + s._count.exercises, 0)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Exercices au total</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Séances</h2>
        {program.sessions.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl py-12 text-center">
            <p className="text-gray-600 text-sm">Aucune séance — ajoutez-en une ci-dessous</p>
          </div>
        ) : (
          program.sessions.map((session, i) => (
            <div
              key={session.id}
              className="group flex items-center bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl transition-colors"
            >
              <Link
                href={`/app-clients/${clientId}/programmes/${programId}/seances/${session.id}`}
                className="flex-1 flex items-center gap-3 p-4"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                  <span className="text-brand-400 font-bold text-sm">{i + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{session.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {session.dayOfWeek !== null ? DAY_NAMES[session.dayOfWeek] + " · " : ""}
                    {session._count.exercises} exercice{session._count.exercises !== 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
              <div className="flex items-center gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <form action={duplicateSession.bind(null, session.id, programId, clientId)}>
                  <button
                    type="submit"
                    title="Dupliquer"
                    className="p-1.5 text-gray-500 hover:text-brand-400 transition-colors rounded text-xs"
                  >
                    Copier
                  </button>
                </form>
                <ConfirmButton
                  action={deleteSession.bind(null, session.id, clientId, programId)}
                  message={`Supprimer « ${session.name} » ?`}
                  className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded text-xs"
                >
                  Suppr.
                </ConfirmButton>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4 text-sm">Ajouter une séance</h2>
        <form action={createSessionAction} className="flex flex-wrap gap-3">
          <input
            name="name"
            required
            placeholder="ex : Séance A — Push"
            className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <select
            name="dayOfWeek"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="">Jour (optionnel)</option>
            {DAY_NAMES.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
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
  );
}
