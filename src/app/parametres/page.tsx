import { db } from "@/lib/db";
import SettingsForm from "./SettingsForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Paramètres" };

export default async function ParametresPage() {
  let rebootMessage = "";
  try {
    await db.$executeRaw`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT now())`.catch(() => {});
    const rows = await db.$queryRaw<{ value: string }[]>`SELECT value FROM app_settings WHERE key = 'reboot_welcome_message'`;
    rebootMessage = rows[0]?.value ?? "";
  } catch {}

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Dashboard</Link>
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-gray-400 text-sm mt-1">Configuration de l&apos;app cliente D5</p>
      </div>
      <SettingsForm rebootMessage={rebootMessage} />
    </div>
  );
}
