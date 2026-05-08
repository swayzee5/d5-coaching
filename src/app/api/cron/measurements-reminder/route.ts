import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMeasurementsReminderEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const day21 = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  const day28 = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  // Active clients whose last measurement was between 21 and 28 days ago
  // (catches the 3-week window with a weekly cron — avoids duplicate emails)
  const clients = await db.appClient.findMany({
    where: {
      isActive: true,
      isBlocked: false,
      OR: [
        // Clients with at least one entry whose last entry is in the 21-28 day window
        {
          progressEntries: {
            some: {},
            none: { entryDate: { gt: day21 } },
          },
          AND: {
            progressEntries: {
              some: { entryDate: { gte: day28 } },
            },
          },
        },
        // Clients with no entries whose account was created 21-28 days ago
        {
          progressEntries: { none: {} },
          createdAt: { gte: day28, lte: day21 },
        },
      ],
    },
    select: { firstName: true, email: true },
  });

  const results = await Promise.allSettled(
    clients.map((c) =>
      sendMeasurementsReminderEmail({ firstName: c.firstName, email: c.email })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ sent, failed, total: clients.length });
}
