export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { formatDateShort, statusLabel, statusColor, challengeProgress, ProspectStatus } from "@/lib/utils";
import Link from "next/link";

type GroupWithParticipants = {
  id: string; name: string; status: string; maxSize: number;
  coachNotes: string | null; startDate: Date; endDate: Date; createdAt: Date;
  participants: {
    day1Done: boolean; day2Done: boolean; day3Done: boolean;
    day4Done: boolean; day5Done: boolean; day6Done: boolean; day7Done: boolean;
    prospect: { name: string };
  }[];
};
type ProspectWithSummary = { id: string; name: string; status: string; createdAt: Date; summaries: { id: string; createdAt: Date }[] };
type RecentCompletion = {
  id: string; initiatedBy: string; completedAt: Date;
  setResults: { completed: boolean }[];
  session: { id: string; name: string; program: { id: string; name: string; client: { id: string; firstName: string; lastName: string } } };
};
type UnreadMessage  = { client_id: string; content: string; created_at: Date };
type UnreadCheckin  = { id: string; client_id: string; energy: number; sleep: number; stress: number; submitted_at: Date };
type RebootCheckin  = { id: string; client_id: string; energy: number | null; sleep_quality: number | null; weight: number | null; feeling: string | null; submitted_at: Date };
type CompletedRebootClient = { client_id: string; clientName: string; created_at: Date };

const ENERGY_EMOJIS = ["😴","😪","🙂","😊","💪"];
const SLEEP_EMOJIS  = ["😴","😪","🙂","😊","⭐"];
const STRESS_EMOJIS = ["😰","😟","😐","🙂","🙌"];

