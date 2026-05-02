## Goal

Extend the existing merchant flow (manual submission → admin approval) with an anonymous, wallet-based tracking layer. No KYC, no names beyond what's already collected. After approval, a merchant gets a public anonymous ID, a private claim token, can link a Blink wallet, and gets a dashboard with auto-tracked transactions and circularity metrics.

The existing "Add Merchant" page (`SubmitPage.tsx`), admin approval flow (`EconomyAdminDashboard.tsx`), BTCMap sync, Blink economy-level sync, and validator system are all preserved unchanged.

## What changes

### 1. Database (migration)

Extend `merchants` and add two new tables:

- **`merchants`** — add columns:
  - `public_merchant_id text unique` — short opaque slug (e.g. `mch_a1b2c3d4`), generated on approval
  - `claim_token_hash text` — SHA-256 hash of the one-time claim token (raw token shown to admin once, never stored)
  - `claimed_at timestamptz` — set when merchant links a wallet
  - `wallet_id uuid` — FK to `wallets.id` (nullable, set on link)

- **`merchant_invoices`** (optional Lightning invoices)
  - `id`, `merchant_id`, `amount_sats`, `memo`, `payment_request`, `status` (pending/paid/expired), `paid_at`, `blink_tx_id`, `created_at`

- **Trigger / function** `assign_merchant_public_id()`:
  - On `UPDATE` of `merchants` when `status` transitions to `approved` and `public_merchant_id` is null, generate one.

- **View** `merchant_metrics` (security_invoker, public read):
  - Joins `merchants` → `wallets` → `blink_transactions`
  - Exposes only: `public_merchant_id`, `inflow_sats`, `outflow_sats`, `internal_sats`, `tx_count`, `circularity_score` (= internal / total), `last_tx_at`
  - Never exposes `wallet_id`, `blink_wallet_id`, user_id, or amounts per individual tx beyond aggregates

- **RLS**:
  - `merchants.claim_token_hash` — restricted to economy admins / super admins via column-level policy (or moved to a side table `merchant_claim_tokens` admin-only)
  - `merchants.wallet_id` — readable publicly (just an opaque UUID), writable only by the merchant claiming it (validated via token, see below)
  - `merchant_invoices` — public read of `amount_sats`, `status`, `paid_at`; service-role only insert/update

### 2. Edge functions

- **`generate-merchant-token`** (admin only)
  - Input: `merchant_id`
  - Caller must be economy admin / super admin
  - Generates a random 32-byte token, stores SHA-256 hash on the merchant row, returns the raw token **once** for the admin to share with the merchant out-of-band
  - Idempotent (rotates if called again, invalidating prior token)

