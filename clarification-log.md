# Marco's Kitchen — Spec Clarification Log

Interview conducted to resolve ambiguities in `spec.md` before implementation. One question at a time, answers below in order asked.

## Resolved

1. **Party-size threshold**: 6 guests. Parties of 6 or fewer book instantly ("small"); 7+ require Marco's manual review ("large").
2. **Large-party resolution mechanism**: The system sends a final email to the guest (approved or declined) — not left to Marco to contact them ad hoc.
3. **How Marco actually approves/declines**: Approve/Decline links embedded directly in the alert email he receives for a large-party request. No admin dashboard, no direct DB editing needed for this action.
4. **Operating hours enforcement**: The form enforces Marco's actual open days/hours — out-of-hours date/time picks are rejected with a visible error. (Requires Marco's actual hours as input — not yet specified, see Open Questions.)
5. **Cancellation**: Guests can cancel (not edit) their own reservation via a unique link in their confirmation email. No login system needed to identify the booking.
6. **Cancellation notice**: Cancelling notifies Marco by email, so he isn't caught off guard by a booking disappearing.
7. **Double-booking protection**: A per-slot cap is enforced, based on total guests (covers) rather than number of separate reservations — this actually models physical seating capacity rather than an arbitrary booking count.
8. **Cap overflow behavior**: If a small-party booking would push total covers over the cap, it's blocked outright with a visible error telling the guest to pick another time — it does not fall through to "pending."
9. **Minimum lead time**: None. Any future time within operating hours is accepted, even a few minutes out.
10. **Maximum advance-booking window**: None. Guests can book arbitrarily far in the future.
11. **Menu highlights content updates**: Sourced from a simple editable content file/lightweight CMS Marco (or someone non-technical) can update without a code change/redeploy — a small addition beyond the bare-minimum stack, justified by how often this content actually needs to change.

12. **Minimum party size**: 1 — solo diners can use the form like anyone else.
13. **Maximum party size**: none — any size above the threshold goes through the same pending/approve-decline path, no separate "contact us for events" flow.
14. **Unanswered large-party request**: Marco gets hourly reminder emails until he acts, stopping automatically once the reservation's date/time has passed (not indefinite, not a fixed count).
15. **Lapsed request (date passed, no response)**: the guest is notified by email that the request wasn't confirmed in time — it doesn't just go silent.
16. **Spam/bot protection**: basic protection (CAPTCHA or honeypot) added to the public form — justified by the hourly-reminder mechanism turning fake submissions into real inbox noise for Marco.
17. **Approve/Decline link reuse**: first click wins — the link becomes inert (shows an "already handled" page) on any later click, including after the request has lapsed. No flip-flopping, no duplicate emails.
18. **Decline messaging**: Decline is a two-step action (unlike one-click Approve) — clicking it leads to a small step where Marco can type a short reason/alternative, which is included in the guest's decline email.
19. **Timezone**: single fixed timezone (the restaurant's local time) — no per-guest timezone conversion.
20. **Data privacy/retention**: explicitly out of scope for this MVP — not silently undefined, just deliberately deferred.
21. **Cancel link scope**: included in both the confirmed and the pending email — a guest can withdraw a large-party request even before Marco responds, not just cancel a confirmed small-party booking.
22. **Cancel vs. reminders**: cancelling a still-pending large-party request immediately stops its hourly reminders to Marco (he gets one final "cancelled by guest" notice instead).
23. **Menu highlight fields**: name, description, photo, and price per dish.
24. **Pending vs. covers cap**: a large-party request only counts toward the per-slot covers cap once Marco approves it — not while merely pending. Accepted tradeoff: Marco could approve a large party into a slot that filled up with small bookings in the meantime; that's on his judgment, not the system's.
25. **Context in Marco's alert email**: each large-party alert includes a same-day summary of what else is already confirmed/pending for that date, so he can judge capacity without checking the database separately.

26. **Operating hours**:
    - Mon–Fri: 11:45am – 11:00pm
    - Sat: 10:00am – 12:00am (crosses midnight into Sunday — a booking request for, say, Sat 11:30pm is valid and within hours; the form's hours logic must treat Saturday's window as extending past midnight rather than clipping at 11:59pm).
    - Sun: 10:00am – 11:00pm

27. **Seating capacity**: 50 covers per time slot — this is the number the covers cap enforces against.
28. **Marco's alert channel**: SMS, not email. This overrides every earlier assumption of "email" for Marco's own large-party alerts, hourly reminders, and the "no multi-channel alerting" out-of-scope line (which now means: SMS is the single channel used, not that email is).
29. **SMS content mechanic**: each text is short (name, party size, date/time) with one link to a simple details page; that page carries the full same-day summary and the Approve/Decline actions. Raw same-day summary text is never crammed into the SMS itself. Hourly reminders reuse this same short-text-plus-link format.

30. **Cancellation notices to Marco**: also SMS, same channel as everything else that alerts him. Confirms the assumption noted in `spec.md` — no longer just an assumption.

## Still Open
None. All blocking items (threshold, resolution mechanism, approve/decline mechanics, operating hours, cancellation, capacity cap and overflow, lead time/advance window, menu content, party-size floor/ceiling, non-response reminders and lapsing, spam protection, link idempotency, decline reasoning, timezone, privacy scope, cancel-link scope, cancel/reminder interaction, pending-vs-cap counting, alert context, seating capacity, alert channel, and cancellation-notice channel) are resolved. Guest-facing emails (confirmation/pending/decline/cancel/lapse) stay on email throughout; every notification to Marco himself goes via SMS.

## Interview status
Extensive pass complete — every functional path (booking, threshold, review, cancellation, capacity, reminders, lapsing, content updates) has been walked through. Remaining gaps are configuration values Marco needs to supply, not behavioral ambiguity.
