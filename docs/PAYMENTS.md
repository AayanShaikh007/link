# Payment design and boundaries

Research checked against Stripe's official documentation on 2026-11-08:

- https://docs.stripe.com/connect/separate-charges-and-transfers
- https://docs.stripe.com/connect/manual-payouts
- https://docs.stripe.com/webhooks

## Chosen test flow

1. Customer accepts a fixed-price proposal. The database locks the selected developer and creates an unpaid payment record at the proposal amount.
2. A server creates a card-only Checkout Session on the platform. Amount/currency come from the database, never the client. A unique transfer group links the commission.
3. A signature-verified `checkout.session.completed` event, with `payment_status=paid`, confirms funding. A database transaction verifies the saved session and amount, records the event ID once, and starts the project.
4. The developer delivers. The customer can request revisions, report an issue, or approve delivery.
5. Approval creates a separate test transfer to the developer's Express connected account with `source_transaction` set to the original charge. The transfer is recorded separately from the customer's payment. Approval persists even when the external transfer is temporarily unavailable, allowing retries.
6. An administrator can refund an internally disputed, funded project before any developer transfer. Transfer/refund operation claims prevent conflicting financial resolutions. Refunding after transfer is deliberately outside the version-one automated workflow.

No real funds have been tested or accepted. All application payment code rejects live secret keys and live webhook events.

## Why this is not escrow

Stripe explicitly states that it does not offer escrow services/accounts. Separate charges and transfers control movement between Stripe balances. They do not, by themselves, establish a regulated escrow or guarantee segregated protection for customers. Stripe's funds segregation feature is a separate private-preview capability; this application does not claim to use it.

Manual payout timing concerns money in a connected account before a bank payout. It is distinct from delaying a platform-to-developer transfer. Stripe currently lists country-dependent manual payout limits (Canada falls under the documented 90-day category); that does not mean this platform automatically has permission to hold customer money for 90 days before transfer. Obtain provider confirmation and legal review of the actual flow, jurisdiction, delivery windows, inactivity policy, reserves, disputes, and consumer representations.

The platform is responsible for processing fees, refunds, and chargebacks under the selected flow. The current beta transfers 100% of the agreed proposal amount and takes zero platform commission. This can leave the platform paying Stripe fees and is a temporary sandbox assumption. No royalty or commissioner revenue distribution is implemented.

## Reliability implemented

- Raw-body signature verification; test-mode and currency checks.
- Transactional funding event deduplication and amount/session reconciliation.
- No funding transition from the return URL.
- Stable Stripe idempotency keys for checkout, account creation, transfers, and refunds.
- Recovery queries for existing transfers/refunds, including after Stripe's idempotency-key retention window.
- Database row locks for selection, delivery/approval, and competing financial decisions.
- Service-role-only financial RPC functions, participant RLS, admin grants stored outside profiles.
- Private signed file URLs; server-side validation; no payment card or bank credentials stored by the app.

## Live-launch gaps

Actual hosted Stripe sandbox and Supabase integration require credentials and must be run before relying on the integration. Bank payouts are not tracked. External dashboard refunds, chargeback events, transfer reversals, failed/refunded charges after transfer, reserve/reconciliation jobs, refund failure recovery procedures, tax handling, automated time limits, and operational alerts require additional implementation and testing before live use. The application does not automatically approve work or release funds after a timer.
