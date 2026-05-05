import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const clientId = formData.get("clientId") as string | null;
    const name = formData.get("name") as string | null;

    if (!file || !clientId || !name) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blobPath = `nutrition/${clientId}/${Date.now()}-${safeName}`;

    const blob = await put(blobPath, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    const record = await db.appNutritionFile.create({
      data: {
        clientId,
        name,
        fileUrl: blob.url,
        fileName: file.name,
        fileSize: file.size,
      },
    });

    return NextResponse.json({
      id: record.id,
      name: record.name,
      fileUrl: record.fileUrl,
      fileName: record.fileName,
      fileSize: record.fileSize,
      uploadedAt: record.uploadedAt.toISOString(),
    });
  } catch (error) {
    console.error("[upload-nutrition]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
