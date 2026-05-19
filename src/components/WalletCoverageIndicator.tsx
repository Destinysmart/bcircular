import { Link } from 'react-router-dom';
import { BarChart3, Wallet, ArrowRight, Circle } from 'lucide-react';
import { getCoverage } from '@/lib/coverage';

interface Props {
  connectedWallets: number;
  merchantCount: number;
  earnerCount: number;
  /** Slug used to build the connect-wallet CTA. Falls back to /connect. */
  slug?: string;
  /** Compact variant — no description copy, smaller paddings */
  compact?: boolean;
  className?: string;
}

/**
 * "Wallet Coverage" card shown above circular-flow visualisations on every
 * public economy page. Renders the same coverage tier used everywhere via
 * `getCoverage()`. No disclaimer text is added to merchant/earner/transaction
 * counts — only flow-related context is surfaced here.
 */
export default function WalletCoverageIndicator({
  connectedWallets,
  merchantCount,
  earnerCount,
  slug,
  compact = false,
  className,
}: Props) {
  const cov = getCoverage(connectedWallets, merchantCount, earnerCount);
  const ctaTo = slug ? `/c/${slug}/join-as-earner` : '/connect';

  return (
    <div
      className={`rounded-2xl border bg-card p-5 md:p-6 ${className || ''}`}
      style={{ borderColor: `hsl(var(--${cov.colorToken}) / 0.4)` }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `hsl(var(--${cov.colorToken}) / 0.12)`, color: `hsl(var(--${cov.colorToken}))` }}
          >
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
              Wallet Coverage
            </div>
            <div className="text-base md:text-lg font-semibold text-foreground mt-0.5">
              {cov.connected} wallet{cov.connected === 1 ? '' : 's'} connected
              {cov.estimated > 0 && (
                <span className="text-muted-foreground font-normal"> of ~{cov.estimated} estimated</span>
              )}
            </div>
            {!compact && (
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Higher coverage = more accurate circular flow measurement.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2 md:min-w-[180px]">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
            style={{
              color: `hsl(var(--${cov.colorToken}))`,
              borderColor: `hsl(var(--${cov.colorToken}) / 0.4)`,
              backgroundColor: `hsl(var(--${cov.colorToken}) / 0.1)`,
            }}
          >
            <Circle className="h-2 w-2 fill-current" aria-hidden />
            {cov.label}
          </span>
          <div className="w-full md:w-44">
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${cov.progressPct}%`, backgroundColor: `hsl(var(--${cov.colorToken}))` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground tabular-nums font-mono">
              Coverage: {cov.connected}/{cov.target} wallets connected
            </div>
          </div>
          <Link
            to={ctaTo}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Wallet className="h-3 w-3" /> Connect a wallet <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
