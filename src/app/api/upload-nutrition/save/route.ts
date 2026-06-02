import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { clientId, name, fileUrl, fileName, fileSize } = await request.json();

    if (!clientId || !name || !fileUrl) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    const record = await db.appNutritionFile.create({
      data: {
        clientId,
        name,
        fileUrl,
        fileName: fileName ?? name,
        fileSize: fileSize ?? null,
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
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[save-nutrition]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