async function getDashboardData() {
  let totalProspects = 0, activeClients = 0;
  let byStatus: Record<string, number> = {};
  let activeGroups: GroupWithParticipants[] = [];
  let recentProspects: ProspectWithSummary[] = [];
  let recentCompletions: RecentCompletion[] = [];
  let unreadMessages: (UnreadMessage & { clientName: string })[] = [];
  let unreadCheckins: (UnreadCheckin & { clientName: string })[] = [];
  let rebootCheckins: (RebootCheckin & { clientName: string })[] = [];
  let completedRebootClients: CompletedRebootClient[] = [];

  try {
    const [counts, statusCounts, groups, prospects, clients] = await Promise.all([
      db.prospect.count(),
      db.prospect.groupBy({ by: ["status"], _count: { id: true } }),
      db.challengeGroup.findMany({ where: { status: { in: ["ACTIVE","UPCOMING"] } }, include: { participants: { include: { prospect: { select: { name: true } } } } }, orderBy: { startDate: "asc" }, take: 4 }),
      db.prospect.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { summaries: { orderBy: { createdAt: "desc" }, take: 1 } } }),
      db.coachingClient.count({ where: { isActive: true } }),
    ]);
    totalProspects = counts;
    byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count.id]));
    activeGroups = groups as GroupWithParticipants[];
    recentProspects = prospects as ProspectWithSummary[];
    activeClients = clients;
  } catch (err) { console.error("[dashboard:main]", err); }

  try {
    recentCompletions = await db.sessionCompletion.findMany({
      orderBy: { completedAt: "desc" }, take: 6,
      include: { session: { include: { program: { include: { client: { select: { id: true, firstName: true, lastName: true } } } } } }, setResults: { select: { completed: true } } },
    }) as RecentCompletion[];
  } catch {}

  try {
    await db.$executeRaw`CREATE TABLE IF NOT EXISTS messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id TEXT NOT NULL, sender_role TEXT NOT NULL, content TEXT NOT NULL, is_read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now())`.catch(() => {});
    type MsgRow = { client_id: string; content: string; created_at: Date };
    const msgRows = await db.$queryRaw<MsgRow[]>`SELECT DISTINCT ON (client_id) client_id, content, created_at FROM messages WHERE sender_role = 'client' AND is_read = false ORDER BY client_id, created_at DESC LIMIT 5`.catch(() => [] as MsgRow[]);
    unreadMessages = await Promise.all(msgRows.map(async (row) => {
      const c = await db.appClient.findUnique({ where: { id: row.client_id }, select: { firstName: true, lastName: true } }).catch(() => null);
      return { ...row, clientName: c ? `${c.firstName} ${c.lastName}` : row.client_id };
    }));
  } catch {}

  try {
    await db.$executeRaw`CREATE TABLE IF NOT EXISTS weekly_checkins (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id TEXT NOT NULL, energy INT NOT NULL, sleep INT NOT NULL, stress INT NOT NULL, weight DECIMAL(5,2), note TEXT, is_read BOOLEAN DEFAULT false, submitted_at TIMESTAMPTZ DEFAULT now())`.catch(() => {});
    type CRow = { id: string; client_id: string; energy: number; sleep: number; stress: number; submitted_at: Date };
    const cRows = await db.$queryRaw<CRow[]>`SELECT id, client_id, energy, sleep, stress, submitted_at FROM weekly_checkins WHERE is_read = false ORDER BY submitted_at DESC LIMIT 5`.catch(() => [] as CRow[]);
    unreadCheckins = await Promise.all(cRows.map(async (row) => {
      const c = await db.appClient.findUnique({ where: { id: row.client_id }, select: { firstName: true, lastName: true } }).catch(() => null);
      return { ...row, clientName: c ? `${c.firstName} ${c.lastName}` : row.client_id };
    }));
  } catch {}

  try {
    await db.$executeRaw`CREATE TABLE IF NOT EXISTS reboot_mid_checkins (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id TEXT NOT NULL UNIQUE, energy INT, sleep_quality INT, weight DECIMAL(5,2), feeling TEXT, submitted_at TIMESTAMPTZ DEFAULT now())`.catch(() => {});
    type RRow = { id: string; client_id: string; energy: number | null; sleep_quality: number | null; weight: number | null; feeling: string | null; submitted_at: Date };
    const rRows = await db.$queryRaw<RRow[]>`SELECT id, client_id, energy, sleep_quality, weight, feeling, submitted_at FROM reboot_mid_checkins ORDER BY submitted_at DESC LIMIT 5`.catch(() => [] as RRow[]);
    rebootCheckins = await Promise.all(rRows.map(async (row) => {
      const c = await db.appClient.findUnique({ where: { id: row.client_id }, select: { firstName: true, lastName: true } }).catch(() => null);
      return { ...row, clientName: c ? `${c.firstName} ${c.lastName}` : row.client_id };
    }));
  } catch {}

  try {
    await db.$executeRaw`CREATE TABLE IF NOT EXISTS coach_notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id TEXT NOT NULL, type TEXT NOT NULL, is_read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(client_id, type))`.catch(() => {});
    type NRow = { client_id: string; created_at: Date };
    const nRows = await db.$queryRaw<NRow[]>`SELECT client_id, created_at FROM coach_notifications WHERE type = 'reboot_completed' AND is_read = false ORDER BY created_at DESC LIMIT 10`.catch(() => [] as NRow[]);
    completedRebootClients = await Promise.all(nRows.map(async (row) => {
      const c = await db.appClient.findUnique({ where: { id: row.client_id }, select: { firstName: true, lastName: true } }).catch(() => null);
      return { client_id: row.client_id, clientName: c ? `${c.firstName} ${c.lastName}` : row.client_id, created_at: row.created_at };
    }));
  } catch {}

  return { totalProspects, byStatus, activeGroups, recentProspects, activeClients, revenue: activeClients * 3000, recentCompletions, unreadMessages, unreadCheckins, rebootCheckins, completedRebootClients };
}

const PIPELINE_STAGES: { status: ProspectStatus; emoji: string }[] = [
  { status: "LEAD", emoji: "📥" }, { status: "ONBOARDING", emoji: "🔄" }, { status: "CHALLENGE", emoji: "⚡" }, { status: "CALL_SCHEDULED", emoji: "📞" }, { status: "CLIENT", emoji: "✅" },
];

