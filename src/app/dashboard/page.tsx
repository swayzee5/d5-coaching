export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatDateShort, statusLabel, statusColor, challengeProgress, ProspectStatus } from "@/lib/utils";
import Link from "next/link";
import { markCommentAsRead } from "./actions";

type RecentCompletion = {
  client_id: string;
  client_name: string;
  session_name: string;
  completed_at: Date;
};

type UnreadComment = {
  id: string;
  client_id: string;
  client_name: string;
  content: string;
  created_at: Date;
};

type EndingSoonProgram = {
  id: string;
  name: string;
  end_date: Date;
  client_id: string;
  client_name: string;
};

function timeAgo(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `il y a ${diffMins}min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `il y a ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `il y a ${diffDays}j`;
}

function daysUntil(date: Date): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

async function getDashboardData() {
  const [
    totalProspects,
    statusCounts,
    activeGroups,
    recentProspects,
    activeClients,
  ] = await Promise.all([
    db.prospect.count(),
    db.prospect.groupBy({ by: ["status"], _count: { id: true } }),
    db.challengeGroup.findMany({
      where: { status: { in: ["ACTIVE", "UPCOMING"] } },
      include: {
        participants: {
          include: { prospect: { select: { name: true } } },
        },
      },
      orderBy: { startDate: "asc" },
      take: 4,
    }),
    db.prospect.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { summaries: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    db.coachingClient.count({ where: { isActive: true } }),
  ]);

  const byStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count.id])
  ) as Record<string, number>;

  let recentCompletions: RecentCompletion[] = [];
  let unreadComments: UnreadComment[] = [];
  let endingSoonPrograms: EndingSoonProgram[] = [];

  try {
    recentCompletions = await db.$queryRaw<RecentCompletion[]>`
      SELECT
        rc.client_id::text,
        c.first_name || ' ' || c.last_name AS client_name,
        rs.name AS session_name,
        rc.completed_at
      FROM reboot_completions rc
      JOIN clients c ON c.id = rc.client_id
      JOIN reboot_sessions rs ON rs.id = rc.session_id
      WHERE rc.completed_at > NOW() - INTERVAL '7 days'
      ORDER BY rc.completed_at DESC
      LIMIT 8
    `;
  } catch {}

  try {
    unreadComments = await db.$queryRaw<UnreadComment[]>`
      SELECT
        cc.id::text,
        cc.client_id::text,
        c.first_name || ' ' || c.last_name AS client_name,
        cc.content,
        cc.created_at
      FROM client_comments cc
      JOIN clients c ON c.id = cc.client_id
      WHERE cc.is_read = false
      ORDER BY cc.created_at DESC
      LIMIT 10
    `;
  } catch {}

  try {
    endingSoonPrograms = await db.$queryRaw<EndingSoonProgram[]>`
      SELECT
        tp.id::text,
        tp.name,
        tp.end_date,
        c.id::text AS client_id,
        c.first_name || ' ' || c.last_name AS client_name
      FROM training_programs tp
      JOIN clients c ON c.id = tp.client_id
      WHERE tp.is_active = true
        AND tp.end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      ORDER BY tp.end_date ASC
      LIMIT 10
    `;
  } catch {}

  return {
    totalProspects,
    byStatus,
    activeGroups,
    recentProspects,
    activeClients,
    revenue: activeClients * 3000,
    recentCompletions,
    unreadComments,
    endingSoonPrograms,
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
  const totalNotifications =
    data.unreadComments.length +
    data.recentCompletions.length +
    data.endingSoonPrograms.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Notifications Aujourd'hui */}
      {totalNotifications > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Aujourd&apos;hui
            </h2>
            <span className="text-xs bg-brand-500/20 text-brand-400 border border-brand-500/30 px-2 py-0.5 rounded-full">
              {totalNotifications} notification{totalNotifications > 1 ? "s" : ""}
            </span>
          </div>

          <div className="divide-y divide-gray-800">
            {/* Commentaires non lus */}
            {data.unreadComments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3 px-5 py-4">
                <span className="text-xl shrink-0 mt-0.5">💬</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    <span className="font-medium">{comment.client_name}</span>{" "}
                    a laissé un commentaire
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    &ldquo;{comment.content}&rdquo;
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{timeAgo(comment.created_at)}</p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await markCommentAsRead(comment.id);
                  }}
                  className="shrink-0"
                >
                  <button
                    type="submit"
                    title="Marquer comme lu"
                    className="w-7 h-7 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-white transition-colors text-xs"
                  >
                    ✓
                  </button>
                </form>
              </div>
            ))}

            {/* Séances Reboot terminées */}
            {data.recentCompletions.map((c, i) => (
              <div key={`${c.client_id}-${i}`} className="flex items-start gap-3 px-5 py-4">
                <span className="text-xl shrink-0 mt-0.5">✅</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    <span className="font-medium">{c.client_name}</span>{" "}
                    a terminé{" "}
                    <span className="text-brand-400">{c.session_name}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{timeAgo(c.completed_at)}</p>
                </div>
              </div>
            ))}

            {/* Programmes qui se terminent bientôt */}
            {data.endingSoonPrograms.map((p) => {
              const days = daysUntil(p.end_date);
              return (
                <div key={p.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="text-xl shrink-0 mt-0.5">⏰</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      Programme de{" "}
                      <span className="font-medium">{p.client_name}</span>{" "}
                      se termine dans{" "}
                      <span className={days <= 2 ? "text-red-400 font-semibold" : "text-yellow-400 font-semibold"}>
                        {days} jour{days > 1 ? "s" : ""}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Fin le{" "}
                      {new Date(p.end_date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Prospects total"
          value={data.totalProspects}
          sub="dans le pipeline"
          accent="blue"
        />
        <StatCard
          label="En challenge"
          value={data.byStatus.CHALLENGE ?? 0}
          sub="Reboot 40+ actifs"
          accent="purple"
        />
        <StatCard
          label="Clients actifs"
          value={data.activeClients}
          sub={`/ 15 max`}
          accent="green"
        />
        <StatCard
          label="CA mensuel"
          value={`${(data.revenue / 1000).toFixed(0)}k€`}
          sub="accompagnements"
          accent="orange"
        />
      </div>

      {/* Pipeline funnel */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
          Pipeline d&apos;acquisition
        </h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage, i) => {
            const count = data.byStatus[stage.status] ?? 0;
            const isLast = i === PIPELINE_STAGES.length - 1;
            return (
              <div key={stage.status} className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/prospects?status=${stage.status}`}
                  className="group flex flex-col items-center bg-gray-800 hover:bg-gray-700 rounded-xl px-5 py-3 transition-colors min-w-[100px]"
                >
                  <span className="text-xl mb-1">{stage.emoji}</span>
                  <span className="text-2xl font-bold text-white">{count}</span>
                  <span className="text-xs text-gray-400 mt-1 text-center">
                    {statusLabel(stage.status)}
                  </span>
                </Link>
                {!isLast && (
                  <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            );
          })}
          <div className="ml-4 border-l border-gray-700 pl-4 flex gap-2 shrink-0">
            {(["DECLINED", "GHOST"] as ProspectStatus[]).map((s) => (
              <Link
                key={s}
                href={`/prospects?status=${s}`}
                className="flex flex-col items-center bg-gray-800/50 hover:bg-gray-700 rounded-xl px-4 py-3 transition-colors min-w-[80px]"
              >
                <span className="text-xl mb-1">{s === "DECLINED" ? "🚫" : "👻"}</span>
                <span className="text-xl font-bold text-gray-500">
                  {data.byStatus[s] ?? 0}
                </span>
                <span className="text-xs text-gray-500 mt-1">{statusLabel(s)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Groupes actifs */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Groupes Reboot 40+
            </h2>
            <Link
              href="/groups/new"
              className="text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              + Nouveau
            </Link>
          </div>
          {data.activeGroups.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">
              Aucun groupe actif
            </p>
          ) : (
            <div className="space-y-3">
              {data.activeGroups.map((group) => {
                const totalDays = group.participants.reduce(
                  (acc, p) =>
                    acc +
                    challengeProgress({
                      day1Done: p.day1Done,
                      day2Done: p.day2Done,
                      day3Done: p.day3Done,
                      day4Done: p.day4Done,
                      day5Done: p.day5Done,
                      day6Done: p.day6Done,
                      day7Done: p.day7Done,
                    }),
                  0
                );
                const maxDays = group.participants.length * 7;
                const pct = maxDays > 0 ? Math.round((totalDays / maxDays) * 100) : 0;

                return (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}`}
                    className="block bg-gray-800 hover:bg-gray-750 rounded-lg p-4 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{group.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          group.status === "ACTIVE"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        }`}
                      >
                        {group.status === "ACTIVE" ? "En cours" : "À venir"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>
                        {group.participants.length}/{group.maxSize} participants
                      </span>
                      <span>{pct}% complété</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-brand-500 rounded-full h-1.5 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          <Link
            href="/groups"
            className="block text-center text-xs text-gray-500 hover:text-gray-300 mt-4 pt-3 border-t border-gray-800"
          >
            Voir tous les groupes →
          </Link>
        </div>

        {/* Prospects récents */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Derniers prospects
            </h2>
            <Link
              href="/prospects/new"
              className="text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              + Ajouter
            </Link>
          </div>
          {data.recentProspects.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">
              Aucun prospect pour l&apos;instant
            </p>
          ) : (
            <div className="space-y-2">
              {data.recentProspects.map((p) => (
                <Link
                  key={p.id}
                  href={`/prospects/${p.id}`}
                  className="flex items-center justify-between bg-gray-800 hover:bg-gray-750 rounded-lg px-4 py-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-gray-300">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatDateShort(p.createdAt)}
                        {p.summaries.length > 0 && (
                          <span className="ml-2 text-brand-400">✦ Résumé IA</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${statusColor(p.status)}`}
                  >
                    {statusLabel(p.status)}
                  </span>
                </Link>
              ))}
            </div>
          )}
          <Link
            href="/prospects"
            className="block text-center text-xs text-gray-500 hover:text-gray-300 mt-4 pt-3 border-t border-gray-800"
          >
            Voir tous les prospects →
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent: "blue" | "purple" | "green" | "orange";
}) {
  const accentMap = {
    blue: "bg-blue-500/10 text-blue-400",
    purple: "bg-purple-500/10 text-purple-400",
    green: "bg-green-500/10 text-green-400",
    orange: "bg-brand-500/10 text-brand-400",
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">{label}</p>
      <p className={`text-3xl font-bold ${accentMap[accent].split(" ")[1]}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}
