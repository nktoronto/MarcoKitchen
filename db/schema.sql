-- One row per booking request, whether confirmed, still pending, or
-- later cancelled/declined/lapsed. See spec.md for the full behavior
-- this table supports.
CREATE TABLE IF NOT EXISTS reservations (
  id BIGSERIAL PRIMARY KEY,
  location TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  party_size INTEGER NOT NULL CHECK (party_size >= 1),
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('confirmed', 'pending', 'declined', 'cancelled', 'lapsed')),
  decline_reason TEXT,
  -- Not used yet (email/SMS/cancel flows are a later chunk) — generated
  -- now so the table doesn't need reworking when those chunks arrive.
  cancel_token UUID NOT NULL DEFAULT gen_random_uuid(),
  decision_token UUID NOT NULL DEFAULT gen_random_uuid(),
  -- Set once the post-visit "leave us a review" email has gone out, so the
  -- daily job never sends it twice for the same booking.
  review_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speeds up the covers-cap check: "how many confirmed guests are already
-- booked for this location at this date/time?"
CREATE INDEX IF NOT EXISTS idx_reservations_slot
  ON reservations (location, reservation_date, reservation_time, status);
