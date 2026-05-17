import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = "https://app.d5coaching-distance.com";

export async function sendWelcomeEmail({
  firstName,
  lastName,
  email,
  password,
}: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  await resend.emails.send({
    from: "D5 Coaching <noreply@d5coaching-distance.com>",
    to: email,
    subject: `Bienvenue chez D5 Coaching, ${firstName} !`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenue chez D5 Coaching</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;border:1px solid #222222;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #1a1a1a;">
              <p style="margin:0;font-size:22px;font-weight:900;color:#ff6a00;letter-spacing:-0.5px;">D5 COACHING</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#ffffff;">Bienvenue, ${firstName}&nbsp;!</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#888888;line-height:1.6;">
                Ton espace personnel D5 Coaching est pr&ecirc;t. Tu peux d&egrave;s maintenant te connecter pour suivre tes progressions, acc&eacute;der &agrave; tes plans nutrition et tes programmes d&rsquo;entra&icirc;nement.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#555555;font-weight:600;">Tes identifiants de connexion</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="font-size:13px;color:#666666;">Email</span><br />
                          <span style="font-size:15px;font-weight:600;color:#ffffff;">${email}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0 0;border-top:1px solid #2a2a2a;">
                          <span style="font-size:13px;color:#666666;">Mot de passe</span><br />
                          <span style="font-size:15px;font-weight:600;color:#ffffff;font-family:monospace;">${password}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background-color:#ff6a00;">
                    <a href="${APP_URL}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Acc&eacute;der &agrave; mon espace &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:13px;color:#444444;">Tu peux changer ton mot de passe apr&egrave;s ta premi&egrave;re connexion dans les param&egrave;tres de ton profil.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1a1a1a;">
              <p style="margin:0;font-size:12px;color:#333333;">&copy; ${new Date().getFullYear()} D5 Coaching &mdash; <a href="${APP_URL}" style="color:#ff6a00;text-decoration:none;">${APP_URL.replace("https://", "")}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
}

export async function sendProgramAssignedEmail({
  firstName,
  email,
  programName,
  startDate,
  sessionCount,
  weeksDuration,
}: {
  firstName: string;
  email: string;
  programName: string;
  startDate: string | null;
  sessionCount: number;
  weeksDuration: number | null;
}) {
  const startLabel = startDate
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(startDate))
    : "dès maintenant";

  await resend.emails.send({
    from: "D5 Coaching <noreply@d5coaching-distance.com>",
    to: email,
    subject: `💪 Ton programme "${programName}" est prêt !`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;border:1px solid #222222;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #1a1a1a;">
              <p style="margin:0;font-size:22px;font-weight:900;color:#ff6a00;letter-spacing:-0.5px;">D5 COACHING</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;">Ton programme est prêt, ${firstName}&nbsp;!</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#888888;line-height:1.6;">
                Daye a constitué ton programme d&rsquo;entraînement personnalisé. Il est disponible immédiatement dans ton espace D5.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 14px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#555555;font-weight:600;">Détails du programme</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid #2a2a2a;">
                          <span style="font-size:13px;color:#666666;">Programme</span><br />
                          <span style="font-size:16px;font-weight:700;color:#ff6a00;">${programName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;">
                          <span style="font-size:13px;color:#666666;">Début</span><br />
                          <span style="font-size:15px;font-weight:600;color:#ffffff;">${startLabel}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0 0;">
                          <span style="font-size:13px;color:#666666;">Séances</span><br />
                          <span style="font-size:15px;font-weight:600;color:#ffffff;">${sessionCount} séance${sessionCount > 1 ? "s" : ""}${weeksDuration ? ` &mdash; ${weeksDuration} semaines` : ""}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background-color:#ff6a00;">
                    <a href="${APP_URL}/programme" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Voir mon programme &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1a1a1a;">
              <p style="margin:0;font-size:12px;color:#333333;">&copy; ${new Date().getFullYear()} D5 Coaching &mdash; <a href="${APP_URL}" style="color:#ff6a00;text-decoration:none;">${APP_URL.replace("https://", "")}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
}
