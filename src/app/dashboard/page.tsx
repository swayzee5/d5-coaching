export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatDateShort, statusLabel, statusColor, challengeProgress, ProspectStatus } from "@/lib/utils";
import Link from "next/link";

type GroupWithParticipants = {
  id: string;
  name: string;
  status: string;
  maxSize: number;
  coachNotes: string | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  participants: {
    day1Done: boolean; day2Done: boolean; day3Done: boolean;
    day4Done: boolean; day5Done: boolean; day6Done: boolean; day7Done: boolean;
    prospect: { name: string };
  }[];
};

type ProspectWithSummary = {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  summaries: { id: string; createdAt: Date }[];
};

type RecentCompletion = {
  id: string;
  initiatedBy: string;
  completedAt: Date;
  setResults: { completed: boolean }[];
  session: {
    id: string; name: string;
    program: { id: string; name: string; client: { id: string; firstName: string; lastName: string } };
  };
};

async function getDashboardData() {
  let totalProspects = 0;
  let byStatus: Record<string, number> = {};
  let activeGroups: GroupWithParticipants[] = [];
  let recentProspects: ProspectWithSummary[] = [];
  let activeClients = 0;
  let recentCompletions: RecentCompletion[] = [];

  try {
    const [counts, statusCounts, groups, prospects, clients] = await Promise.all([
      db.prospect.count(),
      db.prospect.groupBy({ by: ["status"], _count: { id: true } }),
      db.challengeGroup.findMany({
        where: { status: { in: ["ACTIVE", "UPCOMING"] } },
        include: { participants: { include: { prospect: { select: { name: true } } } } },
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
    totalProspects = counts;
    byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id]));
    activeGroups = groups as GroupWithParticipants[];
    recentProspects = prospects as ProspectWithSummary[];
    activeClients = clients;
  } catch (err) {
    console.error("[dashboard:main]", err);
  }

  try {
    recentCompletions = await db.sessionCompletion.findMany({
      orderBy: { completedAt: "desc" }, take: 6,
      include: {
        session: { include: { program: { include: { client: { select: { id: true, firstName: true, lastName: true } } } } } },
        setResults: { select: { completed: true } },
      },
    }) as RecentCompletion[];
  } catch { /* table not migrated */ }

  return { totalProspects, byStatus, activeGroups, recentProspects, activeClients, revenue: activeClients * 3000, recentCompletions };
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Prospects total" value={data.totalProspects} sub="dans le pipeline" accent="blue" />
        <StatCard label="En challenge" value={data.byStatus.CHALLENGE ?? 0} sub="Reboot 40+ actifs" accent="purple" />
        <StatCard label="Clients actifs" value={data.activeClients} sub="/ 15 max" accent="green" />
        <StatCard label="CA mensuel" value={`${(data.revenue / 1000).toFixed(0)}k€`} sub="accompagnements" accent="orange" />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Activités récentes</h2>
          <Link href="/activites" className="text-xs text-brand-400 hover:text-brand-300 font-medium">Voir tout →</Link>
        </div>
        {data.recentCompletions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">Aucune séance validée pour l’instant</p>
        ) : (
          <div className="space-y-2">
            {data.recentCompletions.map((c) => {
              const client = c.session.program.client;
              const done = c.setResults.filter((s) => s.completed).length;
              return (
                <Link key={c.id} href={`/app-clients/${client.id}/programmes/${c.session.program.id}/seances/${c.session.id}/resultats`}
                  className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 hover:bg-gray-750 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                    <span className="text-brand-400 font-bold text-xs">{client.firstName[0]}{client.lastName[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{client.firstName} {client.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{c.session.name}</p>
                  </div>
                  <p className="text-xs text-gray-400">{done}/{c.setResults.length}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

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
