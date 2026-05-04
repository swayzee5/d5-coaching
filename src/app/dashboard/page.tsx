import { db } from "@/lib/db";
import { formatDateShort, statusLabel, statusColor, challengeProgress, ProspectStatus } from "@/lib/utils";
import Link from "next/link";

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

  return {
    totalProspects,
    byStatus,
    activeGroups,
    recentProspects,
    activeClients,
    revenue: activeClients * 3000,
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
          {/* Ghostés / Refusés */}
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
