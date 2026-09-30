import { db } from "@/lib/db";
import SettingsForm from "./SettingsForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Paramètres" };

export default async function ParametresPage() {
  let rebootMessage = "";
  let introVideo = "";
  try {
    await db.$executeRaw`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT now())`.catch(() => {});
    const rows = await db.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings
      WHERE key IN ('reboot_welcome_message', 'reboot_intro_video_id')
    `;
    rebootMessage = rows.find((r) => r.key === "reboot_welcome_message")?.value ?? "";
    introVideo = rows.find((r) => r.key === "reboot_intro_video_id")?.value ?? "";
  } catch {}

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Dashboard</Link>
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-gray-400 text-sm mt-1">Configuration de l&apos;app cliente D5</p>
      </div>
      <SettingsForm rebootMessage={rebootMessage} introVideo={introVideo} />
    </div>
  );
}
