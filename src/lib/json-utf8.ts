import { NextResponse } from "next/server";

/**
 * Une réponse JSON dont les accents s'affichent.
 *
 * Le corps est bien en UTF-8, mais sans `charset` dans l'en-tête le
 * navigateur devine — et sur une page ouverte à la main depuis un iPhone, il
 * devine mal : « clients réels » se lit « clients rÃ©els ». Ces routes sont
 * faites pour être ouvertes à la main, donc l'en-tête se dit.
 */
export function jsonUtf8(data: unknown, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(data, init);
  res.headers.set("content-type", "application/json; charset=utf-8");
  return res;
}
