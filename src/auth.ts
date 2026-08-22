import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";

// Le CRM n'a qu'un seul utilisateur : le coach. Ses identifiants vivent dans
// l'environnement plutôt qu'en base — pas de table à créer, pas de compte à
// provisionner, et rien à voler dans la base si elle fuit. Le jour où il faudra
// plusieurs coachs, c'est ce provider qu'on remplacera par une vraie table.
//
// Variables attendues :
//   AUTH_SECRET          secret de signature des sessions
//   COACH_EMAIL          identifiant de connexion
//   COACH_PASSWORD_HASH  hash bcrypt du mot de passe (jamais le mot de passe)

// Hash factice, comparé quand l'email ne correspond pas : sans lui, une réponse
// instantanée révélerait qu'un email est inconnu.
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const expectedEmail = (process.env.COACH_EMAIL ?? "").toLowerCase().trim();
        const expectedHash = process.env.COACH_PASSWORD_HASH ?? "";

        if (!expectedEmail || !expectedHash) {
          // Sans identifiants configurés, on refuse tout le monde. Laisser
          // passer « parce que ce n'est pas configuré » serait le pire choix.
          console.error(
            "[auth] COACH_EMAIL ou COACH_PASSWORD_HASH manquante — connexion impossible"
          );
          return null;
        }

        const emailMatches = email === expectedEmail;
        const valid = await bcrypt.compare(
          password,
          emailMatches ? expectedHash : DUMMY_HASH
        );

        if (!emailMatches || !valid) return null;

        return { id: "coach", email: expectedEmail, name: "Coach D5" };
      },
    }),
  ],
});
