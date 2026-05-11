export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import Link from "next/link";

export default async function AppClientsPage() {
  let count = 0;
  let error = "";
  try {
    count = await db.appClient.count();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-white">App D5 — Clients</h1>
      <p className="text-gray-400">{count} client(s) en base</p>
      {error && <p className="text-red-400 text-sm">Erreur DB : {error}</p>}
      <Link href="/app-clients/nouveau" className="inline-block px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-semibold">
        + Nouveau client
      </Link>
    </div>
  );
}
