"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function deleteClient(id: string) {
  await db.appClient.delete({ where: { id } });
  redirect("/app-clients");
}
