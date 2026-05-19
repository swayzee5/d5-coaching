// v2
export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { NutritionUpload } from "@/components/app-clients/NutritionUpload";
import { archiveClient, unarchiveClient, blockClient, unblockClient, toggleRebootOnly } from "./actions";
import { DeleteClientButton } from "@/components/app-clients/DeleteClientButton";
import CreateProgramForm from "@/components/app-clients/CreateProgramForm";

type ProgressEntry = {
  id: string; weightKg: unknown; waistCm: unknown;
  chestCm: unknown; hipsCm: unknown; armsCm: unknown; entryDate: Date;
};

type NutritionFile = {
  id: string; name: string; fileUrl: string; fileName: string;
  fileSize: number | null; uploadedAt: Date;
};

type Program = {
  id: string; name: string; isActive: boolean;
  weeksDuration: number | null; _count: { sessions: number };
};

type ClientDetail = {
  id: string; email: string; firstName: string; lastName: string;
  isActive: boolean; isBlocked: boolean; isRebootOnly: boolean;
  objectives: string | null;
  progressEntries: ProgressEntry[];
  nutritionFiles: NutritionFile[];
};

type ProgramTemplate = {
  id: string; name: string; description: string | null;
  category: string; weeks_duration: number; session_count: bigint;
};

type RebootCompletion = {
  session_id: string;
  muscle_group: string;
  session_name: string;
  completed_at: Date;
};

type RebootCheckin = {
  session_id: string;
  energy: number;
  difficulty: string;
  feeling: string | null;
};

type RebootModule = {
  task_key: string;
  completed_at: Date;
};

const REBOOT_MUSCLE_LABELS: Record<string, string> = {
  pecs: "💪 Pectoraux",
  dos: "🏋️ Dos & Biceps",
  jambes: "🦵 Jambes",
};

const REBOOT_ENERGY: Record<number, string> = { 1: "😴", 2: "😪", 3: "🙂", 4: "😊", 5: "⚡" };

const REBOOT_DIFFICULTY: Record<string, string> = {
  easy: "Trop facile",
  good: "Parfait",
  hard: "Très dur",
};

const REBOOT_MODULE_LABELS: Record<string, string> = {
  regularite: "🔥 Régularité",
  hydratation: "💧 Hydratation",
  sommeil: "😴 Sommeil",
  nutrition: "🥗 Nutrition",
};

