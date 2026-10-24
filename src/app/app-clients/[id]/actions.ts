"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function archiveClient(id: string) {
  await db.appClient.update({ where: { id }, data: { isActive: false } });
  revalidatePath(`/app-clients/${id}`);
  revalidatePath("/app-clients");
}

export async function unarchiveClient(id: string) {
  await db.appClient.update({ where: { id }, data: { isActive: true } });
  revalidatePath(`/app-clients/${id}`);
  revalidatePath("/app-clients");
}

export async function blockClient(id: string) {
  await db.appClient.update({ where: { id }, data: { isBlocked: true } });
  revalidatePath(`/app-clients/${id}`);
  revalidatePath("/app-clients");
}

export async function unblockClient(id: string) {
  await db.appClient.update({ where: { id }, data: { isBlocked: false } });
  revalidatePath(`/app-clients/${id}`);
  revalidatePath("/app-clients");
}

export async function toggleRebootOnly(id: string, current: boolean) {
  await db.appClient.update({ where: { id }, data: { isRebootOnly: !current } });
  revalidatePath(`/app-clients/${id}`);
  revalidatePath("/app-clients");
}

export async function deleteClient(id: string): Promise<{ error: string } | never> {
  // Delete in reverse dependency order to avoid FK constraint violations.
  // Raw SQL is used because these tables may have been created without CASCADE
  // constraints (bypassing Prisma migrations).

  const uid = id; // UUID string

  // 1. Raw SQL tables — no FK relation to clients
  await db.$executeRaw`DELETE FROM reboot_completions   WHERE client_id = ${uid}::uuid`.catch(() => {});
  await db.$executeRaw`DELETE FROM reboot_mid_checkins  WHERE client_id::text = ${uid}`.catch(() => {});
  await db.$executeRaw`DELETE FROM weekly_checkins       WHERE client_id::text = ${uid}`.catch(() => {});
  await db.$executeRaw`DELETE FROM messages              WHERE client_id::text = ${uid}`.catch(() => {});

  // 2. exercise_set_results (leaf — depends on session_completions + exercises)
  await db.$executeRaw`
    DELETE FROM exercise_set_results
    WHERE completion_id IN (
      SELECT sc.id FROM session_completions sc
      JOIN training_sessions ts ON sc.session_id = ts.id
      JOIN training_programs  tp ON ts.program_id  = tp.id
      WHERE tp.client_id = ${uid}::uuid
    )
    OR exercise_id IN (
      SELECT e.id FROM exercises e
      JOIN training_sessions ts ON e.session_id  = ts.id
      JOIN training_programs  tp ON ts.program_id = tp.id
      WHERE tp.client_id = ${uid}::uuid
    )
  `.catch(() => {});

  // 3. session_completions
  await db.$executeRaw`
    DELETE FROM session_completions
    WHERE session_id IN (
      SELECT ts.id FROM training_sessions ts
      JOIN training_programs tp ON ts.program_id = tp.id
      WHERE tp.client_id = ${uid}::uuid
    )
  `.catch(() => {});

  // 4. exercises (mapped table name)
  await db.$executeRaw`
    DELETE FROM exercises
    WHERE session_id IN (
      SELECT ts.id FROM training_sessions ts
      JOIN training_programs tp ON ts.program_id = tp.id
      WHERE tp.client_id = ${uid}::uuid
    )
  `.catch(() => {});

  // 5. training_sessions
  await db.$executeRaw`
    DELETE FROM training_sessions
    WHERE program_id IN (SELECT id FROM training_programs WHERE client_id = ${uid}::uuid)
  `.catch(() => {});

  // 6. training_programs, progress_entries, nutrition_files
  await db.$executeRaw`DELETE FROM training_programs WHERE client_id = ${uid}::uuid`.catch(() => {});
  await db.$executeRaw`DELETE FROM progress_entries  WHERE client_id = ${uid}::uuid`.catch(() => {});
  await db.$executeRaw`DELETE FROM nutrition_files   WHERE client_id = ${uid}::uuid`.catch(() => {});

  // 7. Delete the client row itself
  try {
    await db.appClient.delete({ where: { id } });
  } catch (err) {
    console.error("[deleteClient] final delete failed", err);
    return { error: "Suppression impossible. Vérifiez que toutes les données liées ont été supprimées." };
  }

  redirect("/app-clients");
}

/**
 * Efface le diagnostic de départ Reboot d'un client.
 *
 * Le formulaire ne se présente qu'une fois — c'est le principe — donc sans
 * cette remise à zéro, un diagnostic rempli n'importe comment reste tel quel
 * pour toujours, et il n'y a aucun moyen de repartir sur une base propre.
 *
 * Supprimer la ligne suffit : l'app client redemande le formulaire dès qu'elle
 * n'en trouve plus. Le score, lui, est recalculé à la nouvelle validation.
 *
 * La comparaison se fait sur la colonne castée en text, pas sur le paramètre :
 * l'app client crée client_id en UUID et le CRM crée ses tables en TEXT, et
 * caster le paramètre a déjà produit des erreurs 42804 sur ce projet.
 */