export default async function DashboardPage() {
  const data = await getDashboardData();
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <Link href="/parametres" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">⚙️ Paramètres</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Prospects total" value={data.totalProspects} sub="dans le pipeline" accent="blue" />
        <StatCard label="En challenge" value={data.byStatus.CHALLENGE ?? 0} sub="Reboot 40+ actifs" accent="purple" />
        <StatCard label="Clients actifs" value={data.activeClients} sub="/ 15 max" accent="green" />
        <StatCard label="CA mensuel" value={`${(data.revenue / 1000).toFixed(0)}k€`} sub="accompagnements" accent="orange" />
      </div>

      {data.completedRebootClients.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-yellow-500/30 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400" /></span>
            <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide">🏆 Challenge Reboot terminé ({data.completedRebootClients.length})</h2>
          </div>
          <div className="space-y-2">
            {data.completedRebootClients.map((n, i) => (
              <Link key={i} href={`/app-clients/${n.client_id}`} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 hover:bg-gray-750 transition-colors">
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <span className="text-yellow-400 font-bold text-xs">{n.clientName.split(" ").map((w: string) => w[0]).join("").slice(0,2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{n.clientName}</p>
                  <p className="text-xs text-gray-500">A terminé le Reboot 40+ — moment idéal pour l&apos;appel découverte 🎯</p>
                </div>
                <span className="text-xs text-yellow-400 font-semibold shrink-0">Contacter →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.unreadMessages.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-blue-500/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" /></span><h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Messages non lus ({data.unreadMessages.length})</h2></div>
            <Link href="/messages" className="text-xs text-blue-400 hover:text-blue-300 font-medium">Voir tout →</Link>
          </div>
          <div className="space-y-2">
            {data.unreadMessages.map((msg, i) => (
              <Link key={i} href={`/app-clients/${msg.client_id}/messages`} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 hover:bg-gray-750 transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0"><span className="text-blue-400 font-bold text-xs">{msg.clientName.split(" ").map((n) => n[0]).join("").slice(0,2)}</span></div>
                <div className="flex-1 min-w-0"><p className="text-sm text-white font-medium">{msg.clientName}</p><p className="text-xs text-gray-500 truncate">{msg.content}</p></div>
                <p className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.unreadCheckins.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-purple-500/30 p-5">
          <div className="flex items-center gap-2 mb-4"><span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" /></span><h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wide">Check-ins non lus ({data.unreadCheckins.length})</h2></div>
          <div className="space-y-2">
            {data.unreadCheckins.map((c) => (
              <Link key={c.id} href={`/app-clients/${c.client_id}/checkins`} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 hover:bg-gray-750 transition-colors">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0"><span className="text-purple-400 font-bold text-xs">{c.clientName.split(" ").map((n) => n[0]).join("").slice(0,2)}</span></div>
                <div className="flex-1 min-w-0"><p className="text-sm text-white font-medium">{c.clientName}</p><p className="text-xs text-gray-500">Énergie {ENERGY_EMOJIS[c.energy-1]} · Sommeil {SLEEP_EMOJIS[c.sleep-1]} · Stress {STRESS_EMOJIS[c.stress-1]}</p></div>
                <p className="text-xs text-gray-400">{new Date(c.submitted_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.rebootCheckins.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-amber-500/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" /></span><h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">Check-ins Reboot ({data.rebootCheckins.length})</h2></div>
            <span className="text-xs text-amber-500/60 font-medium">🏆 Mi-challenge</span>
          </div>
          <div className="space-y-2">
            {data.rebootCheckins.map((c) => (
              <Link key={c.id} href={`/app-clients/${c.client_id}/checkins`} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 hover:bg-gray-750 transition-colors">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0"><span className="text-amber-400 font-bold text-xs">{c.clientName.split(" ").map((n) => n[0]).join("").slice(0,2)}</span></div>
                <div className="flex-1 min-w-0"><p className="text-sm text-white font-medium">{c.clientName}</p><p className="text-xs text-gray-500">{c.energy!=null?`Énergie ${ENERGY_EMOJIS[(c.energy??1)-1]}`:""}{c.sleep_quality!=null?` · Sommeil ${SLEEP_EMOJIS[(c.sleep_quality??1)-1]}`:""}{c.weight!=null?` · ${c.weight} kg`:""}{c.feeling?` · "${c.feeling.slice(0,40)}…"`:""}</p></div>
                <p className="text-xs text-gray-400">{new Date(c.submitted_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Activités récentes</h2><Link href="/activites" className="text-xs text-brand-400 hover:text-brand-300 font-medium">Voir tout →</Link></div>
        {data.recentCompletions.length === 0 ? <p className="text-gray-500 text-sm text-center py-6">Aucune séance validée pour l&apos;instant</p> : (
          <div className="space-y-2">{data.recentCompletions.map((c) => { const cl = c.session.program.client; const done = c.setResults.filter((s) => s.completed).length; return (
            <Link key={c.id} href={`/app-clients/${cl.id}/programmes/${c.session.program.id}/seances/${c.session.id}/resultats`} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 hover:bg-gray-750 transition-colors">
              <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0"><span className="text-brand-400 font-bold text-xs">{cl.firstName[0]}{cl.lastName[0]}</span></div>
              <div className="flex-1 min-w-0"><p className="text-sm text-white font-medium">{cl.firstName} {cl.lastName}</p><p className="text-xs text-gray-500 truncate">{c.session.name}</p></div>
              <p className="text-xs text-gray-400">{done}/{c.setResults.length}</p>
            </Link>
          ); })}</div>
        )}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Pipeline d&apos;acquisition</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage.status} className="flex items-center gap-2 shrink-0">
              <Link href={`/prospects?status=${stage.status}`} className="flex flex-col items-center bg-gray-800 hover:bg-gray-700 rounded-xl px-5 py-3 transition-colors min-w-[100px]">
                <span className="text-xl mb-1">{stage.emoji}</span><span className="text-2xl font-bold text-white">{data.byStatus[stage.status] ?? 0}</span><span className="text-xs text-gray-400 mt-1 text-center">{statusLabel(stage.status)}</span>
              </Link>
              {i < PIPELINE_STAGES.length - 1 && <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Groupes Reboot 40+</h2><Link href="/groups/new" className="text-xs text-brand-400 hover:text-brand-300">+ Nouveau</Link></div>
          {data.activeGroups.length === 0 ? <p className="text-gray-500 text-sm text-center py-6">Aucun groupe actif</p> : (
            <div className="space-y-3">{data.activeGroups.map((group) => { const total = group.participants.reduce((acc,p) => acc+challengeProgress(p),0); const max = group.participants.length*7; const pct = max>0?Math.round((total/max)*100):0; return (
              <Link key={group.id} href={`/groups/${group.id}`} className="block bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-white">{group.name}</span><span className={`text-xs px-2 py-0.5 rounded-full border ${group.status==="ACTIVE"?"bg-green-500/10 text-green-400 border-green-500/20":"bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>{group.status==="ACTIVE"?"En cours":"À venir"}</span></div>
                <div className="flex justify-between text-xs text-gray-400 mb-2"><span>{group.participants.length}/{group.maxSize} participants</span><span>{pct}% complété</span></div>
                <div className="w-full bg-gray-700 rounded-full h-1.5"><div className="bg-brand-500 rounded-full h-1.5" style={{width:`${pct}%`}} /></div>
              </Link>
            ); })}</div>
          )}
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Derniers prospects</h2><Link href="/prospects/new" className="text-xs text-brand-400 hover:text-brand-300">+ Ajouter</Link></div>
          {data.recentProspects.length === 0 ? <p className="text-gray-500 text-sm text-center py-6">Aucun prospect pour l&apos;instant</p> : (
            <div className="space-y-2">{data.recentProspects.map((p) => (
              <Link key={p.id} href={`/prospects/${p.id}`} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3 hover:bg-gray-750 transition-colors">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0"><span className="text-xs font-medium text-gray-300">{p.name.charAt(0).toUpperCase()}</span></div><div><p className="text-sm font-medium text-white">{p.name}</p><p className="text-xs text-gray-500">{formatDateShort(p.createdAt)}</p></div></div>
                <span className={`text-xs px-2 py-1 rounded-full border ${statusColor(p.status)}`}>{statusLabel(p.status)}</span>
              </Link>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub: string; accent: "blue"|"purple"|"green"|"orange" }) {
  const colors = { blue: "text-blue-400", purple: "text-purple-400", green: "text-green-400", orange: "text-brand-400" };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">{label}</p>
      <p className={`text-3xl font-bold ${colors[accent]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}
