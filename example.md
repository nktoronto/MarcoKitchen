# "Marco's Kitchen" — Capstone (All Five Courses, One Live Build)

## What this session is actually teaching

Every course we did: prompting, skills & connectors, agentic coding, spec-driven development, loop engineering, has one thing in common: **you never had to become a programmer to use any of them.** The capstone is where that gets proven under real pressure: a database, a schema, an API route, a live deployment — real engineering concepts — built entirely by asking well, not by knowing.

**The one house rule for the whole session:** any time Claude is about to do something technical you don't understand, you don't let it build. You ask Claude to explain it first, in plain English, before it proceeds. That's not a workaround for not knowing the material — it _is_ the material. This doc gives you that exact prompt, reused at every technical step:

> Before you do that, explain in plain English what you're about to create and why — assume I know nothing about [databases / APIs / deployment], no jargon. Then go ahead.

Use it whenever a step below feels technical. Claude does the work either way; the only difference is whether you understood what just happened.

**Second house rule: set each account up only when it's actually needed, not all at once (GitHub, Neon, Vercel).** GitHub exists from minute one, because everything else lives inside that repo. Neon shows up right before the database gets built. Vercel shows up right before the deploy. Nobody sits through a wall of account creation before there's any reason for it.

**Third house rule: build in chunks, not one continuous pass.** The spec is one client ask, so there's one Specify and one Clarify — but the _build_ still splits into two visible stages: the static page first, the database-backed booking second. That means students watch something real and working before the harder technical layer gets added, instead of one long implement phase with nothing to look at until the very end.

## The client

Marco runs a small restaurant that also takes reservations for parties and events. Right now it's all by phone: no way to book online, no advance notice for the kitchen, and a big party booking can sit unnoticed in his messages for hours before anyone checks whether the kitchen can actually handle it.

## The client card (raw, deliberately ambiguous)

> **Marco's Kitchen.** People keep calling to book tables and I can't always answer. I want a page for the restaurant where people can see the menu highlights and book a table themselves. Big groups need me to personally check we can handle it, but small tables should just be able to book without waiting on me.

## What we're building

**One landing page** (menu highlights, catering blurb, hours, one clear "Book a Table" section) with a **real reservation form** backed by a **real database**, deployed to a **real public URL**. Not a full ordering system, not payments, not an admin dashboard. Small and real beats big and fake.

---

## Timing (rough shape)

| Phase | What happens                                                 | Course it covers                     |
| ----- | ------------------------------------------------------------ | ------------------------------------ |
| 0     | Set up the repo (GitHub)                                     | — infrastructure                     |
| 1     | Constitution                                                 | SDD                                  |
| 2     | Specify                                                      | SDD                                  |
| 3     | Clarify                                                      | SDD                                  |
| 4     | Say the whole flow back in plain English                     | Prompt Engineering                   |
| 5     | Install a design skill from skills.sh                        | Skills & Connectors                  |
| 6     | Build chunk 1 — the static page                              | Agentic Coding                       |
| 7     | Set up the database connection (Neon + `.env`)               | — infrastructure                     |
| 8     | Build the database — schema explained in plain English first | Skills & Connectors                  |
| 9     | Build chunk 2 — wire the booking form to it                  | Skills & Connectors + Agentic Coding |
| 10    | Set up hosting (Vercel + GitHub connection)                  | — infrastructure                     |
| 11    | Deploy                                                       | Skills & Connectors                  |
| 12    | Name the free trigger loop already running                   | Loop Engineering                     |
| 13    | Build "Tonight's Table List" (schedule)                      | Loop Engineering                     |
| 14    | Build "Large Party Alert" (trigger)                          | Loop Engineering                     |

---

## Phase 0 — Set up the repo

`gh repo create marcos-kitchen --public --clone` (or the GitHub website — **New repository** → name it → **Create**). That's it — this is the only account that needs to exist before anything else starts, because `CLAUDE.md` and `spec.md` need somewhere to live.

