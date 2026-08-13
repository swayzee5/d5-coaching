export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Activités — D5 CRM" };

// Une séance peut venir de deux sources :
//   - le CLIENT la valide dans l'app  -> workout_sessions + set_performances
//   - le COACH la lance via « Commencer » -> session_completions + exercise_set_results
// Cette page ne lisait que la seconde, d'où l'absence totale des séances des
// clients. On lit les deux et on fusionne par date.
type Activity = {
  id: string;
  by: "client" | "coach";
  completedAt: Date;
  title: string;
  programName: string | null;
  clientId: string;
  clientName: string;
  href: string;
  sets: number;
  durationSeconds: number | null;
  rpe: number | null;
  note: string | null;
  isFree: boolean;
};

type LoadResult =
  | { ok: true; activities: Activity[] }
  | { ok: false; message: string };

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}

async function loadActivities(): Promise<LoadResult> {
  try {
    // Séances validées par les clients. Les jointures sont volontairement
    // LEFT : une activité libre a training_session_id et program_id à NULL.
    const clientSessions = await db.workoutSession.findMany({
      where: { status: "completed" },
      orderBy: { completedAt: "desc" },
      take: 100,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        trainingSession: {
          select: { id: true, name: true, program: { select: { id: true, name: true } } },
        },
        setPerformances: { select: { id: true } },
        sessionNotes: { select: { content: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
    });

    // Séances lancées par le coach depuis le CRM.
    const coachSessions = await db.sessionCompletion.findMany({
      orderBy: { completedAt: "desc" },
      take: 100,
      include: {
        session: {
          include: {
            program: {
              include: { client: { select: { id: true, firstName: true, lastName: true } } },
            },
          },
        },
        setResults: { select: { id: true, completed: true } },
      },
    });

    const activities: Activity[] = [
      ...clientSessions.map((ws): Activity => {
        const name = `${ws.client.firstName} ${ws.client.lastName}`;
        const ts = ws.trainingSession;
        return {
          id: `ws-${ws.id}`,
          by: "client",
          completedAt: ws.completedAt ?? ws.startedAt ?? new Date(0),
          title: ts?.name ?? ws.activityType ?? "Activité libre",
          programName: ts?.program.name ?? null,
          clientId: ws.client.id,
          clientName: name,
          href:
            ts && ts.program
              ? `/app-clients/${ws.client.id}/programmes/${ts.program.id}/seances/${ts.id}/resultats`
              : `/app-clients/${ws.client.id}`,
          sets: ws.setPerformances.length,
          durationSeconds: ws.durationSeconds,
          rpe: ws.rpe,
          note: ws.sessionNotes[0]?.content ?? null,
          isFree: !ts,
        };
      }),
      ...coachSessions.map((sc): Activity => {
        const client = sc.session.program.client;
        const name = `${client.firstName} ${client.lastName}`;
        return {
          id: `sc-${sc.id}`,
          by: "coach",
          completedAt: sc.completedAt,
          title: sc.session.name,
          programName: sc.session.program.name,
          clientId: client.id,
          clientName: name,
          href: `/app-clients/${client.id}/programmes/${sc.session.program.id}/seances/${sc.session.id}/resultats`,
          sets: sc.setResults.filter((s) => s.completed).length,
          durationSeconds: sc.durationMinutes ? sc.durationMinutes * 60 : null,
          rpe: null,
          note: sc.notes,
          isFree: false,
        };
      }),
    ]
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
      .slice(0, 100);

    return { ok: true, activities };
  } catch (err) {
    console.error("[activites] chargement en échec", err);
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

export default async function ActivitesPage() {
  const result = await loadActivities();
  const activities = result.ok ? result.activities : [];

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white mt-3">Activités clients</h1>
        <p className="text-gray-400 text-sm mt-1">
          {activities.length} séance{activities.length !== 1 ? "s" : ""} enregistrée
          {activities.length !== 1 ? "s" : ""}
        </p>
      </div>

      {!result.ok ? (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-5 py-6">
          <p className="text-red-400 text-sm font-medium">Impossible de charger les activités</p>
          <p className="text-gray-400 text-xs mt-1.5">
            Ce n&apos;est pas une absence d&apos;activité : la requête a échoué. Souvent une
            table pas encore créée côté app client.
          </p>
          <p className="text-gray-500 text-xs mt-2 font-mono break-words">{result.message}</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">Aucune activité enregistrée</p>
          <p className="text-gray-600 text-xs mt-1">
            Les séances apparaissent dès que vos clients les valident
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => {
            const duration = formatDuration(a.durationSeconds);
            return (
              <Link
                key={a.id}
                href={a.href}
                className="block bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                      <span className="text-brand-400 font-bold text-sm">
                        {initials(a.clientName)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm">{a.clientName}</p>
                      <p className="text-xs text-gray-500">
                        {a.completedAt.toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 text-xs rounded-full font-medium border ${
                      a.by === "coach"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : a.isFree
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : "bg-green-500/10 text-green-400 border-green-500/20"
                    }`}
                  >
                    {a.by === "coach" ? "Saisie coach" : a.isFree ? "Activité libre" : "Séance client"}
                  </span>
                </div>

                <div className="flex items-center gap-2 pl-13">
                  <div className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
                  <p className="text-sm text-gray-300 font-medium">{a.title}</p>
                  {a.programName && (
                    <span className="text-xs text-gray-600 truncate">· {a.programName}</span>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap pl-13">
                  {a.rpe !== null && (
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        a.rpe >= 8
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : a.rpe >= 6
                          ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                          : "bg-green-500/10 text-green-400 border-green-500/20"
                      }`}
                    >
                      Effort {a.rpe}/10
                    </span>
                  )}
                  {a.sets > 0 && (
                    <span className="text-xs text-gray-400">
                      {a.sets} série{a.sets > 1 ? "s" : ""}
                    </span>
                  )}
                  {duration && <span className="text-xs text-gray-400">{duration}</span>}
                </div>

                {a.note && (
                  <div className="ml-13 bg-orange-500/5 border border-orange-500/15 rounded-lg px-3 py-2">
                    <p className="text-xs text-orange-400 font-medium mb-0.5">Note</p>
                    <p className="text-sm text-gray-300 italic">&ldquo;{a.note}&rdquo;</p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
