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

    // Check if email already exists (active or inactive)
    const existing = await db.appClient.findUnique({ where: { email } });

    if (existing) {
      if (existing.isActive) {
        return { error: "Cet email est déjà utilisé par un client actif." };
      }
      // Reactivate the soft-deleted account with new data
      const updated = await db.appClient.update({
        where: { email },
        data: {
          firstName,
          lastName,
          passwordHash,
          phone,
          isRebootOnly,
          objectives,
          isActive: true,
          isBlocked: false,
        },
      });
      clientId = updated.id;
    } else {
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
    }
  } catch (err) {
    console.error("[createAppClient]", err);
    return { error: "Erreur lors de la création. Réessayez dans un instant." };
  }

  // Send welcome email — non-blocking
  sendWelcomeEmail({ firstName, lastName, email, password }).catch((err) =>
    console.error("[welcome-email]", err)
  );

  redirect(`/app-clients/${clientId}`);
}
