"use server";

import { revalidatePath } from "next/cache";
import { approveByToken, declineByToken } from "@/lib/decisions";

export async function approveReservationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  await approveByToken(token);
  revalidatePath(`/review/${token}`);
}

export async function declineReservationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const reason = String(formData.get("reason") ?? "");
  await declineByToken(token, reason);
  revalidatePath(`/review/${token}`);
}
