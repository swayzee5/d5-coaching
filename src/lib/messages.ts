import { db } from "@/lib/db";
import { sendPushToClient, previewForNotification } from "@/lib/push";

// La table messages est créée par celle des deux apps qui écrit en premier, et
// les deux ne s'accordent pas sur le type de client_id :
//   app client -> UUID     (app/(dashboard)/messagerie/actions.ts)
//   CRM        -> TEXT
// Le CREATE TABLE IF NOT EXISTS du second est alors sans effet, et son INSERT
// échoue avec 42804 « column "client_id" is of type uuid but expression is of
// type text ». On lit donc le type réel et on adapte le paramètre.
let cachedIsUuid: boolean | null = null;

async function clientIdIsUuid(): Promise<boolean> {
  if (cachedIsUuid !== null) return cachedIsUuid;
  const rows = await db.$queryRaw<{ data_type: string }[]>`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'client_id'
    LIMIT 1
  `.catch(() => [] as { data_type: string }[]);
  // On ne met en cache que si la table existe : sinon on retesterait toujours
  // le mauvais type après sa création.
  if (rows.length === 0) return false;
  cachedIsUuid = rows[0].data_type === "uuid";
  return cachedIsUuid;
}

export async function ensureMessagesTable(): Promise<void> {
  // Créée en UUID pour rester alignée avec l'app client, qui est la seule à en
  // créer une aujourd'hui en pratique.
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL,
      sender_role VARCHAR(10) NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `.catch(() => {});
}

/** Envoie un message du coach au client. Renvoie l'erreur Postgres en clair. */
export async function sendCoachMessage(
  clientId: string,
  content: string
): Promise<{ error?: string }> {
  await ensureMessagesTable();
  const asUuid = await clientIdIsUuid();

  try {
    if (asUuid) {
      await db.$executeRaw`
        INSERT INTO messages (client_id, sender_role, content, is_read)
        VALUES (${clientId}::uuid, 'coach', ${content}, false)
      `;
    } else {
      await db.$executeRaw`
        INSERT INTO messages (client_id, sender_role, content, is_read)
        VALUES (${clientId}, 'coach', ${content}, false)
      `;
    }
  } catch (err) {
    console.error("[sendCoachMessage] échec", err);
    const detail = err instanceof Error ? err.message.split("\n")[0] : "";
    return { error: detail ? `Envoi impossible — ${detail}` : "Envoi impossible" };
  }

  // On attend l'envoi, et ce n'est pas un détail de style : cette fonction
  // tourne dans une Server Action sur Vercel, donc dans un environnement
  // serverless. Des que la reponse est renvoyee, l'instance peut etre gelee ou
  // detruite — une promesse laissee en suspens (`void ...`) n'a alors aucune
  // garantie d'aboutir. C'est exactement ce qui se passait : le message etait
  // bien enregistre, la requete vers OneSignal ne partait jamais, et aucun log
  // n'apparaissait puisque le code ne s'executait pas.
  //
  // Le cout est un aller-retour HTTP (~300 ms) avant que le coach reprenne la
  // main. sendPushToClient ne leve jamais, donc l'attendre ne peut pas faire
  // echouer l'envoi du message.
  await sendPushToClient(
    clientId,
    "Message de ton coach",
    previewForNotification(content)
  );

  return {};
}

/** Marque comme lus les messages que le client avait envoyés. */
export async function markClientMessagesRead(clientId: string): Promise<void> {
  // On caste la colonne plutôt que le paramètre : la comparaison fonctionne
  // que client_id soit uuid ou text.
  await db.$executeRaw`
    UPDATE messages SET is_read = true
    WHERE client_id::text = ${clientId} AND sender_role = 'client' AND is_read = false
  `.catch(() => {});
}