## Phase 1 — Constitution

> Draft a `CLAUDE.md` constitution for a small Next.js project: a restaurant landing page with a table-reservation form, backed by a database, deployed live. Structure it with **Principles**, **Constraints**, and **Definition of done** — 6-8 lines, no more. Constraints: keep the stack as simple as the job needs — no admin dashboard, no payments, no login system. Don't write any code yet.

## Phase 2 — Specify

> Here is a client brief, word for word: "Marco's Kitchen. People keep calling to book tables and I can't always answer. I want a page for the restaurant where people can see the menu highlights and book a table themselves. Big groups need me to personally check we can handle it, but small tables should just be able to book without waiting on me." Using this and our constitution, draft `spec.md` for a single landing page — not a multi-page site. Include: goal, user scenarios, functional requirements, edge cases & rules, out-of-scope (state explicitly that this is one page, no separate menu/about/contact pages), and acceptance criteria. Describe behaviour only, no code yet.

## Phase 3 — Clarify (do not rush this)

> Before we build anything, interview me about this spec, one question at a time — ambiguities, missing edge cases, unstated assumptions — until there's nothing left to misread. Don't write any code yet.

Expect questions like: what exact party size counts as "big" and needs Marco's personal check? What does a small-table visitor actually see the moment they submit — instantly booked, or "pending"? What happens if someone tries to book a time slot that's already full? This is the same "looks clear until you build it" lesson from every earlier example today, just about a booking flow instead of pricing.

## Phase 4 — Say the whole flow back in plain English

> Now that spec.md is settled, explain the whole system back to me in plain English, start to finish — what a visitor actually does, what happens the instant they submit, and what happens later on its own, with no jargon.

The answer should land close to: _a visitor fills out the form → the data is saved to the database → a small party is confirmed right away, a large party is marked pending → separately, if a reservation crosses the large-party threshold, Marco gets an email the instant it happens, and every night the staff get an email listing tomorrow's confirmed tables._ If what comes back doesn't match that in plain terms, that's a sign the spec still has a gap — go back to Phase 3, don't push forward on a fuzzy answer.

## Phase 5 — Install a design skill

> Search skills.sh for a landing-page or marketing-site design skill and install it with the `skills` CLI. Then, before you build anything, tell me in plain English what that skill will change about how you design this page versus not having it.

## Phase 6 — Build chunk 1: the static page

> Based on spec.md, build just the static half first: the menu highlights, catering blurb, hours, and a "Book a Table" section as a visible placeholder — no working form yet, no database, that's next. Propose the plan first; I'll review before you implement.

`Shift+Tab` into **plan mode** here — read-only until you say go, straight from the Agentic Coding crash course. Name it out loud the first time it actually happens today.

**This is the first real checkpoint of the day.** Stop and actually look at the page before moving on: does it match spec.md's content requirements? Does the design skill's influence actually show, versus what generic styling would have looked like? Nothing database-related exists yet, and that's the point — something real and working, before the harder layer gets added.

## Phase 7 — Set up the database connection

Now, not before — the booking half is next, so this is the moment Neon needs to exist:

1. Go to `neon.tech`, sign in, and create a new project (e.g., `marcos-kitchen`).
2. On the project dashboard, find **Connection string** (sometimes under **Connection Details**) and copy it.
3. In your local project folder, create a file named `.env` and paste it in as `DATABASE_URL=...`.
4. **Make sure `.env` is in `.gitignore`.** This string is a secret — it should never be committed to GitHub.

## Phase 8 — Build the database (explain-first, every time)

> I don't know anything about databases or Neon. Before you create anything, explain to me simply: what is a schema, and what table (or tables) are you about to create for this project, and why those columns specifically? No technical jargon. Once I understand it, go ahead and create it in Neon using the connection string in `.env`.

