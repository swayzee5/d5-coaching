export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Activités — D5 CRM" };

type ActivityRow = {
  id: string;
  completed_at: Date;
  started_at: Date;
  duration_seconds: number | null;
  rpe: number | null;
  session_id: string;
  session_name: string;
  program_id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  note: string | null;
};

function timeAgo(date: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatDuration(s: number | null): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

async function getAllActivities(): Promise<ActivityRow[]> {
  try {
    return (await db.$queryRaw`
      SELECT
        ws.id, ws.completed_at, ws.started_at, ws.duration_seconds, ws.rpe,
        ts.id   AS session_id,
        ts.name AS session_name,
        tp.id   AS program_id,
        c.id    AS client_id,
        c.first_name, c.last_name,
        (
          SELECT content FROM session_notes
          WHERE workout_session_id = ws.id
          ORDER BY created_at ASC LIMIT 1
        ) AS note
      FROM workout_sessions ws
      JOIN training_sessions ts ON ts.id = ws.training_session_id
      JOIN training_programs tp ON tp.id = ws.program_id
      JOIN clients c ON c.id = ws.client_id
      WHERE ws.status = 'completed'
      ORDER BY ws.completed_at DESC
      LIMIT 50
    `) as ActivityRow[];
  } catch {
    return [];
  }
}

export default async function ActivitesPage() {
  const activities = await getAllActivities();

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white mt-3">Activités clients</h1>
          <p className="text-gray-400 text-sm mt-1">{activities.length} séance{activities.length !== 1 ? "s" : ""} enregistrée{activities.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center">
          <p className="text-gray-500 text-sm">Aucune activité enregistrée</p>
          <p className="text-gray-600 text-xs mt-1">Les séances apparaissent dès que vos clients les valident</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <Link
              key={a.id}
              href={`/app-clients/${a.client_id}/programmes/${a.program_id}/seances/${a.session_id}/progression`}
              className="block bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-5 py-4 transition-colors space-y-3"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                    <span className="text-brand-400 font-bold text-sm">
                      {a.first_name[0]}{a.last_name[0]}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm">
                      {a.first_name} {a.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{formatDateTime(a.completed_at)}</p>
                  </div>
                </div>
                <span className="shrink-0 px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/20 text-xs rounded-full font-medium">
                  ✓ Activé terminée
                </span>
              </div>

              {/* Session name */}
              <div className="flex items-center gap-2 pl-13">
                <div className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
                <p className="text-sm text-gray-300 font-medium">{a.session_name}</p>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 flex-wrap pl-13">
                {a.rpe !== null && (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    a.rpe >= 8 ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                    a.rpe >= 6 ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                    "bg-green-500/10 text-green-400 border border-green-500/20"
                  }`}>
                    Effort {a.rpe}/10
                  </span>
                )}
                {a.duration_seconds ? (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDuration(a.duration_seconds)}
                  </span>
                ) : null}
                <span className="text-xs text-gray-600 ml-auto">{timeAgo(a.completed_at)}</span>
              </div>

              {/* Note */}
              {a.note && (
                <div className="ml-13 bg-orange-500/5 border border-orange-500/15 rounded-lg px-3 py-2">
                  <p className="text-xs text-orange-400 font-medium mb-0.5">Note</p>
                  <p className="text-sm text-gray-300 italic">&ldquo;{a.note}&rdquo;</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
