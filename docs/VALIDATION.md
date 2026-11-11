# Verification record

- `npm run typecheck`: passed.
- `npm test`: all eight tests passed. Seven cover domain/demo behavior and template/legacy compatibility; one executes all SQL migrations in PostgreSQL/PGlite with minimal Supabase Auth/Storage fixtures.
- `npm run build`: Next.js production build passed, including the server API route.
- `npm run demo:build`: portable static demo build passed. Vite reports nonfatal module-directive and bundle-size warnings.
- Browser check: created a new request, switched to a developer, submitted a priced proposal, switched back, selected the developer, simulated funding, switched to the developer, created/uploaded a sample File into IndexedDB through the application upload adapter, submitted delivery, switched to the customer, and approved the simulated transfer. The workspace showed Completed and Transferred to developer.
- Browser checks found and fixed local-HTTP UUID generation. Request search now renders through a stable form subtree so typing does not lose focus.
- Supabase hosted sign-up/email, actual signed Storage transfer, Stripe Checkout/onboarding/webhooks/transfers/refunds, and Vercel production configuration are not verified against real service accounts because credentials/connections have not been supplied.
- Native file-picker automation timed out. The same file persistence path was verified with the demo's sample-deliverable action. Uploaded content was never executed.

This is a deployable beta implementation with a working demo, not a claim that external payment integration or live launch is complete.

## November 11 checks

Coverage now includes $15 request/bid boundaries, all eight templates, acceptance-criteria validation, preservation of existing demo records, SQL backfilling of legacy requests, the expanded category allowlist, approval rejection without acknowledgement, and a successful $15 contract whose repeated transfer recording counts completion once. Hosted Supabase/Stripe integration still requires service credentials.
