# Approval Notifications: Email + In-App

When a super admin flips an economy from **pending → active**, the economy admin should immediately:
1. See an in-app alert ("Your economy is live")
2. Receive a branded email confirming approval, with a link to their dashboard

## Prerequisite — Email domain setup

The project does not yet have an email sender domain configured. Branded emails from `bitcoincircular.com` (or a chosen subdomain like `notify.bitcoincircular.com`) require this one-time setup before any code can send mail.

Please run the email domain setup so I can wire transactional emails. Until then, only the in-app alert can be delivered.

<lov-actions>
<lov-open-email-setup>Set up email domain</lov-open-email-setup>
</lov-actions>

## What gets built

### 1. In-app alert (immediate, no prerequisites)
- Reuse the existing `economy_alerts` table and `EconomyAlerts` component already shown on the economy admin dashboard.
- A new database trigger on `communities` fires when `status` transitions from `pending` to `active` and inserts an alert row:
  - `alert_type = 'economy_approved'`
  - `message = 'Your economy is live — start onboarding validators and merchants.'`
  - `action_url = '/dashboard/economy/<id>'`
- The pending-approval screen on `/dashboard` (the "your economy is pending" card we just added) already polls via React Query, so it will auto-redirect to the full dashboard the moment status flips.

### 2. Approval email (after domain is verified)
- Scaffold Lovable's transactional email infrastructure (queue, send function, suppression handling, unsubscribe page).
- Add one React Email template `economy-approved.tsx`:
  - Subject: "Your Bitcoin economy is live on BCE"
  - Body: economy name, congratulations, what to do next (appoint validators, sync BTCMap, connect Blink), CTA button → `https://bitcoincircular.com/dashboard/economy/<id>`
  - Brand styling: white body, amber `#F7931A` CTA, Plus Jakarta Sans-style fallback.
- Trigger:
  - The trigger lives in `SuperAdminDashboard.handleCommunityAction` — right after the successful update to `status = 'active'`, invoke `send-transactional-email` with:
    - `templateName: 'economy-approved'`
    - `recipientEmail: community.contact_email`
    - `idempotencyKey: 'economy-approved-<community.id>'`
    - `templateData: { economyName, dashboardUrl }`
  - If `contact_email` is missing on a community, the email step is skipped (in-app alert still fires).

### 3. Pending screen polish
- Make the existing `MyDashboardRedirect` pending card poll every 30s so the user sees the transition without manual refresh.

## Technical Details

**Database migration**
- Trigger function `notify_economy_activated()` on `communities` AFTER UPDATE, fires when `OLD.status = 'pending' AND NEW.status = 'active'`. Inserts into `economy_alerts` with a unique `alert_key = 'economy_approved'` to avoid duplicates if status flips twice.

**Files added**
- `supabase/functions/_shared/transactional-email-templates/economy-approved.tsx`
- Updated `registry.ts`

**Files edited**
- `src/pages/SuperAdminDashboard.tsx` — invoke `send-transactional-email` after successful approval
- `src/pages/MyDashboardRedirect.tsx` — add `refetchInterval: 30_000` while pending

**No schema changes** to `communities` or `economy_alerts` — both already have the columns we need.

## Sequencing

1. You set up the email domain (button above).
2. I run the DB migration for the auto-alert trigger.
3. I scaffold transactional email infra + the `economy-approved` template.
4. I wire the send call into the super-admin approval action.
5. I add polling to the pending dashboard screen.

If you'd rather ship the in-app alert today and add email later, say so and I'll do steps 2 + 5 only.
