"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateProgramStatus } from "@/app/app-clients/[id]/programmes/actions";

type Status = "DRAFT" | "SAVED" | "PUBLISHED";

const STEPS: { key: Status; label: string; desc: string }[] = [
  { key: "DRAFT", label: "Brouillon", desc: "Programme en construction" },
  { key: "SAVED", label: "Sauvegardé", desc: "Prêt à être envoyé" },
  { key: "PUBLISHED", label: "Publié", desc: "Visible par le client" },
];

const STATUS_COLORS: Record<Status, { badge: string; dot: string }> = {
  DRAFT: { badge: "text-gray-400 bg-gray-800 border-gray-700", dot: "bg-gray-500" },
  SAVED: { badge: "text-blue-400 bg-blue-500/10 border-blue-500/30", dot: "bg-blue-500" },
  PUBLISHED: { badge: "text-green-400 bg-green-500/10 border-green-500/30", dot: "bg-green-500" },
};

export default function ProgramStatusBar({
  programId,
  clientId,
  status: initialStatus,
}: {
  programId: string;
  clientId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const status = (initialStatus as Status) || "DRAFT";
  const statusIndex = STEPS.findIndex((s) => s.key === status);
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.DRAFT;

  function go(newStatus: Status, confirm?: string) {
    if (confirm && !window.confirm(confirm)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("programId", programId);
      fd.append("clientId", clientId);
      fd.append("status", newStatus);
      await updateProgramStatus(fd);
      router.refresh();
    });
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Statut du programme</h2>
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${colors.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}${status === "PUBLISHED" ? " animate-pulse" : ""}`} />
          {STEPS[statusIndex]?.label}
        </span>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const reached = i <= statusIndex;
          const active = step.key === status;
          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                    active
                      ? `${colors.dot} border-transparent text-white`
                      : reached
                      ? "bg-gray-700 border-gray-600 text-gray-300"
                      : "bg-transparent border-gray-700 text-gray-600"
                  }`}
                >
                  {reached && !active ? "✓" : i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap ${
                    active ? "text-white" : reached ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px mx-2 mb-4 transition-colors ${
                    i < statusIndex ? "bg-gray-600" : "bg-gray-800"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {status === "DRAFT" && (
          <button
            onClick={() => go("SAVED")}
            disabled={isPending}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {isPending ? "Sauvegarde..." : "✓ Sauvegarder le programme"}
          </button>
        )}

        {status === "SAVED" && (
          <>
            <button
              onClick={() => go("DRAFT")}
              disabled={isPending}
              className="py-2.5 px-4 text-sm text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              ← Brouillon
            </button>
            <button
              onClick={() => go("PUBLISHED")}
              disabled={isPending}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-400 disabled:opacity-50 rounded-lg transition-colors"
            >
              {isPending ? "Envoi en cours..." : "🚀 Publier & notifier le client"}
            </button>
          </>
        )}

        {status === "PUBLISHED" && (
          <>
            <button
              onClick={() =>
                go(
                  "DRAFT",
                  "Remettre en brouillon ? Le programme restera visible pour le client jusqu’à ce qu’un nouveau programme soit publié."
                )
              }
              disabled={isPending}
              className="py-2.5 px-4 text-sm text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {isPending ? "..." : "← Brouillon"}
            </button>
            <button
              onClick={() =>
                go("PUBLISHED", "Renvoyer l’email de notification au client ?")
              }
              disabled={isPending}
              className="flex-1 py-2.5 text-sm font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50 rounded-lg transition-colors border border-green-500/20"
            >
              {isPending ? "Envoi..." : "🔔 Renvoyer l’email"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
