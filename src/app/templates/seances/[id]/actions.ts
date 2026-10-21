"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function deleteExerciseFromSeanceTemplate(exerciseId: string, templateId: string) {
  await db.$executeRaw`
    DELETE FROM seance_template_exercises WHERE id = ${exerciseId}::uuid
  `;

  revalidatePath(`/templates/seances/${templateId}`);
  revalidatePath("/templates");
}

export async function updateSeanceTemplateName(formData: FormData) {
  const templateId = formData.get("templateId") as string;
  const name = formData.get("name") as string;
  const durationMinutes = formData.get("durationMinutes") as string;

  if (!name?.trim() || !templateId) return;

  await db.$executeRaw`
    UPDATE seance_templates
    SET
      name = ${name.trim()},
      duration_minutes = ${durationMinutes ? parseInt(durationMinutes) : null}
    WHERE id = ${templateId}::uuid
  `;

  revalidatePath(`/templates/seances/${templateId}`);
  revalidatePath("/templates");
}

/**
 * Déplace un exercice d'un cran dans une séance type.
 *
 * L'ordre d'une séance n'est pas décoratif : il décide de ce qui est fait
 * frais et de ce qui est fait fatigué. Composer une séance sans pouvoir la
 * réordonner oblige à tout supprimer pour insérer un exercice au bon endroit.
 *
 * Les deux rangs sont échangés dans une transaction. Interrompue au milieu, la
 * séance se retrouverait avec deux exercices au même rang, et leur ordre
 * dépendrait alors du hasard de la requête suivante.
 *
 * Les rangs sont renumérotés avant l'échange : les séances créées avant cette
 * fonction peuvent porter des rangs égaux ou troués, et un échange sur des
 * rangs incohérents ne déplace rien visiblement.
 */
export async function deplacerExerciceTemplate(
  exerciseId: string,
  templateId: string,
  sens: "haut" | "bas"
): Promise<{ ok: boolean; erreur?: string }> {
  try {
    await db.$executeRaw`
      WITH ranges AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY order_index, id) - 1 AS rang
          FROM seance_template_exercises
         WHERE seance_template_id = ${templateId}::uuid
      )
      UPDATE seance_template_exercises e
         SET order_index = r.rang
        FROM ranges r
       WHERE e.id = r.id AND e.order_index IS DISTINCT FROM r.rang
    `;

    const lignes = await db.$queryRaw<{ id: string; order_index: number }[]>`
      SELECT id::text, order_index
        FROM seance_template_exercises
       WHERE seance_template_id = ${templateId}::uuid
       ORDER BY order_index
    `;

    const position = lignes.findIndex((l) => l.id === exerciseId);
    if (position === -1) return { ok: false, erreur: "Exercice introuvable." };

    const cible = sens === "haut" ? position - 1 : position + 1;
    // Aux extrémités il n'y a rien à faire, et ce n'est pas une erreur : le
    // bouton est désactivé, mais un double clic rapide peut passer.
    if (cible < 0 || cible >= lignes.length) return { ok: true };

    const a = lignes[position];
    const b = lignes[cible];

    await db.$transaction([
      db.$executeRaw`UPDATE seance_template_exercises SET order_index = ${b.order_index} WHERE id = ${a.id}::uuid`,
      db.$executeRaw`UPDATE seance_template_exercises SET order_index = ${a.order_index} WHERE id = ${b.id}::uuid`,
    ]);

    revalidatePath(`/templates/seances/${templateId}`);
    revalidatePath("/templates");
    return { ok: true };
  } catch (err) {
    console.error("[deplacerExerciceTemplate]", err);
    return { ok: false, erreur: "Déplacement impossible." };
  }
}

/**
 * Cherche un exercice dans la bibliothèque, pour composer une séance type.
 *
 * Le nom était saisi à la main. Une faute de frappe, un accent écrit
 * autrement, une apostrophe typographique — et le rattachement à la
 * bibliothèque échoue au moment de l'attribution : le client voit alors un
 * exercice sans vidéo ni description, et personne ne sait pourquoi. Ces trois
 * pièges nous ont déjà coûté plusieurs jours.
 *
 * Les exercices sans vidéo sont renvoyés mais signalés : le coach doit voir
 * qu'il en manque une plutôt que de découvrir le trou chez son client.
 */
export type ExerciceBibliotheque = {
  id: string;
  nom: string;
  aVideo: boolean;
  muscles: string[];
};

export async function chercherDansBibliotheque(q: string): Promise<ExerciceBibliotheque[]> {
  const terme = q.trim();
  if (terme.length < 2) return [];

  const rows = await db.$queryRaw<
    { id: string; nom: string; a_video: boolean; muscles: string[] | null }[]
  >`
    SELECT id::text, name AS nom, (vimeo_video_id IS NOT NULL) AS a_video, muscles
      FROM exercise_library
     WHERE is_active = true
       AND LOWER(name) LIKE '%' || LOWER(${terme}) || '%'
     ORDER BY (vimeo_video_id IS NOT NULL) DESC, name
     LIMIT 20
  `.catch(() => []);

  return rows.map((r) => ({
    id: r.id,
    nom: r.nom,
    aVideo: r.a_video,
    muscles: r.muscles ?? [],
  }));
}

/**
 * Ajoute un exercice choisi dans la bibliothèque à une séance type.
 *
 * Le nom enregistré est celui de la bibliothèque, jamais une saisie : c'est
 * lui qui garantit le rattachement, et donc la vidéo chez le client.
 */
