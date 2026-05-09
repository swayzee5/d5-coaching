export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { assignToClient } from "../../actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Attribuer un programme — D5 CRM" };

export default async function AttribuerPage({
  params,
}: {
  params: { programId: string };
}) {
  const [program, clients] = await Promise.all([
    db.trainingProgram.findUnique({
      where: { id: params.programId },
      select: { id: true, name: true, isTemplate: true, weeksDuration: true },
    }),
    db.appClient.findMany({
      where: { isActive: true },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);
  if (!program || !program.isTemplate) notFound();

  const action = assignToClient.bind(null, program.id);

  return (
    <div className="p-6 max-w-xl">
      <Link
        href={`/programmes/${program.id}`}
        className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
      >
        ← {program.name}
      </Link>
      <h1 className="text-xl font-bold text-white mt-4 mb-1">Attribuer ce programme</h1>
      <p className="text-gray-500 text-sm mb-6">
        Le programme sera dupliqué pour le client sélectionné. L&apos;original reste intact.
      </p>

      <form action={action} className="space-y-4 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Client *</label>
          <select
            name="clientId"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-brand-500"
          >
            <option value="">Sélectionner un client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} — {c.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Date de début (optionnel)</label>
          <input
            type="date"
            name="startDate"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Attribuer le programme →
        </button>
      </form>
    </div>
  );
}
