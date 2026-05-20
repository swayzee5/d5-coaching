import { db } from "@/lib/db";
import { CheckCircle2, MessageCircle, BookOpen, Dumbbell } from "lucide-react";

const MODULE_LABELS: Record<string, string> = {
  regularite:  "La régularité avant l'intensité",
  hydratation: "L'hydratation, ton moteur",
  sommeil:     "Le sommeil, ton meilleur allié",
  nutrition:   "Protéines à chaque repas",
};

function fmtDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

export async function RebootActivity({ clientId, isRebootOnly }: { clientId: string; isRebootOnly: boolean }) {
  type ModuleRow = { task_key: string };
  type WaRow = { cnt: bigint };

  let seances: { sessionId: string; completedAt: Date; name: string }[] = [];
  let modules: string[] = [];
  let waCount = 0;

  try {
    const completions = await db.rebootCompletion.findMany({
      where: { clientId },
      include: { session: { select: { name: true, muscleGroup: true } } },
      orderBy: { completedAt: "asc" },
    });
    seances = completions.map((c) => ({
      sessionId: c.sessionId,
      completedAt: c.completedAt,
      name: c.session.name,
    }));
  } catch {}

  try {
    const rows = await db.$queryRaw<ModuleRow[]>`
      SELECT task_key FROM reboot_task_completions WHERE client_id = ${clientId}
    `;
    modules = rows.map((r) => r.task_key);
  } catch {}

  try {
    const rows = await db.$queryRaw<WaRow[]>`
      SELECT COUNT(*) AS cnt FROM reboot_whatsapp_completions WHERE client_id = ${clientId}
    `;
    waCount = Number(rows[0]?.cnt ?? 0);
  } catch {}

  if (!isRebootOnly && seances.length === 0 && modules.length === 0 && waCount === 0) return null;

  const seancesProgress = Math.min(seances.length, 3);
  const waProgress = Math.min(waCount, 3);
  const modulesProgress = Math.min(modules.length, 4);
  const total = seancesProgress + waProgress + modulesProgress;
  const pct = Math.round((total / 10) * 100);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white">Reboot 40</h2>
        <span className="text-xs font-semibold text-brand-400">{total}/10 tâches &bull; {pct}%</span>
      </div>

      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-6 pt-1">
        {/* Séances */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 mb-3">
            <Dumbbell size={12} className="text-gray-500" />
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Séances {seancesProgress}/3
            </p>
          </div>
          {seances.length === 0 ? (
            <p className="text-xs text-gray-600">Aucune séance</p>
          ) : (
            seances.map((s) => (
              <div key={s.sessionId} className="flex items-start gap-2">
                <CheckCircle2 size={12} className="text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-white font-medium leading-tight">{s.name}</p>
                  <p className="text-xs text-gray-500">{fmtDate(s.completedAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* WhatsApp */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 mb-3">
            <MessageCircle size={12} className="text-gray-500" />
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              WhatsApp {waProgress}/3
            </p>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex items-center gap-2 ${i <= waCount ? "" : "opacity-30"}`}>
              {i <= waCount ? (
                <CheckCircle2 size={12} className="text-green-400 shrink-0" />
              ) : (
                <div className="w-3 h-3 rounded-full border border-gray-600 shrink-0" />
              )}
              <p className="text-xs text-white">Message {i}/3</p>
            </div>
          ))}
        </div>

        {/* Modules */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 mb-3">
            <BookOpen size={12} className="text-gray-500" />
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Modules {modulesProgress}/4
            </p>
          </div>
          {Object.keys(MODULE_LABELS).map((key) => {
            const done = modules.includes(key);
            return (
              <div key={key} className={`flex items-center gap-2 ${done ? "" : "opacity-30"}`}>
                {done ? (
                  <CheckCircle2 size={12} className="text-green-400 shrink-0" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-gray-600 shrink-0" />
                )}
                <p className="text-xs text-white truncate">{MODULE_LABELS[key]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
