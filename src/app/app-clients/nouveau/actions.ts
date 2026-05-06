"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

async function sendWelcomeEmail(params: {
  firstName: string;
  email: string;
  password: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "D5 Coaching <onboarding@resend.dev>",
        to: params.email,
        subject: "Bienvenue sur l’app D5 Coaching ! 💪",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#fff;padding:40px;border-radius:12px;">
            <div style="text-align:center;margin-bottom:32px;">
              <div style="display:inline-block;background:#d4af37;color:#000;font-weight:900;font-size:20px;padding:12px 24px;border-radius:8px;letter-spacing:2px;">D5</div>
              <p style="color:#999;margin-top:8px;font-size:14px;">Coaching Distance</p>
            </div>
            <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;">Bonjour ${params.firstName} 👋</h1>
            <p style="color:#aaa;font-size:15px;line-height:1.6;">Ton coach t&#39;a créé un accès à l&#39;application D5 Coaching. Voici tes identifiants pour te connecter&nbsp;:</p>
            <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:24px;margin:24px 0;">
              <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Email</p>
              <p style="margin:0 0 20px;font-size:16px;color:#fff;font-weight:600;">${params.email}</p>
              <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Mot de passe temporaire</p>
              <p style="margin:0;font-size:22px;color:#d4af37;font-weight:700;letter-spacing:3px;">${params.password}</p>
            </div>
            <p style="color:#aaa;font-size:14px;line-height:1.6;">Connecte-toi et change ton mot de passe depuis ton profil dès ta première connexion.</p>
            <div style="border-top:1px solid #222;margin-top:32px;padding-top:20px;text-align:center;">
              <p style="color:#555;font-size:12px;">D5 Coaching Distance &mdash; Reboot 40+</p>
            </div>
          </div>
        `,
      }),
    });
  } catch {
    // Email failure should not block client creation
  }
}

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

  await sendWelcomeEmail({ firstName, email, password });

  redirect(`/app-clients/${client.id}`);
}
