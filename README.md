# Forge

**Custom software, commissioned.** A peer-to-peer marketplace for small technical jobs: smart-home routines, AI workflows, Discord bots, script fixes, mods, and plugins. Designed around $15–$100 requests, with larger jobs welcome.

## Run

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without Supabase settings, the app runs a clearly labeled browser demo. Use the account switcher to complete both sides of a commission. Changes persist in your browser; the dashboard offers a reset.

Try the Python CSV fix request as Aayan, select Maya, simulate funding, switch to Maya, upload a deliverable, submit for review, then switch back, check the completion criteria, and approve or request revisions. For dispute review, report an issue before approval and switch to the administrator.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth/Storage, Stripe test Checkout and Connect. Vercel-ready. A separate Vite build packages the portable demo for static hosting; it does not replace the full Next.js backend.

## Checks

```sh
npm run typecheck
npm test
npm run build
npm run demo:build
```

Database tests execute the migrations in embedded PostgreSQL (PGlite) with minimal Auth/Storage schema fixtures. They verify RLS, private files, guarded transitions, event deduplication, and financial-operation locks. They do not replace actual hosted Supabase/Stripe sandbox integration tests.

## Documentation

- [Setup, environment variables, deployment, and operations](docs/SETUP.md)
- [Payment flow, Stripe research, and live-launch boundaries](docs/PAYMENTS.md)
- [Delivered scope and collected questions](docs/HANDOFF.md)

**Live payments are disabled in code.** The delayed-transfer arrangement is a test implementation, not legal escrow, and still requires Stripe/provider and legal review before live launch. No uploaded code is executed and no automated royalties are implemented.

Use **Post a request** to start from one of eight editable templates or write a blank brief. Each new request includes testable completion criteria. Apply migration `004_micro_tasks.sql` when upgrading an existing Supabase project.