export async function ajouterExerciceDepuisBibliotheque(
  templateId: string,
  nomBibliotheque: string,
  valeurs: { series: number; reps: string; repos: number; note?: string | null }
): Promise<{ ok: boolean; erreur?: string }> {
  if (!templateId || !nomBibliotheque.trim()) {
    return { ok: false, erreur: "Exercice manquant." };
  }
  try {
    const [{ rang }] = await db.$queryRaw<{ rang: number }[]>`
      SELECT COALESCE(MAX(order_index) + 1, 0)::int AS rang
        FROM seance_template_exercises WHERE seance_template_id = ${templateId}::uuid
    `;
    await db.$executeRaw`
      INSERT INTO seance_template_exercises
        (seance_template_id, exercise_name, sets, reps, rest_seconds, order_index, notes)
      VALUES (${templateId}::uuid, ${nomBibliotheque}, ${valeurs.series}, ${valeurs.reps},
              ${valeurs.repos}, ${rang}, ${valeurs.note?.trim() || null})
    `;
    revalidatePath(`/templates/seances/${templateId}`);
    revalidatePath("/templates");
    return { ok: true };
  } catch (err) {
    console.error("[ajouterExerciceDepuisBibliotheque]", err);
    return { ok: false, erreur: "Ajout impossible." };
  }
}

/**
 * Modifie un exercice déjà posé dans une séance type.
 *
 * Il fallait supprimer et rajouter pour corriger un nombre de répétitions. La
 * ligne repartait alors en fin de séance, et l'ordre — ce qui est fait frais,
 * ce qui est fait fatigué — était à refaire à la main.
 *
 * Le nom peut changer aussi : remplacer un exercice par un autre sans perdre
 * sa place. Il doit venir de la bibliothèque, comme à l'ajout, sinon le
 * rattachement casse et le client se retrouve avec un exercice muet.
 */
export async function modifierExerciceTemplate(
  exerciceId: string,
  templateId: string,
  valeurs: { nom: string; series: number; reps: string; repos: number; note?: string | null }
): Promise<{ ok: boolean; erreur?: string }> {
  const nom = valeurs.nom.trim();
  if (!exerciceId || !nom) return { ok: false, erreur: "Exercice manquant." };

  try {
    await db.$executeRaw`
      UPDATE seance_template_exercises
         SET exercise_name = ${nom},
             sets = ${valeurs.series},
             reps = ${valeurs.reps},
             rest_seconds = ${valeurs.repos},
             notes = ${valeurs.note?.trim() || null}
       WHERE id = ${exerciceId}::uuid
    `;
    revalidatePath(`/templates/seances/${templateId}`);
    revalidatePath("/templates");
    return { ok: true };
  } catch (err) {
    console.error("[modifierExerciceTemplate]", err);
    return { ok: false, erreur: "Modification impossible." };
  }
}

/**
 * Ce que le client verra exactement pour cet exercice.
 *
 * Le template ne porte qu'un nom ; la vidéo et la description sont lues dans
 * la bibliothèque au moment où le client ouvre sa séance. Entre les deux, il
 * n'y avait aucun moyen de vérifier que le rattachement se fera — et la
 * mauvaise surprise arrivait chez le client.
 *
 * La résolution reproduit exactement celle de l'app cliente : le nom, en
 * ignorant casse, espaces, accents décomposés et apostrophes typographiques.
 * Un aperçu qui résoudrait autrement que l'app ne servirait à rien.
 */
export type ApercuExercice = {
  trouve: boolean;
  nomBibliotheque: string | null;
  vimeoVideoId: string | null;
  description: string | null;
  /** La consigne réellement affichée : celle de la séance, sinon la description. */
  consigneAffichee: string | null;
  /** Plusieurs entrées portent ce nom : le rattachement devient incertain. */
  homonymes: number;
};

export async function apercuExercice(
  nom: string,
  consigneSeance: string | null
): Promise<ApercuExercice> {
  const vide: ApercuExercice = {
    trouve: false,
    nomBibliotheque: null,
    vimeoVideoId: null,
    description: null,
    consigneAffichee: consigneSeance?.trim() || null,
    homonymes: 0,
  };

  try {
    const rows = await db.$queryRaw<
      { name: string; vimeo_video_id: string | null; description: string | null }[]
    >`
      SELECT name, vimeo_video_id, description
        FROM exercise_library WHERE is_active = true
    `;

    // La normalisation se fait ici et non en SQL : elle doit être exactement
    // celle du seed et de l'app cliente, et la réécrire en SQL avec ses
    // apostrophes échappées serait illisible et inévitablement divergent.
    const cible = cleNom(nom);
    const candidats = rows.filter((r) => cleNom(r.name) === cible);
    if (candidats.length === 0) return vide;

    // À nom égal, celle qui a une vidéo l'emporte — même règle qu'au seed.
    const trouve =
      candidats.find((c) => c.vimeo_video_id) ?? candidats[0];

    return {
      trouve: true,
      nomBibliotheque: trouve.name,
      vimeoVideoId: trouve.vimeo_video_id,
      description: trouve.description,
      // L'app cliente affiche la consigne de la séance si elle existe, et la
      // description de la bibliothèque sinon.
      consigneAffichee: consigneSeance?.trim() || trouve.description || null,
      homonymes: candidats.length,
    };
  } catch (err) {
    console.error("[apercuExercice]", err);
    return vide;
  }
}

/**
 * La clé de comparaison d'un nom d'exercice.
 *
 * Identique à celle du seed : Unicode normalisé, apostrophes ramenées à la
 * même, espaces réduits. Ces trois pièges ont chacun fait disparaître un
 * exercice en silence sur ce projet.
 */
function cleNom(nom: string): string {
  return nom
    .normalize("NFC")
    .replace(/[\u2018\u2019\u02BC\u0060\u00B4]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
