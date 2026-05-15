export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatDateShort, statusLabel, statusColor, challengeProgress, ProspectStatus } from "@/lib/utils";
import Link from "next/link";
import { markAllNotesRead } from "./actions";

type GroupWithParticipants = {
  id: string; name: string; status: string; maxSize: number;
  coachNotes: string | null; startDate: Date; endDate: Date; createdAt: Date;
  participants: {
    day1Done: boolean; day2Done: boolean; day3Done: boolean;
    day4Done: boolean; day5Done: boolean; day6Done: boolean; day7Done: boolean;
    prospect: { name: string };
  }[];
};

type ProspectWithSummary = {
  id: string; name: string; status: string; createdAt: Date;
  summaries: { id: string; createdAt: Date }[];
};

type ActivityRow = {
  id: string;
  completed_at: Date;
  duration_seconds: number | null;
  rpe: number | null;
  session_name: string;
  program_id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  note: string | null;
};

type NoteRow = {
  id: string;
  content: string;
  created_at: Date;
  workout_session_id: string;
  session_name: string;
  program_id: string;
  client_id: string;
  first_name: string;
  last_name: string;
};

function timeAgo(date: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

function formatDuration(s: number | null): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

async function getClientActivity() {
  let recentActivities: ActivityRow[] = [];
  let unreadNotes: NoteRow[] = [];

  try {
    recentActivities = (await db.$queryRaw`
      SELECT
        ws.id, ws.completed_at, ws.duration_seconds, ws.rpe,
        ts.name        AS session_name,
        tp.id          AS program_id,
        c.id           AS client_id,
        c.first_name,
        c.last_name,
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
      LIMIT 10
    `) as ActivityRow[];
  } catch { /* tables not yet created */ }

  try {
    unreadNotes = (await db.$queryRaw`
      SELECT
        sn.id, sn.content, sn.created_at, sn.workout_session_id,
        ts.name AS session_name,
        tp.id   AS program_id,
        c.id    AS client_id,
        c.first_name, c.last_name
      FROM session_notes sn
      JOIN workout_sessions ws ON ws.id = sn.workout_session_id
      JOIN training_sessions ts ON ts.id = ws.training_session_id
      JOIN training_programs tp ON tp.id = ws.program_id
      JOIN clients c ON c.id = sn.client_id
      WHERE sn.is_read = false
      ORDER BY sn.created_at DESC
      LIMIT 10
    `) as NoteRow[];
  } catch { /* tables not yet created */ }

  return { recentActivities, unreadNotes };
}

async function getDashboardData() {
  let totalProspects = 0;
  let byStatus: Record<string, number> = {};
  let activeGroups: GroupWithParticipants[] = [];
  let recentProspects: ProspectWithSummary[] = [];
  let activeClients = 0;

  try {
    const [counts, statusCounts, groups, prospects, clients] = await Promise.all([
      db.prospect.count(),
      db.prospect.groupBy({ by: ["status"], _count: { id: true } }),
      db.challengeGroup.findMany({
        where: { status: { in: ["ACTIVE", "UPCOMING"] } },
        include: { participants: { include: { prospect: { select: { name: true } } } } },
        orderBy: { startDate: "asc" }, take: 4,
      }),
      db.prospect.findMany({
        orderBy: { createdAt: "desc" }, take: 8,
        include: { summaries: { orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      db.coachingClient.count({ where: { isActive: true } }),
    ]);
    totalProspects = counts;
    byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id]));
    activeGroups = groups as GroupWithParticipants[];
    recentProspects = prospects as ProspectWithSummary[];
    activeClients = clients;
  } catch (err) {
    console.error("[dashboard:main]", err);
  }

  const { recentActivities, unreadNotes } = await getClientActivity();

  return {
    totalProspects, byStatus, activeGroups, recentProspects,
    activeClients, revenue: activeClients * 3000,
    recentActivities, unreadNotes,
  };
}

const PIPELINE_STAGES: { status: ProspectStatus; emoji: string }[] = [
  { status: "LEAD", emoji: "📥" },
  { status: "ONBOARDING", emoji: "🔄" },
  { status: "CHALLENGE", emoji: "⚡" },
  { status: "CALL_SCHEDULED", emoji: "📞" },
  { status: "CLIENT", emoji: "✅" },
];

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Prospects total" value={data.totalProspects} sub="dans le pipeline" accent="blue" />
        <StatCard label="En challenge" value={data.byStatus.CHALLENGE ?? 0} sub="Reboot 40+ actifs" accent="purple" />
        <StatCard label="Clients actifs" value={data.activeClients} sub="/ 15 max" accent="green" />
        <StatCard label="CA mensuel" value={`${(data.revenue / 1000).toFixed(0)}k€`} sub="accompagnements" accent="orange" />
      </div>

      {/* Priority: unread notes */}
      {data.unreadNotes.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
              </span>
              <h2 className="text-sm font-semibold text-orange-300 uppercase tracking-wide">Notes clients non lues</h2>
              <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">{data.unreadNotes.length}</span>
            </div>
            <form action={markAllNotesRead}>
              <button type="submit" className="text-xs text-orange-400 hover:text-orange-300 border border-orange-500/30 rounded-lg px-3 py-1.5 hover:bg-orange-500/10 transition-colors">
                Tout marquer lu
              </button>
            </form>
          </div>
          <div className="space-y-2">
            {data.unreadNotes.map((note) => (
              <div key={note.id} className="bg-gray-900 border border-orange-500/20 rounded-lg px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-orange-400 font-bold text-xs">{note.first_name[0]}{note.last_name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-white">{note.first_name} {note.last_name}</p>
                      <span className="text-gray-500 text-xs">·</span>
                      <p className="text-xs text-gray-500 truncate">{note.session_name}</p>
                      <span className="ml-auto text-xs text-orange-400 shrink-0">{timeAgo(note.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-300 italic">&ldquo;{note.content}&rdquo;</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activities */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Activités récentes</h2>
          <Link href="/activites" className="text-xs text-brand-400 hover:text-brand-300 font-medium">Voir tout →</Link>
        </div>
        {data.recentActivities.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">Aucune séance validée pour l&apos;instant</p>
        ) : (
          <div className="space-y-3">
            {data.recentActivities.map((a) => (
              <div key={a.id} className="bg-gray-800 rounded-xl px-4 py-3 space-y-2">
                {/* Row 1: client + badge + time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                      <span className="text-brand-400 font-bold text-xs">{a.first_name[0]}{a.last_name[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{a.first_name} {a.last_name}</p>
                      <p className="text-xs text-gray-500 truncate">{a.session_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-xs rounded-full font-medium">
                      ✓ Complété
                    </span>
                    <span className="text-xs text-gray-500">{timeAgo(a.completed_at)}</span>
                  </div>
                </div>
                {/* Row 2: stats */}
                {(a.rpe !== null || a.duration_seconds) && (
                  <div className="flex items-center gap-3 pl-10">
                    {a.rpe !== null && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        a.rpe >= 8 ? "bg-red-500/10 text-red-400" :
                        a.rpe >= 6 ? "bg-orange-500/10 text-orange-400" :
                        "bg-green-500/10 text-green-400"
                      }`}>RPE {a.rpe}/10</span>
                    )}
                    {a.duration_seconds ? (
                      <span className="text-xs text-gray-500">⏱ {formatDuration(a.duration_seconds)}</span>
                    ) : null}
                  </div>
                )}
                {/* Row 3: note */}
                {a.note && (
                  <p className="pl-10 text-xs text-orange-300 italic">&ldquo;{a.note}&rdquo;</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pipeline */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Pipeline d&apos;acquisition</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage.status} className="flex items-center gap-2 shrink-0">
              <Link href={`/prospects?status=${stage.status}`}
                className="flex flex-col items-center bg-gray-800 hover:bg-gray-700 rounded-xl px-5 py-3 transition-colors min-w-[100px]">
                <span className="text-xl mb-1">{stage.emoji}</span>
                <span className="text-2xl font-bold text-white">{data.byStatus[stage.status] ?? 0}</span>
                <span className="text-xs text-gray-400 mt-1 text-center">{statusLabel(stage.status)}</span>
              </Link>
              {i < PIPELINE_STAGES.length - 1 && (
                <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Groups + Prospects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Groupes Reboot 40+</h2>
            <Link href="/groups/new" className="text-xs text-brand-400 hover:text-brand-300">+ Nouveau</Link>
          </div>
          {data.activeGroups.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Aucun groupe actif</p>
          ) : (
            <div className="space-y-3">
              {data.activeGroups.map((group) => {
                const total = group.participants.reduce((acc, p) => acc + challengeProgress(p), 0);
                const max = group.participants.length * 7;
                const pct = max > 0 ? Math.round((total / max) * 100) : 0;
                return (
                  <Link key={group.id} href={`/groups/${group.id}`} className="block bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{group.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        group.status === "ACTIVE" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      }`}>{group.status === "ACTIVE" ? "En cours" : "À venir"}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span>{group.participants.length}/{group.maxSize} participants</span>
                      <span>{pct}% complété</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div className="bg-brand-500 rounded-full h-1.5" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Derniers prospects</h2>
            <Link href="/prospects/new" className="text-xs text-brand-400 hover:text-brand-300">+ Ajouter</Link>
          </div>
          {data.recentProspects.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">Aucun prospect pour l&apos;instant</p>
          ) : (
            <div className="space-y-2">
              {data.recentProspects.map((p) => (
                <Link key={p.id} href={`/prospects/${p.id}`}
                  className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3 hover:bg-gray-750 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-gray-300">{p.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-gray-500">{formatDateShort(p.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${statusColor(p.status)}`}>{statusLabel(p.status)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub: string; accent: "blue" | "purple" | "green" | "orange" }) {
  const colors = { blue: "text-blue-400", purple: "text-purple-400", green: "text-green-400", orange: "text-brand-400" };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">{label}</p>
      <p className={`text-3xl font-bold ${colors[accent]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}
