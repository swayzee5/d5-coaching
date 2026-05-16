import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

async function uploadToVimeo(videoUrl: string, exerciseName: string): Promise<string | null> {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) return null;

  const res = await fetch("https://api.vimeo.com/me/videos", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
    body: JSON.stringify({
      upload: {
        approach: "pull",
        link: videoUrl,
      },
      name: `${exerciseName} — D5 Coaching`,
      privacy: { view: "anybody" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[vimeo:upload]", res.status, text);
    return null;
  }

  const data = await res.json();
  // URI format: "/videos/123456789"
  const vimeoId = data.uri?.split("/").pop() ?? null;
  return vimeoId;
}

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  const exerciseId = req.nextUrl.searchParams.get("exerciseId");
  const exerciseName = req.nextUrl.searchParams.get("exerciseName") ?? "Exercice";

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

    // Save Runway URL as backup
    await db.$executeRaw`
      UPDATE exercise_library
      SET generated_video_url = ${videoUrl}
      WHERE id = ${exerciseId}::uuid
    `.catch((err: unknown) => console.error("[save:runway_url]", err));

    // Upload to Vimeo and save ID
    const vimeoId = await uploadToVimeo(videoUrl, exerciseName);
    if (vimeoId) {
      await db.$executeRaw`
        UPDATE exercise_library
        SET vimeo_video_id = ${vimeoId}
        WHERE id = ${exerciseId}::uuid
      `.catch((err: unknown) => console.error("[save:vimeo_id]", err));
    }
  }

  return NextResponse.json({ status: data.status, videoUrl });
}
