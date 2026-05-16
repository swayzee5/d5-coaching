import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  const exerciseId = req.nextUrl.searchParams.get("exerciseId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId requis" }, { status: 400 });
  }

  const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
    headers: {
      Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
      "X-Runway-Version": "2024-11-06",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[runway:status]", res.status, text);
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  const videoUrl: string | undefined = data.output?.[0];

  if (data.status === "SUCCEEDED" && exerciseId && videoUrl) {
    await db.$executeRaw`
      ALTER TABLE exercise_library
      ADD COLUMN IF NOT EXISTS generated_video_url TEXT
    `.catch(() => {});

    await db.$executeRaw`
      UPDATE exercise_library
      SET generated_video_url = ${videoUrl}
      WHERE id = ${exerciseId}::uuid
    `.catch((err: unknown) => console.error("[runway:save]", err));
  }

  return NextResponse.json({ status: data.status, videoUrl });
}
