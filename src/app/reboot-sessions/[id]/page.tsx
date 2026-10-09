export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EditeurSeance } from "@/components/reboot/EditeurSeance";

const ONGLETS: Record<string, string> = {
  salle: "En salle",
  maison: "À la maison",
  mobilite: "Échauffements",
  hiit: "HIIT",
};

export default async function RebootSessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await db.rebootSession.findUnique({
    where: { id: params.id },
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
  });

  if (!session) return notFound();

  return (
    <div className="max-w-3xl space-y-5 p-6">
      <Link
        href="/reboot-sessions"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
      >
        ← Toutes les séances
      </Link>

      <div className="flex items-center gap-2">
        <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-semibold uppercase text-brand-400">
          {ONGLETS[session.tab] ?? session.tab}
        </span>
        {session.isBonus && (
          <span className="text-xs text-gray-500">
            Hors des 3 séances du challenge
          </span>
        )}
      </div>

      <EditeurSeance
        sessionId={session.id}
        nom={session.name}
        description={session.description}
        dureeMinutes={session.durationMinutes}
        active={session.isActive}
        modifiee={session.manuallyEdited}
        exercices={session.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          restSeconds: e.restSeconds,
          notes: e.notes,
          vimeoVideoId: e.vimeoVideoId,
        }))}
      />
    </div>
  );
}
