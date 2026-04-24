import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FbceTier = 1 | 2 | 3 | 4 | 5;

const TIER_META: Record<FbceTier, { label: string; group: 'Emerging' | 'Advanced'; color: string; description: string }> = {
  1: { label: 'Tier 1 · Emerging', group: 'Emerging', color: '#9CA3AF', description: 'Getting started — early signals of local Bitcoin use.' },
  2: { label: 'Tier 2 · Emerging', group: 'Emerging', color: '#F59E0B', description: 'Growing presence — communication and education underway.' },
  3: { label: 'Tier 3 · Advanced', group: 'Advanced', color: '#10B981', description: 'Organization established with active merchant onboarding.' },
  4: { label: 'Tier 4 · Advanced', group: 'Advanced', color: '#3B82F6', description: 'Lead organization with official staff and BTC unit of account.' },
  5: { label: 'Tier 5 · Advanced', group: 'Advanced', color: '#F7931A', description: 'Fully realized circular economy.' },
};

export const TIER_CHECKLIST: Record<FbceTier, string[]> = {
  1: ['Lead Bitcoiner(s) identified', 'Jurisdiction of focus identified', 'Evidence BTC used locally as money'],
  2: ['Has communication accounts', 'Conducting local education / outreach'],
  3: ['Lead organization established', 'Actively onboarding merchants', 'Has financial infrastructure'],
  4: ['Lead organization has official staff', 'Using BTC as unit of account'],
  5: ['All above achieved', 'Fully advanced circular economy'],
};

export const getTierMeta = (tier: number | null | undefined) => {
  if (!tier || tier < 1 || tier > 5) return null;
  return TIER_META[tier as FbceTier];
};

interface TierBadgeProps {
  tier: number | null | undefined;
  verified?: boolean;
  size?: 'sm' | 'md';
  showSelfReported?: boolean;
  className?: string;
}

export const TierBadge = ({ tier, verified = false, size = 'sm', showSelfReported = true, className }: TierBadgeProps) => {
  const meta = getTierMeta(tier);
  if (!meta) return null;

  const sizeCls = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <div className={cn('inline-flex flex-col items-start gap-0.5', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-mono font-semibold uppercase tracking-wider border',
          sizeCls,
        )}
        style={{
          color: meta.color,
          borderColor: `${meta.color}55`,
          backgroundColor: `${meta.color}1A`,
        }}
      >
        {meta.label}
        {verified && <Check className="h-3 w-3" aria-label="Verified" />}
      </span>
      {!verified && showSelfReported && (
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Self-reported</span>
      )}
    </div>
  );
};

export default TierBadge;