Expect Claude to land on something close to one `reservations` table: name, phone, party size, date/time, notes, and a status (`confirmed` or `pending`). That status column is what makes Phase 14 possible later — say so out loud when it appears.

## Phase 9 — Build chunk 2: wire the booking form

> Now build the second half of spec.md: turn the placeholder "Book a Table" section into a real form that writes to that table. Small parties (explain what threshold you'd suggest and why) get `confirmed` automatically; large parties get `pending`, with copy telling them Marco's team will confirm shortly. Explain in plain English what "connecting the form" actually means before you do it. Propose the plan for this piece, then implement it in small steps, checking each against spec.md before the next.

Same plan-then-build discipline as Phase 6, just for the piece that actually needed the database to exist first.

## Phase 10 — Set up hosting

The build is done — now, not before, the deploy target needs to exist:

1. Go to `vercel.com`, sign in, and connect your GitHub account if it isn't already.
2. Click **Add New… → Project**, and import `marcos-kitchen`.
3. On the Vercel project → **Settings → Environment Variables**, add the same `DATABASE_URL` from your local `.env`. A local `.env` file only works on your machine — the deployed site needs its own copy of the same value, or Phase 11's live site won't be able to reach the database at all.

## Phase 11 — Deploy

> Deploy this to Vercel and give me the live URL.

## Phase 12 — The loop that's already running

_"The moment we connected this repo to Vercel, every push to `main` now auto-deploys. That's a real, live, event-driven trigger loop — we didn't write a line of workflow config for it."_ Turn on Vercel's preview deployments for pull requests too — every proposed change gets its own live preview link before it reaches production, which is the exact maker-proposes, human-checks-the-preview, human-merges discipline from Request Watch and Request Doorbell, just running through Vercel's own product instead of a hand-built Action.

## Phase 13 — "Tonight's Table List" (schedule)

> `/schedule every evening at 8pm, read tomorrow's reservations from the database, then as a separate subagent step, double-check the party-size and time totals actually match the raw rows before sending anything, then send staff a clear list: who's coming, what time, how many. Never guess a number — re-derive it from the actual rows.`

Same maker-checker shape as Request Watch: a claim only ships once a **subagent** — a second, independent pass, not the one that wrote the draft — has re-verified it against the source data. That's the Agentic Coding crash course's subagent pattern, doing real work here instead of just parallel research.

## Phase 14 — "Large Party Alert" (trigger)

> Set up a trigger that fires the instant a new reservation is written with status "pending". As a separate subagent step, re-confirm from the database row that it really does cross the large-party threshold before sending anything. If it checks out, alert Marco directly through [email]. Never auto-confirm the reservation yourself — that decision stays with Marco.

The database row is doing the same job the labeled GitHub issue did in Request Doorbell — it's just real data this time, not a simulated one.

## Gotchas

- **The explain-first prompt is not optional decoration.** If you skip it to save time, you've quietly turned this back into "watch Claude do database stuff," which is exactly the thing this capstone is supposed to not be.
- **`pending` vs `confirmed` is the whole reason the trigger loop matters.** If every reservation just auto-confirms, Phase 14 has nothing real to react to.
- **The `.env` value has to exist in two places.** Local `.env` for building (Phase 7); Vercel's Environment Variables for the deployed site to actually work (Phase 10). Forgetting the second one is the single most common way this breaks after looking fine locally.
- **Don't skip actually looking at chunk 1.** Phase 6's whole purpose is a visible checkpoint — if it's rushed through with no one actually looking at the page, the chunking bought nothing.
- **A live URL is the actual prize.** We produced a live link students can put in a portfolio today.

## Resume line

> "Designed and deployed a live restaurant reservation system — spec-driven requirements, a marketplace design skill, a Postgres-backed booking flow, and real-time and scheduled operational alerts verified by an independent subagent checker — built entirely through effective delegation to an AI agent, without writing the underlying code by hand."