export async function resetRebootDiagnostic(id: string) {
  await db.$executeRaw`
    DELETE FROM reboot_diagnostics WHERE client_id::text = ${id}
  `;
  revalidatePath(`/app-clients/${id}`);
}

/**
 * Donne un nouveau mot de passe à un client.
 *
 * Il n'existait aucun moyen d'en changer un. Un client qui oublie le sien, ou
 * dont le mot de passe n'a jamais fonctionné, était simplement dehors : le
 * formulaire de création refuse une adresse déjà utilisée par un client actif,
 * donc même recréer le compte était impossible sans l'archiver d'abord. Avec
 * treize participants, le cas est certain.
 *
 * Le coach choisit le mot de passe et le transmet lui-même : il parle déjà à
 * ses clients tous les jours, et un envoi automatique serait un canal de plus
 * à surveiller.
 *
 * Le mot de passe n'est pas rogné de ses espaces : un espace final collé par
 * mégarde fait partie du mot de passe, et le retirer ici le rendrait
 * incohérent avec la connexion, qui ne le retire pas non plus.
 */
export async function resetClientPassword(id: string, password: string) {
  if (!password || password.length < 4) {
    return { error: "Mot de passe trop court (4 caractères minimum)." };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    // isBlocked repasse à false : un compte bloqué refuse la connexion avec le
    // même message qu'un mot de passe faux, et laisser le blocage en place
    // ferait croire que la réinitialisation n'a pas marché.
    await db.appClient.update({
      where: { id },
      data: { passwordHash, isBlocked: false, isActive: true },
    });
    revalidatePath(`/app-clients/${id}`);
    return { ok: true as const };
  } catch (err) {
    console.error("[resetClientPassword]", err);
    return { error: "Impossible de modifier le mot de passe." };
  }
}

/**
 * Date de départ du challenge pour un participant.
 *
 * C'est elle qui déclenche les relances : lundi la première séance, mercredi
 * le mini-point, dimanche le bilan, lundi la dernière relance. Sans elle,
 * aucune relance ne part — ce qui est préférable à des relances envoyées au
 * hasard.
 *
 * Posée sur le client et non sur une cohorte à part : un retardataire peut
 * ainsi suivre son propre calendrier, décalé d'une semaine, sans créer de
 * structure supplémentaire pour un cas qui reste rare.
 */
export async function setRebootStartDate(id: string, date: string) {
  await db.appClient.update({
    where: { id },
    data: { rebootStartDate: date ? new Date(`${date}T00:00:00Z`) : null },
  });
  revalidatePath(`/app-clients/${id}`);
  revalidatePath("/dashboard");
}

/**
 * Pose la même date de départ sur tous les participants Reboot actifs.
 *
 * Le geste réel du coach au moment du lancement : il a treize personnes et une
 * seule date. Les régler une par une, treize fois, est le genre de tâche qu'on
 * fait mal un dimanche soir.
 *
 * Ne touche que les participants Reboot actifs : les clients en
 * accompagnement n'ont rien à voir avec ce calendrier.
 */
export async function setCohorteStartDate(date: string) {
  if (!date) return { error: "Aucune date fournie." };

  const result = await db.appClient.updateMany({
    where: { isRebootOnly: true, isActive: true },
    data: { rebootStartDate: new Date(`${date}T00:00:00Z`) },
  });

  revalidatePath("/dashboard");
  revalidatePath("/app-clients");
  return { ok: true as const, participants: result.count };
}

/**
 * Enregistrer une mesure à la place du client.
 *
 * Les mensurations ne pouvaient venir que du client, depuis son application.
 * Or elles se prennent le plus souvent en séance, mètre en main — et le coach
 * n'avait aucun moyen de les porter. Résultat : des fiches vides, et une
 * progression qu'on ne peut pas montrer faute de point de départ.
 *
 * La date fait l'unicité : réenregistrer le même jour corrige la saisie au
 * lieu d'ajouter une seconde ligne. Une faute de frappe sur un poids se
 * répare donc en resaisissant, sans rien supprimer.
 *
 * Les champs vides restent vides. Une mesure partielle — le poids seul — vaut
 * mieux qu'une mesure complète inventée, et c'est le cas courant.
 */
