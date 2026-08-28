"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { locations } from "@/lib/locations";
import { submitReservation, type BookingFormState } from "@/app/actions";

const initialState: BookingFormState = { status: "idle" };

export default function BookTable() {
  const [locationId, setLocationId] = useState(locations[0].id);
  const selectedLocation = locations.find((l) => l.id === locationId) ?? locations[0];
  const [state, formAction, pending] = useActionState(submitReservation, initialState);
  const statusRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLSelectElement>(null);
  // True once the visitor edits anything after seeing a result (or clicks
  // "Reserve Another"), so a stale result can't be mistaken for a fresh one.
  const [resultStale, setResultStale] = useState(false);

  // Controlled fields: React Server Actions reset uncontrolled form fields
  // after every submission (success or error), which would wipe out
  // everything the visitor typed. Holding the values here means they stay
  // put until explicitly cleared (on error, so a mistake can be corrected;
  // on success, the visitor keeps seeing what they booked until they
  // choose to start another reservation).
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [notes, setNotes] = useState("");

  const showResult = state.status !== "idle" && !resultStale;
  const fieldErrors = showResult ? (state.fieldErrors ?? {}) : {};
  const isSuccess = showResult && (state.status === "confirmed" || state.status === "pending");

  useEffect(() => {
    if (state.status !== "idle") {
      statusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state]);

  function decrementParty() {
    setPartySize((prev) => String(Math.max(1, (Number(prev) || 1) - 1)));
  }

  function incrementParty() {
    setPartySize((prev) => String((Number(prev) || 0) + 1));
  }

  function handleReserveAnother(e: React.MouseEvent<HTMLButtonElement>) {
    // Defensive: this button swaps places with the type="submit" button at
    // the same position in the tree, so without a distinct `key` (added
    // below) React would patch the existing DOM node's `type` attribute
    // in place — and doing that mid-click can cause the browser to submit
    // the very button that was "button" type a moment ago. Both the key
    // and this preventDefault close that off.
    e.preventDefault();
    setLocationId(locations[0].id);
    setName("");
    setEmail("");
    setPhone("");
    setDate("");
    setTime("");
    setPartySize("2");
    setNotes("");
    setResultStale(true);
    locationRef.current?.focus();
  }

  return (
    <section
      id="reserve"
      style={{ background: "var(--bg-panel)", color: "var(--cream)", padding: "56px 20px 64px" }}
    >
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "6px" }}>
          <h2 className="display" style={{ fontSize: "28px", color: "var(--gold-pale)" }}>
            Reserve a Table
          </h2>
          <div
            aria-hidden="true"
            style={{
              width: "48px",
              height: "3px",
              background: "var(--gold-rich)",
              borderRadius: "2px",
              margin: "14px auto 0",
            }}
          />
          <p
            style={{
              fontSize: "14.5px",
              lineHeight: 1.5,
              color: "var(--cream)",
              opacity: 0.8,
              margin: "14px auto 0",
              maxWidth: "360px",
            }}
          >
            Tables of 6 or fewer are confirmed instantly. Larger groups are
            confirmed personally, usually within the hour.
          </p>
        </div>

        <form
          action={formAction}
          onChange={() => setResultStale(true)}
          onSubmit={() => setResultStale(false)}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginTop: "28px",
            background: "#ffffff",
            borderRadius: "20px",
            padding: "28px 22px 30px",
            boxShadow: "0 28px 56px -20px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.15)",
            border: "1px solid rgba(239,219,161,0.16)",
          }}
        >
          {/* Honeypot — hidden from real visitors, most simple bots fill it in.
              Name is deliberately non-semantic so browser/password-manager
              autofill never matches and mistakenly fills it in for a real
              visitor (a plain "company"/"website"-style name did exactly
              that in testing). */}
          <input
            type="text"
            name="hp_confirm_no_fill"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
          />

          <SectionLabel first>Your Details</SectionLabel>

          <div>
            <span className="field-label">Name</span>
            <input
              className="field-input"
              type="text"
              name="name"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {fieldErrors.name && <FieldError message={fieldErrors.name} />}
          </div>

          <div>
            <span className="field-label">
              Email <span style={{ color: "var(--gold-rich)" }}>*</span>
            </span>
            <input
              className="field-input"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <span style={{ fontSize: "12.5px", color: "var(--ink-soft)", display: "block", marginTop: "5px" }}>
              We&rsquo;ll send your confirmation here.
            </span>
            {fieldErrors.email && <FieldError message={fieldErrors.email} />}
          </div>

          <div>
            <span className="field-label">Phone (optional)</span>
            <input
              className="field-input"
              type="tel"
              name="phone"
              placeholder="(000) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <SectionLabel>Table Details</SectionLabel>

          <div>
            <span className="field-label">Location</span>
            <select
              ref={locationRef}
              className="field-input"
              name="locationId"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <span className="field-label">Date</span>
              <input
                className="field-input"
                type="date"
                name="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {fieldErrors.date && <FieldError message={fieldErrors.date} />}
            </div>
            <div style={{ flex: 1 }}>
              <span className="field-label">Time</span>
              <input
                className="field-input"
                type="time"
                name="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
              {fieldErrors.time && <FieldError message={fieldErrors.time} />}
            </div>
          </div>

          <div
            style={{
              background: "rgba(23,36,26,0.04)",
              border: "1px solid rgba(23,36,26,0.1)",
              borderRadius: "10px",
              padding: "12px 14px",
            }}
          >
            <span className="field-label" style={{ marginBottom: "4px" }}>
              Hours &mdash; {selectedLocation.name}
            </span>
            {selectedLocation.hours.map((entry) => (
              <div key={entry.days} style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--ink)" }}>
                {entry.days} &nbsp; {entry.time}
              </div>
            ))}
          </div>

          <div>
            <span className="field-label" style={{ textAlign: "center" }}>Party size</span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
              <button
                type="button"
                className="stepper-btn"
                onClick={decrementParty}
                disabled={Number(partySize) <= 1}
                aria-label="Decrease party size"
              >
                &minus;
              </button>
              <input
                className="field-input"
                type="number"
                name="partySize"
                min={1}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                style={{ width: "72px", flex: "none", textAlign: "center", fontWeight: 700 }}
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={incrementParty}
                aria-label="Increase party size"
              >
                +
              </button>
            </div>
            {fieldErrors.partySize && (
              <div style={{ textAlign: "center", marginTop: "5px" }}>
                <FieldError message={fieldErrors.partySize} />
              </div>
            )}
          </div>

          <div>
            <span className="field-label">Notes (optional)</span>
            <textarea
              className="field-input"
              name="notes"
              placeholder="Allergies, special occasion, seating preference…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {isSuccess ? (
            <button
              key="reserve-another"
              type="button"
              className="btn-primary"
              style={{ width: "100%", marginTop: "6px" }}
              onClick={handleReserveAnother}
            >
              Reserve Another
            </button>
          ) : (
            <button
              key="reserve-now"
              type="submit"
              className="btn-primary"
              style={{ width: "100%", marginTop: "6px", opacity: pending ? 0.7 : 1 }}
              disabled={pending}
            >
              {pending ? "Reserving…" : "Reserve Now"}
            </button>
          )}

          {!showResult ? (
            <span style={{ fontSize: "12.5px", color: "var(--ink-soft)", textAlign: "center" }}>
              You&rsquo;ll see right away whether you&rsquo;re confirmed or pending our review.
            </span>
          ) : (
            <div
              ref={statusRef}
              role="status"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "14px 16px",
                borderRadius: "10px",
                fontSize: "14px",
                lineHeight: 1.5,
                textAlign: "center",
                background:
                  state.status === "confirmed"
                    ? "rgba(56,142,60,0.12)"
                    : state.status === "pending"
                      ? "rgba(201,162,39,0.15)"
                      : "rgba(119,10,10,0.1)",
                color: state.status === "error" ? "#770A0A" : "var(--ink)",
                border:
                  state.status === "error"
                    ? "1px solid rgba(119,10,10,0.3)"
                    : "1px solid rgba(23,36,26,0.12)",
              }}
            >
              <StatusIcon status={state.status} />
              <span>{state.message}</span>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

function SectionLabel({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div
      style={{
        fontSize: "12px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--gold-rich)",
        paddingTop: first ? 0 : "16px",
        marginTop: first ? 0 : "2px",
        borderTop: first ? "none" : "1px solid rgba(23,36,26,0.08)",
      }}
    >
      {children}
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <span style={{ fontSize: "12.5px", color: "#770A0A", display: "block", marginTop: "5px" }}>
      {message}
    </span>
  );
}

function StatusIcon({ status }: { status: BookingFormState["status"] }) {
  if (status === "confirmed") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flex: "none" }}>
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6 10.3l2.4 2.4L14 7.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "pending") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flex: "none" }}>
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 5.5v5l3.2 1.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "error") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flex: "none" }}>
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 6v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="10" cy="13.6" r="1" fill="currentColor" />
      </svg>
    );
  }
  return null;
}
