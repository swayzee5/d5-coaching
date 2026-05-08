"use server";

import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function createAppClient(formData: FormData) {
  const firstName = (formData.get("firstName") as string).trim();
  const lastName = (formData.get("lastName") as string).trim();
  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const isRebootOnly = formData.get("isRebootOnly") === "on";
  const objectives = (formData.get("objectives") as string)?.trim() || null;

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

  // Send welcome email — non-blocking so a Resend failure doesn't prevent account creation
  sendWelcomeEmail({ firstName, lastName, email, password }).catch((err) =>
    console.error("[welcome-email]", err)
  );

  redirect(`/app-clients/${client.id}`);
}
