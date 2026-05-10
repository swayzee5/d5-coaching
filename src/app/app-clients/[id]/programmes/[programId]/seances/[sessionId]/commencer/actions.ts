"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type SetResultInput = {
  completed: boolean;
  weightActual: string;
  repsActual: string;
};

export async function saveCompletion({
  sessionId,
  clientId,
  programId,
  results,
  initiatedBy,
}: {
  sessionId: string;
  clientId: string;
  programId: string;
  results: Record<string, SetResultInput[]>;
  initiatedBy: "coach" | "client";
}) {
  await db.sessionCompletion.create({
    data: {
      sessionId,
      clientId,
      initiatedBy,
      setResults: {
        create: Object.entries(results).flatMap(([exerciseId, sets]) =>
          sets.map((set, i) => ({
            exerciseId,
            setNumber: i + 1,
            weightActual: set.weightActual.trim() || null,
            repsActual: set.repsActual.trim() || null,
            completed: set.completed,
          }))
        ),
      },
    },
  });

  revalidatePath(`/app-clients/${clientId}/programmes/${programId}`);
  revalidatePath(`/activites`);
  redirect(
    `/app-clients/${clientId}/programmes/${programId}/seances/${sessionId}/resultats`
  );
}
