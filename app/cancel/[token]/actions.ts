"use server";

import { revalidatePath } from "next/cache";
import { cancelByToken } from "@/lib/decisions";

export async function cancelReservationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  await cancelByToken(token);
  revalidatePath(`/cancel/${token}`);
}
