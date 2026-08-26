# MarcoKitchen — Project Constitution

**Principles:** Simple, working software over impressive software. Optimize for a diner filling out a reservation form on a phone, not for architectural elegance. Every dependency and abstraction must justify itself against that single job.

**Constraints:** Next.js + a database for storing reservations — nothing else. No admin dashboard (query the DB directly if needed), no payments, no login/auth system, no unnecessary services or accounts.

**Definition of done:** Landing page renders the restaurant's info and a reservation form; submitted reservations persist to the database; the site is deployed and reachable at a live URL; a fresh visitor can complete a reservation end-to-end without errors.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
