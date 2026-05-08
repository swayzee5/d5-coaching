import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "D5 Coaching <noreply@d5coaching-distance.com>";
const APP_URL = "https://app.d5coaching-distance.com";

export async function sendWelcomeEmail({
  firstName,
  email,
  password,
}: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Bienvenue chez D5 Coaching, ${firstName} !`,
    html: `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;border:1px solid #222;overflow:hidden;">
  <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #1a1a1a;">
    <p style="margin:0;font-size:22px;font-weight:900;color:#ff6a00;">D5 COACHING</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#fff;">Bienvenue, ${firstName} !</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#888;line-height:1.6;">Ton espace personnel est pr&ecirc;t. Voici tes identifiants&nbsp;:</p>
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#555;">Email</p>
      <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#fff;">${email}</p>
      <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#555;">Mot de passe</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#fff;font-family:monospace;">${password}</p>
    </div>
    <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#ff6a00;">
      <a href="${APP_URL}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;">Acc&eacute;der &agrave; mon espace &rarr;</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:20px 40px;border-top:1px solid #1a1a1a;">
    <p style="margin:0;font-size:12px;color:#333;">&copy; ${new Date().getFullYear()} D5 Coaching</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
  });
}

export async function sendProgramCreatedEmail({
  firstName,
  email,
  programName,
}: {
  firstName: string;
  email: string;
  programName: string;
}) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Nouveau programme disponible : ${programName}`,
    html: `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;border:1px solid #222;overflow:hidden;">
  <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #1a1a1a;">
    <p style="margin:0;font-size:22px;font-weight:900;color:#ff6a00;">D5 COACHING</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#fff;">💪 Nouveau programme !</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#888;line-height:1.6;">Bonjour ${firstName}, ton coach vient de te cr&eacute;er un nouveau programme d&apos;entra&icirc;nement :</p>
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0;font-size:18px;font-weight:700;color:#ff6a00;">${programName}</p>
    </div>
    <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#ff6a00;">
      <a href="${APP_URL}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;">Voir mon programme &rarr;</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:20px 40px;border-top:1px solid #1a1a1a;">
    <p style="margin:0;font-size:12px;color:#333;">&copy; ${new Date().getFullYear()} D5 Coaching</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
  });
}

export async function sendMeasurementsReminderEmail({
  firstName,
  email,
}: {
  firstName: string;
  email: string;
}) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "N’oublie pas de saisir tes mesures 📊",
    html: `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;border:1px solid #222;overflow:hidden;">
  <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #1a1a1a;">
    <p style="margin:0;font-size:22px;font-weight:900;color:#ff6a00;">D5 COACHING</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#fff;">📊 Tes mesures de la semaine</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#888;line-height:1.6;">Bonjour ${firstName},<br/><br/>Cela fait 3 semaines que tu n&apos;as pas enregistr&eacute; tes mesures. Prends 2 minutes pour mettre &agrave; jour ton suivi &mdash; c&apos;est la meilleure fa&ccedil;on de voir ta progression !</p>
    <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#ff6a00;">
      <a href="${APP_URL}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;">Saisir mes mesures &rarr;</a>
    </td></tr></table>
    <p style="margin:24px 0 0;font-size:12px;color:#444;">Tu re&ccedil;ois ce rappel toutes les 3 semaines si aucune mesure n&apos;a &eacute;t&eacute; saisie.</p>
  </td></tr>
  <tr><td style="padding:20px 40px;border-top:1px solid #1a1a1a;">
    <p style="margin:0;font-size:12px;color:#333;">&copy; ${new Date().getFullYear()} D5 Coaching</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
  });
}
