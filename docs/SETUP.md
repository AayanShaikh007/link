# Setup and operation

## Modes

- **Browser demo:** No credentials. Projects, proposals, profiles, messages, and simulated payments persist in localStorage. Files persist as blobs in IndexedDB in the same browser. The role switcher is a demo device, not authentication. Reset restores sample records; unused old blobs can be removed by clearing site data.
- **Connected beta:** Both public Supabase variables enable real Supabase Auth and PostgreSQL. All mutations go through authenticated Next.js API handlers, with RLS and guarded database functions. Stripe integrations are test-only. No role switcher is available.
- **Hosted preview:** `npm run demo:build` produces an explicitly simulated static demo. The full Next.js backend is deployed separately to Vercel; static hosting does not run the API.

## Local development

Node 22+ recommended. Run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`. Open http://localhost:3000. Leave public Supabase variables empty for the demo. Do not mix production keys with the sandbox.

Commands: `npm test`, `npm run typecheck`, `npm run build`, `npm run start`, `npm run demo:build`.

## Supabase

1. Create a sandbox project. Apply all SQL files in `supabase/migrations` in numerical order (including `004_micro_tasks.sql`) using the SQL editor or Supabase CLI. The migration creates a private `project-files` bucket with a 10 MB limit.
2. Enable email/password sign-in. Set the Auth Site URL and allowed redirect origins to the development/production origins. Configure email confirmation and SMTP for deliverability. Signup works without SMTP using Supabase's sandbox limits, but verify confirmation mail delivery before inviting users.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service-role key in a public variable.
4. Optional: set `SEED_CONFIRM=sandbox-only` and a unique `SEED_PASSWORD` of at least 12 characters in `.env.local`, then run `npm run seed`. It creates sandbox-only sample users and projects. Re-running preserves existing projects and workflow states. It does not create real transactions or fake completed-project counts.
5. Seeded emails: `customer@forge-example.test`, `developer@forge-example.test`, `alex@forge-example.test`, `sam@forge-example.test`, and `admin@forge-example.test`. Use the configured sandbox password. No password is committed or printed.
6. To authorize a real operator, insert their Supabase Auth UUID into `public.admins` using an administrator database session. Never provide a client path to this table.

## Stripe sandbox

1. Enable Connect in a Stripe test environment. Configure a Canadian platform for the current CAD/Canada beta assumptions.
2. Set `STRIPE_SECRET_KEY=sk_test_...`. The code rejects live secret keys. No publishable key is required because payment entry happens on hosted Checkout.
3. Set `APP_URL` to the exact origin (e.g. `http://localhost:3000` or `https://your-app.vercel.app`). Do not include a path or hash.
4. Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook`. Put the returned signing secret in `STRIPE_WEBHOOK_SECRET`. On Vercel register that endpoint and signing secret in Stripe instead.
5. Subscribe to `checkout.session.completed`. This beta explicitly permits only cards, not asynchronous bank debits. The webhook validates the signature, test mode, CAD currency, session identity, and paid amount before the funding transition. The redirect alone never marks a project funded.
6. As a developer, use Dashboard → Set up Stripe test payouts and finish hosted Connect onboarding with Stripe sandbox details. As a customer, select a proposal, open the workspace, and fund using Stripe's documented test card 4242 4242 4242 4242, a future expiration, and any valid test CVC/postal code.
7. Refresh the workspace after webhook delivery. As the developer, upload files and submit for review. As the customer, approve. A test transfer is initiated; the app does not claim that a bank payout has completed.
8. If onboarding/transfer fails, the project stays approved with a retry action. If an administrator-approved transfer needs retrying, the customer can use the same workspace action. Review Stripe logs for persistent errors.

## Vercel

Import the GitHub repository into Vercel as a Next.js project. Use default build command `npm run build` and the root directory. Add the environment variables in Vercel's encrypted settings. Deploy, then set the resulting origin as `APP_URL`, update Supabase redirects and Stripe webhook URL, and redeploy. Do not configure the static `dist` demo as the full Next.js output.

Uploads go directly to Supabase with short-lived signed upload tokens, so 10 MB files do not pass through Vercel's function request body limit. The API records metadata only after checking that the uploaded object exists. All file URLs are private and download links expire in 60 seconds.

## Operating the beta

- Check the admin dashboard for open reviews. Read the workspace, private messages, and delivered files. Record a review rationale. Resume work, approve a delivery, or initiate a full pre-transfer refund in test mode.
- Once refund execution starts, the database blocks changing that review to a transfer. Retry the same refund after a transient failure. Do not manually resume it while an external refund may be pending.
- Payment recovery checks Stripe for an existing project transfer/refund before creating another. Stable idempotency keys and database event IDs cover retries. Do not manually create additional payments for the same project.
- Application disputes are distinct from card-network disputes. Chargeback/late-refund reconciliation, monitoring, and procedures remain a live-launch requirement.
- Attachments are private until a developer is selected. Public briefs should carry sufficient non-sensitive detail for bidding.
- Snapshot queries currently cap results at 1,000 rows per table. Add pagination before expanding beyond a small beta.
- No uploaded code is executed. File extension/size controls are implemented; automated malware scanning and content moderation are not.
- Demo state is per-browser. Connected data is shared through Supabase. Messaging refreshes after actions or page reload; realtime notifications are not implemented.

## Before live/public launch

Keep live keys disabled. Complete Stripe's approval of the exact delayed-transfer business model, applicable Canadian legal review, signed IP/licensing/acceptance agreements, privacy policy, refund and inactivity deadlines, fees/taxes, monitoring, rate limits/moderation, email delivery, storage scanning/retention, backup/restore verification, and actual two-account Stripe sandbox testing. See PAYMENTS.md and HANDOFF.md.

## Micro-task upgrade

The updated board supports smart-home setup, AI workflows, Discord/bots, troubleshooting, and the original categories. New requests need explicit completion criteria; suggested budgets run from $15 to $100, while the $10,000 ceiling remains for larger work. Apply migration 004 before deploying the connected app. It preserves existing requests and records a clearly marked legacy criteria reminder instead of inventing customer-agreed requirements. Browser demo records receive the same reminder without deleting their files or payment state. To see the refreshed eight sample tasks in an existing demo session, use the dashboard’s Reset demo action when ready; it replaces demo records.

The request form offers eight editable templates and budget shortcuts. Customers see the criteria in project details, workspaces, and the approval confirmation. Approval requires an explicit acknowledgement through the API and a guarded database transition. This records the customer’s acceptance; it does not independently verify that the software meets the requirements.

A 15% platform fee remains a business hypothesis. This update does not introduce a fee or alter the test-only payment policy.
