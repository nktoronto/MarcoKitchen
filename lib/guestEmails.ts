import { sendEmail } from "./email";
import { locations } from "./locations";
import { formatDateLabel, formatTimeLabel } from "./formatting";

function siteUrl(): string {
  return process.env.SITE_URL ?? "https://marcoskitchen.vercel.app";
}

function locationName(locationId: string): string {
  return locations.find((l) => l.id === locationId)?.name ?? locationId;
}

type ReservationForGuestEmail = {
  id: number;
  name: string;
  email: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  location: string;
  cancel_token: string;
};

export async function sendGuestConfirmedEmail(r: ReservationForGuestEmail): Promise<void> {
  const when = `${formatDateLabel(r.reservation_date)} at ${formatTimeLabel(r.reservation_time)}`;
  const cancelUrl = `${siteUrl()}/cancel/${r.cancel_token}`;
  await sendEmail({
    to: r.email,
    subject: `You're confirmed — ${locationName(r.location)}, ${formatDateLabel(r.reservation_date)}`,
    html: `<h2>You're confirmed!</h2>
      <p>Table for ${r.party_size} at ${locationName(r.location)}, ${when}.</p>
      <p>Reservation #${r.id}</p>
      <p>We look forward to seeing you!</p>
      <p><a href="${cancelUrl}">Cancel this reservation</a></p>`,
  });
}

export async function sendGuestPendingEmail(r: ReservationForGuestEmail): Promise<void> {
  const when = `${formatDateLabel(r.reservation_date)} at ${formatTimeLabel(r.reservation_time)}`;
  const cancelUrl = `${siteUrl()}/cancel/${r.cancel_token}`;
  await sendEmail({
    to: r.email,
    subject: `Request received — ${locationName(r.location)}, ${formatDateLabel(r.reservation_date)}`,
    html: `<h2>Thanks — your request is in</h2>
      <p>Table for ${r.party_size} at ${locationName(r.location)}, ${when}, is pending review. We'll confirm shortly.</p>
      <p>Reservation #${r.id}</p>
      <p><a href="${cancelUrl}">Cancel this request</a></p>`,
  });
}

type ReservationForOutcomeEmail = {
  id: number;
  name: string;
  email: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  location: string;
};

export async function sendGuestDeclinedEmail(
  r: ReservationForOutcomeEmail,
  reason: string | null
): Promise<void> {
  const when = `${formatDateLabel(r.reservation_date)} at ${formatTimeLabel(r.reservation_time)}`;
  await sendEmail({
    to: r.email,
    subject: `About your reservation request — ${locationName(r.location)}`,
    html: `<h2>We're unable to accommodate this request</h2>
      <p>Your request for ${r.party_size} at ${locationName(r.location)}, ${when}, couldn't be confirmed.</p>
      <p>Reservation #${r.id}</p>
      <p>${reason ? reason : "Please feel free to reach out or try another time."}</p>`,
  });
}

export async function sendGuestLapsedEmail(r: ReservationForOutcomeEmail): Promise<void> {
  const when = `${formatDateLabel(r.reservation_date)} at ${formatTimeLabel(r.reservation_time)}`;
  await sendEmail({
    to: r.email,
    subject: `Your request wasn't confirmed in time — ${locationName(r.location)}`,
    html: `<h2>Your request has lapsed</h2>
      <p>Your request for ${r.party_size} at ${locationName(r.location)}, ${when}, wasn't confirmed in time.</p>
      <p>Reservation #${r.id}</p>
      <p>Please feel free to submit a new request or contact us directly.</p>`,
  });
}

// TODO: replace with the real Google Business review link (or set
// GOOGLE_REVIEW_URL in the environment) before this goes out to real guests.
const PLACEHOLDER_REVIEW_URL = "https://g.page/r/REPLACE_WITH_REAL_GOOGLE_REVIEW_LINK/review";

export async function sendGuestReviewRequestEmail(r: ReservationForOutcomeEmail): Promise<void> {
  const reviewUrl = process.env.GOOGLE_REVIEW_URL ?? PLACEHOLDER_REVIEW_URL;
  await sendEmail({
    to: r.email,
    subject: `How was your visit to ${locationName(r.location)}?`,
    html: `<h2>Thanks for dining with us, ${r.name}!</h2>
      <p>We hope you enjoyed your table for ${r.party_size} at ${locationName(r.location)}. If you have a minute, a Google review helps a lot — it's the biggest thing that helps other diners find us.</p>
      <p><a href="${reviewUrl}">Leave us a review</a></p>
      <p>Reservation #${r.id}</p>`,
  });
}
