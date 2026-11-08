# Handoff and open decisions

## Delivered scope

Next.js App Router, TypeScript, Tailwind CSS, responsive startup design, landing page, search/filter/sort project board, create request, private proposals and selection, dashboards, profiles and completed builds, project messages, private file upload/download, delivery/revisions/approval, internal disputes and administrator decisions, independent commercial-distribution consent, Supabase schema/RLS/RPC/storage policies, Stripe test Checkout/Connect onboarding/transfers/refunds, deterministic sandbox seed, CI and operating instructions.

The portable hosted demo simulates accounts and payments with browser persistence. The Next.js connected implementation uses Supabase and Stripe test services when configured. These modes are clearly labeled. Hash navigation is used for page sections so the same UI can run on static preview hosting; the API remains ordinary server-side Next.js routes.

## Questions collected for the next pass

1. Connect a sandbox Supabase project and Stripe test Connect account, and authorize deployment to your Vercel project. Enter secrets in service/environment settings, not chat.
2. Is **Forge** an acceptable temporary name, or should the repository's **link** name become the public brand?
3. Is Canada-only onboarding and CAD a good first beta boundary? International onboarding needs country/currency and cross-border review.
4. What should the platform fee be, and who absorbs processing fees? The sandbox currently transfers the entire agreed amount with no commission.
5. What maximum development/review/inactivity periods and refund policy should the customer/developer agreements use? There is no automatic release timer.
6. Who will handle disputes, and which verified account UUIDs should be operators?
7. Should the default IP arrangement be an exclusive customer commission, a developer license, or optional shared commercial rights? Consent flags are intent records, not a legal licensing agreement. No resale storefront or royalties are active.
8. Which category should the first beta focus on: game mods/plugins or general scripts/automations? All listed categories currently work.

## Deliberately deferred

Automated royalties, resale storefront, reviews authored by customers, notification emails/realtime, advanced search/pagination, automated content moderation, malware scanning, chargeback/reversal automation, live payments and final legal agreements. Sample reputation values are labeled demo data. Real profiles start with zero completed projects and no rating.

## Git

Work is committed by milestone. The GitHub repository is https://github.com/AayanShaikh007/link. See GitHub's commit list for the authoritative published history. No environment secrets or generated build output are committed.
