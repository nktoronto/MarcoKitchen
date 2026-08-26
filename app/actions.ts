"use server";

import { createReservation } from "@/lib/reservations";

export type BookingFormState = {
  status: "idle" | "confirmed" | "pending" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

// Formats a validated "YYYY-MM-DD" + "HH:MM" pair for display in the
// success message, e.g. "Wednesday, August 26 at 10:00 AM".
function formatDateTime(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const dt = new Date(y, mo - 1, d, hh, mm);
  const dateStr = dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = dt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateStr} at ${timeStr}`;
}

export async function submitReservation(
  prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  // Honeypot: a hidden field real users never fill in. Deliberately NOT
  // named anything that looks like a real form field (company, website,
  // url, email2, ...) — browser autofill (address/business info saved in
  // Chrome, password managers) will happily fill a hidden field with a
  // common-looking name, which would silently fake success for a real
  // visitor. If it's filled, pretend success instead of erroring — don't
  // tip off the bot — but a genuine field name collision must not happen.
  if (formData.get("hp_confirm_no_fill")) {
    return { status: "confirmed", message: "You're confirmed!" };
  }

  const result = await createReservation({
    locationId: String(formData.get("locationId") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    partySize: Number(formData.get("partySize")),
    date: String(formData.get("date") ?? ""),
    time: String(formData.get("time") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!result.ok) {
    return { status: "error", message: result.error, fieldErrors: result.fieldErrors };
  }

  const when = formatDateTime(result.date, result.time);

  return {
    status: result.status,
    message:
      result.status === "confirmed"
        ? `You're confirmed for ${when}! We look forward to seeing you.`
        : `Thanks — your request for ${when} is in. We'll confirm shortly.`,
  };
}
