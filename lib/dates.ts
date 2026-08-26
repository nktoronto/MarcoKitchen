// Eastern-time "today" as {year, month, day}, using Intl (handles DST
// correctly) rather than string-parsing tricks.
function getEasternDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

// "Tomorrow" as a YYYY-MM-DD string. Anchored at UTC noon before adding a
// day so the arithmetic never lands on a DST-crossing midnight edge case.
export function tomorrowDateString(): string {
  const { year, month, day } = getEasternDateParts(new Date());
  const todayNoonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  const tomorrowNoonUtc = new Date(todayNoonUtc.getTime() + 24 * 60 * 60 * 1000);
  const y = tomorrowNoonUtc.getUTCFullYear();
  const m = String(tomorrowNoonUtc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tomorrowNoonUtc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// The restaurant's current wall-clock date/time in Eastern time, as plain
// zero-padded strings — comparing these lexicographically against a
// reservation's own "YYYY-MM-DD" / "HH:MM" is equivalent to comparing them
// chronologically, without ever converting to an absolute UTC instant
// (which is where DST-offset bugs tend to creep in).
export function currentEasternDateTimeParts(): { date: string; time: string } {
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { date: dateFormatter.format(now), time: timeFormatter.format(now) };
}

// True if a reservation's date/time is strictly in the past, compared as
// Eastern wall-clock strings (minute precision — plenty for a daily job).
export function isPastEastern(reservationDate: string, reservationTime: string): boolean {
  const { date: nowDate, time: nowTime } = currentEasternDateTimeParts();
  if (reservationDate !== nowDate) return reservationDate < nowDate;
  return reservationTime.slice(0, 5) < nowTime;
}
