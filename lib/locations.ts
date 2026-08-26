export type LocationHours = {
  days: string;
  time: string;
};

// Machine-checkable opening hours, separate from the display-only `hours`
// above. `day` is 0=Sunday..6=Saturday. Minutes are minutes-since-midnight
// on that same day; `closesAtMinutes` may be 1440 (midnight) to mean "open
// until the end of that day" — e.g. Saturday closing at midnight does NOT
// mean early-Sunday-morning bookings count as Saturday hours; the window
// simply ends exactly at midnight.
export type WeeklyHours = {
  day: number;
  opensAtMinutes: number;
  closesAtMinutes: number;
};

export type Location = {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: LocationHours[];
  weeklyHours: WeeklyHours[];
  capacity: number;
  // Where Marco's SMS alerts/reminders/cancellation notices for this
  // location's bookings are sent. Needed before the reservation backend
  // (Chunk 2) can route alerts.
  alertPhone: string;
};

// Real location data from cafedekhan.ca. Add a new entry here to support
// another branch — nothing else needs to change for that.
export const locations: Location[] = [
  {
    id: "mississauga",
    name: "Mississauga",
    address: "6400 Millcreek Drive, Unit #13, Mississauga, ON L5N 6A3",
    phone: "(905) 817-1881",
    hours: [
      { days: "Sun–Thurs", time: "11:30am–11:00pm" },
      { days: "Fri & Sat", time: "11:30am–12:00am" },
    ],
    weeklyHours: [
      // Sun–Thurs 11:30am–11:00pm
      { day: 0, opensAtMinutes: 690, closesAtMinutes: 1380 },
      { day: 1, opensAtMinutes: 690, closesAtMinutes: 1380 },
      { day: 2, opensAtMinutes: 690, closesAtMinutes: 1380 },
      { day: 3, opensAtMinutes: 690, closesAtMinutes: 1380 },
      { day: 4, opensAtMinutes: 690, closesAtMinutes: 1380 },
      // Fri & Sat 11:30am–12:00am (midnight)
      { day: 5, opensAtMinutes: 690, closesAtMinutes: 1440 },
      { day: 6, opensAtMinutes: 690, closesAtMinutes: 1440 },
    ],
    capacity: 50,
    // Temporary — same number used for both locations for now.
    alertPhone: "(647) 239-6241",
  },
  {
    id: "oakville",
    name: "Oakville",
    address: "2423 Trafalgar Rd, Oakville, ON L6H 6K7",
    phone: "(905) 257-5128",
    hours: [
      { days: "Mon–Fri", time: "11:45am–11:00pm" },
      { days: "Sat", time: "10:00am–12:00am" },
      { days: "Sun", time: "10:00am–11:00pm" },
    ],
    weeklyHours: [
      // Sun 10:00am–11:00pm
      { day: 0, opensAtMinutes: 600, closesAtMinutes: 1380 },
      // Mon–Fri 11:45am–11:00pm
      { day: 1, opensAtMinutes: 705, closesAtMinutes: 1380 },
      { day: 2, opensAtMinutes: 705, closesAtMinutes: 1380 },
      { day: 3, opensAtMinutes: 705, closesAtMinutes: 1380 },
      { day: 4, opensAtMinutes: 705, closesAtMinutes: 1380 },
      { day: 5, opensAtMinutes: 705, closesAtMinutes: 1380 },
      // Sat 10:00am–12:00am (midnight)
      { day: 6, opensAtMinutes: 600, closesAtMinutes: 1440 },
    ],
    capacity: 50,
    // Temporary — same number used for both locations for now.
    alertPhone: "(647) 239-6241",
  },
];

// True if `date` (a Date) at `timeMinutes` (minutes since that day's
// midnight) falls within `location`'s opening hours for that day of week.
export function isWithinHours(
  location: Location,
  date: Date,
  timeMinutes: number
): boolean {
  const day = date.getDay();
  const window = location.weeklyHours.find((w) => w.day === day);
  if (!window) return false;
  return timeMinutes >= window.opensAtMinutes && timeMinutes <= window.closesAtMinutes;
}