export async function enregistrerMesure(
  clientId: string,
  valeurs: {
    date: string;
    poids?: string;
    taille?: string;
    tourTaille?: string;
    poitrine?: string;
    hanches?: string;
    bras?: string;
    cuisses?: string;
    masseGrasse?: string;
    notes?: string;
  }
): Promise<{ ok: boolean; erreur?: string }> {
  const nombre = (v?: string): number | null => {
    if (!v?.trim()) return null;
    // La virgule est ce qu'on tape sur un clavier français, et « 82,5 » doit
    // valoir 82,5 — pas être refusé.
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const date = valeurs.date?.trim();
  if (!clientId || !date) return { ok: false, erreur: "Date manquante." };

  const champs = {
    weightKg: nombre(valeurs.poids),
    heightCm: nombre(valeurs.taille),
    waistCm: nombre(valeurs.tourTaille),
    chestCm: nombre(valeurs.poitrine),
    hipsCm: nombre(valeurs.hanches),
    armsCm: nombre(valeurs.bras),
    thighsCm: nombre(valeurs.cuisses),
    bodyFatPercent: nombre(valeurs.masseGrasse),
    notes: valeurs.notes?.trim() || null,
  };

  if (Object.values(champs).every((v) => v === null)) {
    return { ok: false, erreur: "Aucune valeur saisie." };
  }

  try {
    // Écrit en SQL direct, et l'existence de chaque colonne est assurée avant.
    //
    // Deux pièges déjà rencontrés sur ce projet se rejoignent ici. Prisma
    // sélectionne toutes les colonnes qu'il déclare : une seule absente en
    // base fait échouer la requête entière. Et son `upsert` s'appuie sur un
    // index unique qui, lui non plus, n'existe pas forcément — les migrations
    // de ce projet sont documentées mais jamais exécutées.
    //
    // Le « une ligne par jour » est donc obtenu à la main : on regarde, puis
    // on complète ou on insère.
    for (const colonne of [
      "height_cm NUMERIC(5,1)",
      "weight_kg NUMERIC(5,2)",
      "body_fat_percent NUMERIC(4,1)",
      "chest_cm NUMERIC(5,1)",
      "waist_cm NUMERIC(5,1)",
      "hips_cm NUMERIC(5,1)",
      "arms_cm NUMERIC(5,1)",
      "thighs_cm NUMERIC(5,1)",
      "notes TEXT",
    ]) {
      await db
        .$executeRawUnsafe(`ALTER TABLE progress_entries ADD COLUMN IF NOT EXISTS ${colonne}`)
        .catch(() => {});
    }

    const existante = await db.$queryRaw<{ id: string }[]>`
      SELECT id::text FROM progress_entries
       WHERE client_id = ${clientId}::uuid AND entry_date = ${date}::date
       LIMIT 1
    `;

    if (existante[0]) {
      // COALESCE : un champ laissé vide ne remplace pas ce qui est déjà noté.
      await db.$executeRaw`
        UPDATE progress_entries SET
          weight_kg = COALESCE(${champs.weightKg}::numeric, weight_kg),
          height_cm = COALESCE(${champs.heightCm}::numeric, height_cm),
          waist_cm = COALESCE(${champs.waistCm}::numeric, waist_cm),
          chest_cm = COALESCE(${champs.chestCm}::numeric, chest_cm),
          hips_cm = COALESCE(${champs.hipsCm}::numeric, hips_cm),
          arms_cm = COALESCE(${champs.armsCm}::numeric, arms_cm),
          thighs_cm = COALESCE(${champs.thighsCm}::numeric, thighs_cm),
          body_fat_percent = COALESCE(${champs.bodyFatPercent}::numeric, body_fat_percent),
          notes = COALESCE(${champs.notes}, notes)
        WHERE id = ${existante[0].id}::uuid
      `;
    } else {
      await db.$executeRaw`
        INSERT INTO progress_entries
          (client_id, entry_date, weight_kg, height_cm, waist_cm, chest_cm,
           hips_cm, arms_cm, thighs_cm, body_fat_percent, notes)
        VALUES (${clientId}::uuid, ${date}::date,
                ${champs.weightKg}::numeric, ${champs.heightCm}::numeric,
                ${champs.waistCm}::numeric, ${champs.chestCm}::numeric,
                ${champs.hipsCm}::numeric, ${champs.armsCm}::numeric,
                ${champs.thighsCm}::numeric, ${champs.bodyFatPercent}::numeric,
                ${champs.notes})
      `;
    }

    revalidatePath(`/app-clients/${clientId}`);
    return { ok: true };
  } catch (err) {
    console.error("[enregistrerMesure]", err);
    // Le message réel plutôt qu'un constat : « impossible » tout court oblige
    // à deviner, et ce sont toujours les mêmes trois causes.
    return { ok: false, erreur: `Enregistrement impossible — ${String(err).slice(0, 300)}` };
  }
}

/** Supprime une mesure — une saisie faite sur la mauvaise fiche. */
export async function supprimerMesure(
  id: string,
  clientId: string
): Promise<{ ok: boolean; erreur?: string }> {
  try {
    await db.appProgressEntry.delete({ where: { id } });
    revalidatePath(`/app-clients/${clientId}`);
    return { ok: true };
  } catch (err) {
    console.error("[supprimerMesure]", err);
    return { ok: false, erreur: "Suppression impossible." };
  }
}
