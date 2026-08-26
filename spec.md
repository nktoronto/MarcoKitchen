# Marco's Kitchen — Landing Page Spec

## Goal
Replace phone-only booking with a self-serve reservation form on one landing page: small parties book instantly with no involvement from Marco, large parties still get his personal capacity check before being confirmed.

## Integration with Existing Site
Marco's existing site (cafedekhan.ca, WordPress) stays as-is. This reservation page is deployed as its own standalone URL, and Marco adds a "Book a Table" link/button on the WordPress site pointing to it. No WordPress code changes, no iframe embedding — the reservation app remains fully separate, consistent with the single-landing-page constraint.

## Known Future Requirement (Not Yet in Scope)
Café de Khan operates **two locations today, with one or two more branches possibly coming** (the site's franchising page backs this up). This spec and the current build (Chunk 1) are deliberately single-location for now. The following is **confirmed** for whenever multi-location work is actually scoped (Chunk 2 or later) — these are settled decisions, not open design questions:

- **Locations are a first-class, arbitrary-length list** — not hardcoded to two. Each location has its own: display name, address, public phone, **operating hours**, **seating capacity (covers cap)**, and **alert phone number** (where Marco's SMS alerts/reminders/cancellation notices for that location's bookings are sent). Adding a future branch should be a data change, not a re-architecture — this must not get hardcoded around "exactly two locations" when Chunk 2 is built.
- The booking UI will have a location dropdown; selecting a location shows that location's hours, then the existing booking fields underneath.
- Real data found on cafedekhan.ca (plain text in the homepage footer — no API/structured data, hence manual entry rather than scraping), now implemented in `lib/locations.ts`:
  - **Mississauga** — 6400 Millcreek Drive, Unit #13, Mississauga, ON L5N 6A3 — Sun–Thurs 11:30am–11:00pm, Fri & Sat 11:30am–12:00am — public phone (905) 817-1881 — capacity 50 — alert phone (647) 239-6241
  - **Oakville** — 2423 Trafalgar Rd, Oakville, ON L6H 6K7 — Mon–Fri 11:45am–11:00pm, Sat 10:00am–12:00am, Sun 10:00am–11:00pm — public phone (905) 257-5128 — capacity 50 — alert phone (647) 239-6241 (this is the hours already used in Chunk 1's original single-location build)

**Still open:**
- Capacity is confirmed at 50 for both locations.
- Both locations are temporarily using the **same** alert phone number, (647) 239-6241, "for now" per the user — confirm with Marco whether each location should eventually get its own distinct alert number, or whether one shared number is actually fine long-term.

## User Scenarios
1. A couple wants a table for two tonight. They land on the page, glance at the menu highlights, fill in the reservation form, and get instant confirmation — no call, no wait.
2. A group of ten wants to book a birthday dinner. They submit the same form and see a "pending, Marco will confirm" message. Marco gets a text with the basics and a link to a page showing the full request plus everything else already booked that day, so he can approve or decline (with an optional reason) with real context.
3. Marco is slow to respond to that group's request. He gets an hourly text reminder until he acts, the guest cancels, or the requested date passes — whichever comes first. If the date passes with no response, the guest gets an email letting them know it wasn't confirmed in time.
4. A visitor just wants to see what's on offer before deciding to book. They scroll the same page and see menu highlights — there's no separate menu page to click to.
5. A guest who booked (confirmed or still-pending) changes their mind. They use the cancel link in their own confirmation/pending email — no login needed — and Marco is notified.

## Functional Requirements

**Page**
- One scrolling page: hero/intro, menu highlights, and a reservation form. No other pages.
- Menu highlights (name, description, photo, price per dish) are sourced from a simple editable content file/lightweight CMS — Marco (or a non-technical helper) can update them without a code change or redeploy.

**Reservation form**
- Fields: name, email (required), phone (optional), date, time, party size (minimum 1, no maximum), optional notes.
- Date/time must fall within operating hours:
  - Mon–Fri: 11:45am – 11:00pm
  - Sat: 10:00am – 12:00am (crosses midnight into Sunday — a Saturday-night booking past midnight is still valid Saturday-hours, not rejected)
  - Sun: 10:00am – 11:00pm
- Past date/times are rejected. No minimum lead time (a booking a few minutes out is fine if within hours). No maximum advance-booking window.
- Basic bot/spam protection (CAPTCHA or honeypot) is present on the form.

**Booking paths by party size**
- **Small party (1–6 guests)**: checked against a 50-covers-per-slot cap, counting only already-*approved*/confirmed reservations for that date/time (pending large-party requests do not count toward this cap).
  - Within cap → immediate on-screen confirmation, DB row, confirmation email with a cancel link.
  - Would exceed cap → blocked outright with a visible error telling the guest to pick another time. Does not fall through to pending.
- **Large party (7+ guests)**: always saved as pending, regardless of size (no upper ceiling, no separate "contact us for events" flow).
  - Guest sees an on-screen "pending" message and gets a pending email with a cancel link.
  - Marco gets an SMS: short text (name, party size, date/time) plus a link to a details page. That page shows the full request and a same-day summary of everything else already confirmed/pending for that date, plus Approve and Decline actions.

**Marco's review**
- **Approve**: one click, immediately confirms the reservation and sends the guest a confirmed email.
- **Decline**: click leads to a small step where Marco can add a short reason/alternative before confirming; the guest's decline email includes that reason if provided (generic wording if left blank).
- Once acted on, the link becomes inert — a later click on either link shows an "already handled" page. No duplicate actions, no flip-flopping.
- If Marco doesn't respond, he gets hourly SMS reminders (same short-text-plus-link format) until he acts, the guest cancels, or the reservation's date/time passes — whichever happens first.
- If the date/time passes with no response: reminders stop, the reservation is marked lapsed, and the guest gets an email saying it wasn't confirmed in time.

**Cancellation**
- Both the confirmed and the pending guest email include a unique cancel link — no login needed to identify the booking.
- Cancelling marks the reservation cancelled in the database and notifies Marco (assumption: also via SMS, consolidating all of Marco's notifications onto one channel — confirm this is fine, since it wasn't asked as a standalone question).
- Cancelling a still-pending large-party request immediately stops its hourly reminders — Marco gets one final "cancelled by guest" notice instead of continued pings.

## Edge Cases & Rules
- A party of exactly 6 counts as small; 7 is the first large-party size.
- The covers cap only counts approved reservations, not pending ones — an accepted tradeoff: Marco could approve a large party into a slot that's since filled with small bookings. That's on his judgment, not the system's.
- Missing or invalid required fields (including a malformed email) block submission with a visible inline error — nothing is silently dropped or saved incomplete.
- If the confirmation/pending email fails to send, the reservation is still saved — email delivery is not a precondition for the booking itself.
- Duplicate submissions (same person submitting twice) are not deduplicated — each is its own reservation.
- Timezone is single and fixed (the restaurant's local time) — no per-guest conversion.
- Data retention/privacy handling is explicitly out of scope for this MVP, not silently undefined.

## Out of Scope
- This is a **single landing page** — no separate `/menu`, `/about`, or `/contact` pages, and no navigation between pages.
- No general admin dashboard — the one-off details page tied to a specific pending request (with its same-day summary and Approve/Decline actions) is not a management UI; anything beyond that, Marco checks the database directly.
- No payments or deposits.
- No login/account system, for guests or for Marco.
- No table/floor-plan availability engine — only the blunt covers-per-slot cap described above.
- No cap on party size / no separate large-event inquiry flow — every large party goes through the same pending path.
- No multi-timezone handling.
- No data retention/privacy policy work for this MVP.

## Acceptance Criteria
- The page shows restaurant intro, menu highlights (name/description/photo/price), and the reservation form, with nothing else to navigate to.
- A valid small-party submission within the covers cap gets immediate on-screen confirmation, a DB row, and a confirmation email with a cancel link.
- A valid small-party submission that would exceed the covers cap is blocked with a visible error; nothing is saved.
- A valid large-party submission gets an on-screen "pending" message, a DB row marked pending, a pending email with a cancel link, and Marco receives an SMS alert with a details-page link.
- Marco approving a pending request confirms it, sends the guest a confirmed email, and makes the link inert.
- Marco declining a pending request (with or without a typed reason) sends the guest a decline email and makes the link inert.
- An unanswered pending request generates hourly SMS reminders to Marco until action, cancellation, or the reservation date passing.
- A pending request whose date passes unanswered stops reminders, is marked lapsed, and triggers a "not confirmed in time" email to the guest.
- A guest cancelling (confirmed or pending) marks the reservation cancelled, notifies Marco, and immediately stops any reminders in flight.
- A submission outside operating hours, or for a past date/time, is blocked with a visible error.
- The form includes basic bot/spam protection.
- The page is fully usable on a mobile-width screen with no horizontal scrolling.

## Confirmed Configuration
- Small/large threshold: 6 guests.
- Seating capacity: 50 covers per time slot.
- Operating hours: Mon–Fri 11:45am–11:00pm, Sat 10:00am–12:00am, Sun 10:00am–11:00pm.
- Marco's alert channel: SMS (not email) for large-party alerts, reminders, and cancellation notices — confirmed as one consistent channel for everything that notifies Marco.

## Open Item
None remaining. All configuration and behavioral decisions are resolved.
