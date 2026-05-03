export type ProspectStatus =
  | "LEAD"
  | "ONBOARDING"
  | "CHALLENGE"
  | "CALL_SCHEDULED"
  | "CLIENT"
  | "DECLINED"
  | "GHOST";

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export function statusLabel(status: ProspectStatus): string {
  const labels: Record<ProspectStatus, string> = {
    LEAD: "Lead",
    ONBOARDING: "Onboarding",
    CHALLENGE: "Challenge",
    CALL_SCHEDULED: "Appel planifié",
    CLIENT: "Client",
    DECLINED: "Refusé",
    GHOST: "Ghost",
  };
  return labels[status];
}

export function statusColor(status: ProspectStatus): string {
  const colors: Record<ProspectStatus, string> = {
    LEAD: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    ONBOARDING: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    CHALLENGE: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    CALL_SCHEDULED: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    CLIENT: "bg-green-500/20 text-green-300 border-green-500/30",
    DECLINED: "bg-red-500/20 text-red-300 border-red-500/30",
    GHOST: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return colors[status];
}

/**
 * Normalise un numéro de téléphone au format E.164 (+XXXXXXXXXXX).
 * Gère les cas français : 06... → +336..., 07... → +337...
 * Supprime espaces, tirets, points.
 */
export function normalizePhone(raw: string, defaultCountryCode = "33"): string {
  let n = raw.replace(/[\s\-.() ]/g, "");
  // Déjà en E.164
  if (n.startsWith("+")) return n;
  // Préfixe 00XX → +XX
  if (n.startsWith("00")) return `+${n.slice(2)}`;
  // Numéro local français 0X → +33X
  if (n.startsWith("0")) return `+${defaultCountryCode}${n.slice(1)}`;
  // Pas de préfixe reconnu → on préfixe naïvement
  return `+${defaultCountryCode}${n}`;
}

export function parseAvailableDays(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return raw.split(",").map((d) => d.trim());
  }
}

export function challengeProgress(participant: {
  day1Done: boolean;
  day2Done: boolean;
  day3Done: boolean;
  day4Done: boolean;
  day5Done: boolean;
  day6Done: boolean;
  day7Done: boolean;
}): number {
  const days = [
    participant.day1Done,
    participant.day2Done,
    participant.day3Done,
    participant.day4Done,
    participant.day5Done,
    participant.day6Done,
    participant.day7Done,
  ];
  return days.filter(Boolean).length;
}
