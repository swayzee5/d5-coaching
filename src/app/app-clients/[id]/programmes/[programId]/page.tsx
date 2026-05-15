export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSession, renameSession, duplicateSession, deleteSession, duplicateWeek, deleteProgram } from "../actions";
import { ClientSessionList } from "@/components/programme/ClientSessionList";
import { DeleteProgramButton } from "@/components/programme/DeleteProgramButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Programme — D5 CRM" };
const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type SessionRow = {
  id: string;
  name: string;
  dayOfWeek: number | null;
  weekNumber: number | null;
  orderIndex: number;
  _count: { exercises: number };
};

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
        orderBy: [{ weekNumber: "asc" }, { orderIndex: "asc" }],
        include: { _count: { select: { exercises: true } } },
      },
    },
  });
  if (!program || program.clientId !== clientId) notFound();

  const sessions = program.sessions as unknown as SessionRow[];

  const weekGroups = new Map<number | null, SessionRow[]>();
  for (const session of sessions) {
    const key = session.weekNumber ?? null;
    if (!weekGroups.has(key)) weekGroups.set(key, []);
    weekGroups.get(key)!.push(session);
  }
  const sortedWeeks = [...weekGroups.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });

  const createSessionAction = createSession.bind(null, programId, clientId);
  const duplicateWeekAction = duplicateWeek.bind(null, programId, clientId);
  const deleteProgramAction = deleteProgram.bind(null, programId, clientId);

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
                  Début : 
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(program.startDate))}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`px-3 py-1 text-xs rounded-full font-medium ${
                program.isActive
                  ? "bg-green-500/10 text-green-400"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              {program.isActive ? "Actif" : "Inactif"}
            </span>
            <DeleteProgramButton
              deleteAction={deleteProgramAction}
              programName={program.name}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-6 px-5 py-4 bg-gray-900 border border-gray-800 rounded-xl">
        <div>
          <p className="text-2xl font-black text-white">{sessions.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Séance{sessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div>
          <p className="text-2xl font-black text-white">
            {sessions.reduce((acc, s) => acc + s._count.exercises, 0)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Exercices au total</p>
        </div>
        {sortedWeeks.filter((w) => w !== null).length > 0 && (
          <div>
            <p className="text-2xl font-black text-white">
              {sortedWeeks.filter((w) => w !== null).length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Semaines</p>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Séances</h2>
        {sessions.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl py-12 text-center">
            <p className="text-gray-600 text-sm">Aucune séance — ajoutez-en une ci-dessous</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedWeeks.map((weekNum) => {
              const weekSessions = weekGroups.get(weekNum)!;
              const weekLabel = weekNum === null ? "Sans semaine" : `Semaine ${weekNum}`;
              return (
                <div key={weekNum ?? "none"} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {weekLabel}
                      <span className="ml-2 text-gray-700 normal-case font-normal">
                        {weekSessions.length} séance{weekSessions.length !== 1 ? "s" : ""}
                      </span>
                    </h3>
                    {weekNum !== null && (
                      <form action={duplicateWeekAction}>
                        <input type="hidden" name="weekNumber" value={weekNum} />
                        <button
                          type="submit"
                          className="text-xs text-gray-600 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-gray-800"
                        >
                          Dupliquer cette semaine
                        </button>
                      </form>
                    )}
                  </div>
                  <ClientSessionList
                    sessions={weekSessions as any}
                    programId={programId}
                    clientId={clientId}
                    renameAction={renameSession}
                    duplicateAction={duplicateSession}
                    deleteAction={deleteSession}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4 text-sm">Ajouter une séance</h2>
        <form action={createSessionAction} className="flex flex-wrap gap-3">
          <input
            name="name"
            required
            placeholder="ex : Séance A — Push"
            className="flex-1 min-w-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <input
            type="number"
            name="weekNumber"
            min={1}
            placeholder="Sem."
            title="Numéro de semaine"
            className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white text-center placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
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
