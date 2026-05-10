"use server";

import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export type CreateClientState = { error: string } | null;

export async function createAppClient(
  _prev: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  const firstName = (formData.get("firstName") as string).trim();
  const lastName = (formData.get("lastName") as string).trim();
  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const isRebootOnly = formData.get("isRebootOnly") === "on";
  const objectives = (formData.get("objectives") as string)?.trim() || null;

  if (!firstName || !lastName || !email || !password) {
    return { error: "Veuillez remplir tous les champs obligatoires." };
  }

  let clientId: string;

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const client = await db.appClient.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        phone,
        isRebootOnly,
        objectives,
      },
    });

    clientId = client.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique") || msg.includes("unique") || msg.includes("P2002")) {
      return { error: "Cet email est déjà utilisé par un autre client." };
    }
    console.error("[createAppClient]", err);
    return { error: "Erreur lors de la création. Réessayez dans un instant." };
  }

  // Send welcome email — non-blocking
  sendWelcomeEmail({ firstName, lastName, email, password }).catch((err) =>
    console.error("[welcome-email]", err)
  );

  redirect(`/app-clients/${clientId}`);
}