function fmt(val: unknown, unit: string): string {
  const n = Number(val);
  if (isNaN(n) || val === null || val === undefined) return "—";
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} ${unit}`;
}

function formatShort(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(date));
}

export default async function AppClientDetailPage({ params }: { params: { id: string } }) {
  let client: ClientDetail | null = null;
  let programs: Program[] = [];
  let programTemplates: ProgramTemplate[] = [];

  // Tier 1: full query with relations
  try {
    const [c, p] = await Promise.all([
      db.appClient.findUnique({
        where: { id: params.id },
        include: {
          progressEntries: { orderBy: { entryDate: "desc" }, take: 30 },
          nutritionFiles: { where: { isActive: true }, orderBy: { uploadedAt: "desc" } },
        },
      }),
      db.trainingProgram.findMany({
        where: { clientId: params.id },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        include: { _count: { select: { sessions: true } } },
      }),
    ]);
    client = c as ClientDetail | null;
    programs = p as Program[];
  } catch (err) {
    console.error("[client-detail:full]", err);
  }

  // Tier 2: basic query without relations (avoids FK join issues)
  if (!client) {
    try {
      const c = await db.appClient.findUnique({ where: { id: params.id } });
      if (c) {
        client = { ...c, progressEntries: [], nutritionFiles: [] } as unknown as ClientDetail;
      }
    } catch (err) {
      console.error("[client-detail:fallback]", err);
    }
  }

  if (!client) notFound();

  programTemplates = await db.$queryRaw<ProgramTemplate[]>`
    SELECT pt.id::text, pt.name, pt.description, pt.category, pt.weeks_duration,
      COUNT(st.id) AS session_count
    FROM program_templates pt
    LEFT JOIN session_templates st ON st.program_template_id = pt.id
    GROUP BY pt.id
    ORDER BY pt.category, pt.name
  `.catch(() => [] as ProgramTemplate[]);

  const serializedTemplates = programTemplates.map((t) => ({
    ...t,
    session_count: Number(t.session_count),
  }));

  // Reboot activity
  let rebootActivity = {
    completions: [] as RebootCompletion[],
    checkins: [] as RebootCheckin[],
    modules: [] as RebootModule[],
  };
  try {
    const [completions, checkins, modules] = await Promise.all([
      db.$queryRaw<RebootCompletion[]>`
        SELECT rc.session_id::text, rs.muscle_group, rs.name AS session_name, rc.completed_at
        FROM reboot_completions rc
        JOIN reboot_sessions rs ON rc.session_id = rs.id
        WHERE rc.client_id = ${params.id}::uuid
        ORDER BY rc.completed_at ASC
      `.catch(() => [] as RebootCompletion[]),
      db.$queryRaw<RebootCheckin[]>`
        SELECT session_id::text, energy, difficulty, feeling
        FROM reboot_session_checkins
        WHERE client_id = ${params.id}
        ORDER BY submitted_at ASC
      `.catch(() => [] as RebootCheckin[]),
      db.$queryRaw<RebootModule[]>`
        SELECT task_key, completed_at
        FROM reboot_task_completions
        WHERE client_id = ${params.id}
        ORDER BY completed_at ASC
      `.catch(() => [] as RebootModule[]),
    ]);
    rebootActivity = { completions, checkins, modules };
  } catch {}

  const latest = client.progressEntries[0] ?? null;
  const prevWeight = client.progressEntries.find((e, i) => i > 0 && e.weightKg !== null);
  const weightDelta = latest?.weightKg && prevWeight?.weightKg
    ? Number(latest.weightKg) - Number(prevWeight.weightKg) : null;

  const serializedFiles = client.nutritionFiles.map((f) => ({
    id: f.id, name: f.name, fileUrl: f.fileUrl, fileName: f.fileName,
    fileSize: f.fileSize, uploadedAt: f.uploadedAt.toISOString(),
  }));

  const archiveAction = archiveClient.bind(null, client.id);
  const unarchiveAction = unarchiveClient.bind(null, client.id);
  const blockAction = blockClient.bind(null, client.id);
  const unblockAction = unblockClient.bind(null, client.id);
  const toggleRebootOnlyAction = toggleRebootOnly.bind(null, client.id, client.isRebootOnly);

  const rebootTotal = rebootActivity.completions.length + rebootActivity.modules.length;
  const hasRebootActivity = rebootTotal > 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <Link href="/app-clients" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← App Clients</Link>
        <div className="flex items-start justify-between mt-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
              <span className="text-base font-black text-brand-400">{client.firstName[0]}{client.lastName[0]}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{client.firstName} {client.lastName}</h1>
              <p className="text-gray-400 text-sm">{client.email}</p>
              <div className="flex gap-2 mt-2">
                {client.isRebootOnly && <span className="px-3 py-1 bg-brand-500/10 text-brand-400 text-xs font-semibold rounded-full">Reboot only</span>}
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${client.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {client.isActive ? "Actif" : "Inactif"}
                </span>
                {client.isBlocked && <span className="px-3 py-1 bg-orange-500/10 text-orange-400 text-xs font-semibold rounded-full">Bloqué</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            <form action={toggleRebootOnlyAction}>
              <button
                type="submit"
                className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors ${
                  client.isRebootOnly
                    ? "bg-brand-500 hover:bg-brand-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {client.isRebootOnly ? "⚡ Reboot only" : "Passer en Reboot"}
              </button>
            </form>
            <form action={client.isActive ? archiveAction : unarchiveAction}>
              <button type="submit" className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors ${client.isActive ? "bg-gray-700 hover:bg-gray-600" : "bg-green-700 hover:bg-green-600"}`}>
                {client.isActive ? "Archiver" : "Réactiver"}
              </button>
            </form>
            <form action={client.isBlocked ? unblockAction : blockAction}>
              <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors">
                {client.isBlocked ? "Débloquer" : "Bloquer l'accès"}
              </button>
            </form>
            <DeleteClientButton clientId={client.id} clientName={`${client.firstName} ${client.lastName}`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Poids actuel</p>
          <p className="text-2xl font-black text-white mt-1">{fmt(latest?.weightKg, "kg")}</p>
          {weightDelta !== null && (
            <p className={`text-xs font-semibold mt-1 ${weightDelta < 0 ? "text-green-400" : "text-red-400"}`}>
              {weightDelta > 0 ? "+" : ""}{weightDelta.toFixed(1)} kg
            </p>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Tour de taille</p>
          <p className="text-2xl font-black text-white mt-1">{fmt(latest?.waistCm, "cm")}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Mesures</p>
          <p className="text-2xl font-black text-white mt-1">{client.progressEntries.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Dernière entrée</p>
          <p className="text-sm font-bold text-white mt-1">{latest ? formatShort(latest.entryDate) : "—"}</p>
        </div>
      </div>

      {client.objectives && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Objectifs</p>
          <p className="text-gray-300 text-sm">{client.objectives}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Historique des mesures</h2>
          {client.progressEntries.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">Aucune mesure enregistrée par le client</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {["Date", "Poids", "Taille", "Poitrine", "Hanches", "Bras"].map((h) => (
                      <th key={h} className="text-left text-xs text-gray-500 uppercase tracking-wider pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {client.progressEntries.map((entry, i) => {
                    const prev = client!.progressEntries[i + 1];
                    const delta = entry.weightKg && prev?.weightKg
                      ? Number(entry.weightKg) - Number(prev.weightKg) : null;
                    return (
                      <tr key={entry.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 pr-4 text-gray-300 whitespace-nowrap">{formatShort(entry.entryDate)}</td>
                        <td className="py-3 pr-4 font-semibold text-white">
                          {fmt(entry.weightKg, "kg")}
                          {delta !== null && (
                            <span className={`ml-1.5 text-xs ${delta < 0 ? "text-green-400" : "text-red-400"}`}>
                              ({delta > 0 ? "+" : ""}{delta.toFixed(1)})
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-gray-400">{fmt(entry.waistCm, "cm")}</td>
                        <td className="py-3 pr-4 text-gray-400">{fmt(entry.chestCm, "cm")}</td>
                        <td className="py-3 pr-4 text-gray-400">{fmt(entry.hipsCm, "cm")}</td>
                        <td className="py-3 text-gray-400">{fmt(entry.armsCm, "cm")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Plans nutrition</h2>
          <NutritionUpload clientId={client.id} files={serializedFiles} />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4">Programmes d&apos;entraînement</h2>
        {programs.length > 0 && (
          <div className="space-y-2 mb-5">
            {programs.map((prog) => (
              <Link key={prog.id} href={`/app-clients/${client!.id}/programmes/${prog.id}`}
                className="flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors group">
                <div>
                  <p className="text-sm font-medium text-white">{prog.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {prog._count.sessions} séance{prog._count.sessions !== 1 ? "s" : ""}
                    {prog.weeksDuration ? ` · ${prog.weeksDuration} semaines` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${prog.isActive ? "bg-green-500/10 text-green-400" : "bg-gray-700/50 text-gray-500"}`}>
                    {prog.isActive ? "Actif" : "Inactif"}
                  </span>
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
        <details className="group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 border-dashed rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau programme
            </div>
          </summary>
          <div className="mt-3 p-4 bg-gray-800/30 rounded-lg border border-gray-800">
            <CreateProgramForm clientId={client.id} programTemplates={serializedTemplates} />
          </div>
        </details>
      </div>

      {/* Reboot 40 — Activité */}
      {(client.isRebootOnly || hasRebootActivity) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <span className="text-brand-400">⚡</span>
              Reboot 40
            </h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              rebootTotal >= 7
                ? "bg-brand-500/20 text-brand-400"
                : "bg-gray-800 text-gray-400"
            }`}>
              {rebootTotal}/7 étapes
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${Math.round((rebootTotal / 7) * 100)}%` }}
              />
            </div>
          </div>

          {!hasRebootActivity ? (
            <p className="text-gray-600 text-sm text-center py-4">Aucune activité pour l&apos;instant</p>
          ) : (
            <div className="space-y-5">
              {/* Séances */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2.5">
                  Séances — {rebootActivity.completions.length}/3 complétées
                </p>
                <div className="space-y-2">
                  {(["pecs", "dos", "jambes"] as const).map((muscle) => {
                    const done = rebootActivity.completions.find((c) => c.muscle_group === muscle);
                    const checkin = done
                      ? rebootActivity.checkins.find((ch) => ch.session_id === done.session_id)
                      : null;
                    return (
                      <div
                        key={muscle}
                        className={`rounded-lg p-3 ${
                          done
                            ? "bg-green-500/5 border border-green-500/15"
                            : "bg-gray-800/40 border border-gray-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${done ? "text-green-400" : "text-gray-600"}`}>
                              {done ? "✓" : "○"}
                            </span>
                            <span className={`text-sm font-medium ${done ? "text-white" : "text-gray-600"}`}>
                              {REBOOT_MUSCLE_LABELS[muscle]}
                            </span>
                          </div>
                          {done && (
                            <span className="text-xs text-gray-500">{formatShort(done.completed_at)}</span>
                          )}
                        </div>
                        {checkin && (
                          <div className="mt-1.5 ml-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span>
                              {REBOOT_ENERGY[Number(checkin.energy)] ?? "—"}&nbsp;
                              {REBOOT_DIFFICULTY[checkin.difficulty] ?? checkin.difficulty}
                            </span>
                            {checkin.feeling && (
                              <span className="italic text-gray-600">&ldquo;{checkin.feeling}&rdquo;</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modules */}
              {rebootActivity.modules.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2.5">
                    Modules lifestyle — {rebootActivity.modules.length}/4 validés
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["regularite", "hydratation", "sommeil", "nutrition"] as const).map((key) => {
                      const done = rebootActivity.modules.find((m) => m.task_key === key);
                      return (
                        <div
                          key={key}
                          className={`rounded-lg px-3 py-2.5 flex items-center justify-between ${
                            done
                              ? "bg-green-500/5 border border-green-500/15"
                              : "bg-gray-800/40 border border-gray-800"
                          }`}
                        >
                          <span className={`text-sm ${done ? "text-white" : "text-gray-600"}`}>
                            {REBOOT_MODULE_LABELS[key]}
                          </span>
                          {done && (
                            <span className="text-xs text-gray-500 ml-1">{formatShort(done.completed_at)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