- **`claim-merchant`** (public, no JWT required — token is the auth)
  - Input: `public_merchant_id`, `claim_token`, `blink_wallet_id`
  - Verifies `sha256(claim_token) == claim_token_hash` and merchant is `approved`
  - Looks up the economy's `blink_api_keys`, calls Blink GraphQL to confirm the wallet exists in the economy's connected Blink account
  - Inserts a row in `wallets` (uses the economy admin's `user_id` so existing RLS still works, mirrors current auto-registration pattern in `sync-blink-transactions`)
  - Sets `merchants.wallet_id`, `merchants.claimed_at`, clears `claim_token_hash` (single-use)
  - Triggers an immediate `sync-blink-transactions` call

- **`generate-merchant-invoice`** (optional, behind a flag)
  - Input: `public_merchant_id`, `amount_sats`, `memo`
  - Looks up merchant → wallet → economy Blink key
  - Calls Blink `lnInvoiceCreate` mutation, stores row in `merchant_invoices`, returns BOLT11
  - Subsequent `sync-blink-transactions` already imports the resulting tx; a small post-sync step matches `payment_hash` → invoice → marks paid

- **`sync-blink-transactions`** — extend slightly:
  - When upserting a `blink_transaction`, if its `wallet_id` matches a merchant's `wallet_id`, no extra column is needed — the merchant link is derived via join. (Keeps the existing schema clean.)

### 3. Admin UI changes (`EconomyAdminDashboard.tsx`)

In the merchants section, for each `approved` merchant add:
- Badge showing `public_merchant_id` and "Wallet linked" / "Not linked"
- "Generate claim link" button → calls `generate-merchant-token`, shows a modal with the one-time claim URL (`/merchant/claim/<public_id>?token=<raw>`) and a copy button. Warning: shown only once.
- "Rotate token" if already generated but unclaimed
- "Unlink wallet" (admin override)

No changes to the approval flow itself. Token generation is a separate, post-approval action.

### 4. New public pages

- **`/merchant/claim/:publicId`** — `MerchantClaim.tsx`
  - Reads `?token=` from URL
  - Form: paste Blink wallet ID (with help text + link to Blink app)
  - Calls `claim-merchant`; on success redirects to the merchant dashboard with the token stored in `localStorage` under `merchant_token_<publicId>` (acts as a long-lived bearer for the dashboard)
  - On the JS side the token is also kept in URL hash for first-load resilience

- **`/m/:publicId`** — `MerchantDashboard.tsx`
  - Public read of aggregate metrics from `merchant_metrics` view (no token needed)
  - If `localStorage` has the merchant token, also shows "private" controls:
    - Unlink wallet
    - Generate Lightning invoice (if enabled)
    - Recent invoices list
  - Sections:
    - Header: anonymous ID, wallet status pill
    - Stats cards: Inflow, Outflow, Internal (circular), Circularity %, Tx count
    - Recent transactions: last 20 from `blink_transactions` joined via `wallet_id` (only direction, amount, timestamp, internal flag — no counterparty IDs publicly)
    - Mobile-first layout reusing existing `StatCard`, `Card`, `Badge` components

### 5. Comparison tool

`src/lib/api.ts` `fetchAllCommunitiesWithStats` and `fetchComparisonDetails`: add a per-economy `linkedMerchants` count and aggregate `merchantInflowSats` / `merchantInternalSats` from `merchant_metrics`. `Compare.tsx` gets one new column "Linked merchants" and the existing circularity bar uses the merchant-level data when available (falls back to current logic).

### 6. Security

- Claim tokens never stored in plaintext — only SHA-256 hash
- Edge functions validate caller (admin) for token generation; claim function validates token without requiring auth
- `blink_api_keys` access remains service-role only — claim and invoice functions read it server-side
- No personal info added to any table
- Per-merchant token is single-use for claiming; for ongoing dashboard auth we use the same token as a localStorage bearer — documented in UI as "keep this link safe, it's the only way to manage this merchant"

### 7. Files

**New:**
- `supabase/migrations/<ts>_merchant_tracking.sql`
- `supabase/functions/generate-merchant-token/index.ts`
- `supabase/functions/claim-merchant/index.ts`
- `supabase/functions/generate-merchant-invoice/index.ts`
- `src/pages/MerchantClaim.tsx`
- `src/pages/MerchantDashboard.tsx`
- `src/lib/merchantApi.ts` (token storage, metric queries, invoice helpers)

**Edited:**
- `src/App.tsx` — add 2 routes
- `src/pages/EconomyAdminDashboard.tsx` — claim-token UI per merchant
- `src/lib/api.ts` — extend comparison fetchers
- `src/pages/Compare.tsx` — surface linked-merchant column

### Out of scope / unchanged

- `SubmitPage.tsx` (Add Merchant form) — untouched
- Existing approval workflow — untouched
- Validator voting — untouched
- BTCMap sync — untouched
- Economy-level Blink wallet settings — untouched (this builds on top)

## Open question

The optional Lightning invoice generator (item 9) requires the economy's Blink API key to have **send/invoice** scope, not the read-only scope currently documented. If you want this enabled, admins will need to provide a key with invoice creation rights — otherwise we'll ship the dashboard + tracking without the invoice button and add it later.