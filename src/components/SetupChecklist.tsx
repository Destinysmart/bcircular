import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  communityId: string;
  community: any;
}

interface Step {
  key: string;
  label: string;
  done: boolean;
  href: string;
  cta: string;
}

/**
 * 7-step guided setup checklist for new economy admins.
 * Computes completion live from existing data — no manual flag flips needed.
 * Disappears once all 7 steps complete.
 */
export default function SetupChecklist({ communityId, community }: Props) {
  const { data: counts } = useQuery({
    queryKey: ['setup-checklist', communityId],
    queryFn: async () => {
      const [merchants, earners, validators, wallets, approvedSubs] = await Promise.all([
        supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('community_id', communityId).eq('status', 'approved'),
        supabase.from('earners').select('id', { count: 'exact', head: true }).eq('community_id', communityId).eq('status', 'approved'),
        supabase.from('validators').select('id', { count: 'exact', head: true }).eq('community_id', communityId),
        supabase.from('wallets').select('id', { count: 'exact', head: true }).eq('community_id', communityId),
        supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('community_id', communityId).eq('status', 'approved'),
      ]);
      return {
        merchantCount: merchants.count || 0,
        earnerCount: earners.count || 0,
        validatorCount: validators.count || 0,
        walletCount: wallets.count || 0,
        approvedCount: approvedSubs.count || 0,
      };
    },
    enabled: !!communityId,
  });

  if (!counts) return null;

  const steps: Step[] = [
    {
      key: 'registered',
      label: 'Economy registered',
      done: true,
      href: `/dashboard/economy/${communityId}`,
      cta: 'Done',
    },
    {
      key: 'logo',
      label: 'Upload logo and banner',
      done: !!(community?.logo_url && community?.banner_url),
      href: `/dashboard/economy/${communityId}#branding`,
      cta: 'Add branding →',
    },
    {
      key: 'btcmap',
      label: 'Set BTCMap community ID and sync',
      done: !!(community?.btcmap_area_id && community?.btcmap_last_synced),
      href: `/dashboard/economy/${communityId}#btcmap`,
      cta: 'Sync BTCMap →',
    },
    {
      key: 'earners',
      label: 'Add at least 5 earners',
      done: counts.earnerCount >= 5,
      href: `/c/${community?.slug}/join-as-earner`,
      cta: `Add earners (${counts.earnerCount}/5) →`,
    },
    {
      key: 'validators',
      label: 'Appoint 2 validators',
      done: counts.validatorCount >= 2,
      href: `/dashboard/economy/${communityId}#validators`,
      cta: `Add validators (${counts.validatorCount}/2) →`,
    },
    {
      key: 'wallet',
      label: 'Connect first Blink wallet',
      done: counts.walletCount >= 1,
      href: `/dashboard/economy/${communityId}#wallet`,
      cta: 'Connect wallet →',
    },
    {
      key: 'validated',
      label: 'Get first submission validated',
      done: counts.approvedCount >= 1,
      href: `/c/${community?.slug}/submit`,
      cta: 'Get a submission →',
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount >= steps.length) return null;

  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <section className="rounded-xl border border-score-amber/30 bg-card p-6 mb-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Complete your economy profile</h2>
        <span className="font-mono text-xs text-muted-foreground">{doneCount} of {steps.length} steps complete</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">A complete profile drives discovery, trust, and a higher circularity score.</p>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-5">
        <div className="h-full bg-score-amber transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <ul className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              {s.done ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-score-green/20 text-score-green">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground text-xs font-mono">
                  {i + 1}
                </span>
              )}
              <span className={`text-sm truncate ${s.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{s.label}</span>
            </div>
            {!s.done && (
              <Link to={s.href} className="text-xs text-score-amber hover:underline shrink-0 font-medium">
                {s.cta}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
