import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { exerciseName } = await req.json();
  if (!exerciseName) {
    return NextResponse.json({ error: "exerciseName requis" }, { status: 400 });
  }

  const apiKey = (process.env.RUNWAY_API_KEY ?? "").trim();
  if (!apiKey) {
    return NextResponse.json({ error: "RUNWAY_API_KEY non configurée" }, { status: 500 });
  }

  const promptText = `A fitness coach performing ${exerciseName} exercise with perfect form, side view, clean white studio background, professional lighting, 4K quality, smooth movement`;

  const res = await fetch("https://api.dev.runwayml.com/v1/text_to_video", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify({
      model: "gen4_turbo",
      promptText,
      ratio: "1280:768",
      duration: 5,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[runway:generate]", res.status, text);
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ taskId: data.id });
}
