const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID ?? "";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY ?? "";

/**
 * Envoie une notification push à un client.
 *
 * Le CRM appelle directement l'API OneSignal plutôt que de passer par l'app
 * client : cela évite d'inventer un endpoint interne et un secret partagé entre
 * les deux déploiements.
 *
 * Le ciblage se fait par `external_id`, l'identifiant que l'app client associe
 * à l'appareil via `OneSignal.login(clientId)`. On vise donc une personne, et
 * tous ses appareils, plutôt qu'un appareil précis.
 *
 * Ne lève jamais : une notification perdue ne doit pas faire échouer l'envoi du
 * message, qui lui est bien enregistré en base.
 */
export async function sendPushToClient(
  clientId: string,
  title: string,
  message: string
): Promise<void> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.warn("[push] ONESIGNAL_APP_ID ou ONESIGNAL_REST_API_KEY absente — notification non envoyée");
    return;
  }

  try {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: [clientId] },
        target_channel: "push",
        headings: { fr: title, en: title },
        contents: { fr: message, en: message },
      }),
    });

    if (!res.ok) {
      console.error("[push] OneSignal a refusé l'envoi", res.status, await res.text());
      return;
    }

    // OneSignal répond 200 avec "errors" quand personne n'est ciblé : sans ce
    // contrôle, un client jamais abonné passerait pour un envoi réussi.
    const data = (await res.json()) as { id?: string; recipients?: number; errors?: unknown };
    if (data.errors) {
      console.error("[push] OneSignal signale une erreur", data.errors);
    } else if (data.recipients === 0) {
      console.warn("[push] aucun appareil abonné pour ce client", clientId);
    } else {
      // Sans trace du cas nominal, les logs Vercel ne permettent pas de
      // distinguer « envoyé mais non reçu » de « jamais envoyé » — les deux
      // ressemblent à un silence.
      console.log("[push] notification envoyée", {
        clientId,
        recipients: data.recipients,
        id: data.id,
      });
    }
  } catch (err) {
    console.error("[push] envoi impossible", err);
  }
}

/** Coupe un message pour tenir dans une notification sans être tronqué par iOS. */
export function previewForNotification(content: string, max = 120): string {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}
