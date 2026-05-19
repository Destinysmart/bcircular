/**
 * Wallet-coverage tier helper. Single source of truth used by every UI piece
 * that contextualises circular-flow numbers. Driven by:
 *   estimated = approved merchants + approved earners
 *   connected = wallets rows for the community
 *
 * Thresholds (per product spec):
 *   0      → none      (red,    "No wallets connected")
 *   1–2    → limited   (red,    "Very Limited")
 *   3–9    → partial   (amber,  "Partial")
 *   10–19  → good      (green,  "Good")
 *   20+    → high      (green,  "High")
 */
export type CoverageTier = 'none' | 'limited' | 'partial' | 'good' | 'high';

export interface CoverageInfo {
  tier: CoverageTier;
  connected: number;
  estimated: number;
  /** Short human label, e.g. "Partial" */
  label: string;
  /** Long-form description, e.g. "Partial coverage" */
  description: string;
  /** Emoji used by compact badges */
  emoji: string;
  /** CSS color token name (without leading --), e.g. "score-amber" */
  colorToken: 'score-red' | 'score-amber' | 'score-green' | 'muted-foreground';
  /** Tier comparable as a number for thresholds */
  rank: 0 | 1 | 2 | 3 | 4;
  /** Target number of wallets used by progress UI */
  target: number;
  /** Progress 0–100 toward target */
  progressPct: number;
  /** True when circular-flow rate should be shown without disclaimer */
  meaningfulRate: boolean;
}

const TARGET = 20;

export function getCoverage(
  connectedWallets: number | null | undefined,
  merchantCount: number | null | undefined,
  earnerCount: number | null | undefined,
): CoverageInfo {
  const connected = Math.max(0, Number(connectedWallets) || 0);
  const estimated = Math.max(0, (Number(merchantCount) || 0) + (Number(earnerCount) || 0));

  let tier: CoverageTier = 'none';
  if (connected >= 20) tier = 'high';
  else if (connected >= 10) tier = 'good';
  else if (connected >= 3) tier = 'partial';
  else if (connected >= 1) tier = 'limited';

  const meta: Record<CoverageTier, Pick<CoverageInfo, 'label' | 'description' | 'emoji' | 'colorToken' | 'rank'>> = {
    none:    { label: 'No wallets', description: 'No wallets connected',  emoji: '', colorToken: 'muted-foreground', rank: 0 },
    limited: { label: 'Very Limited', description: 'Limited coverage',    emoji: '', colorToken: 'score-red',        rank: 1 },
    partial: { label: 'Partial',     description: 'Partial coverage',     emoji: '', colorToken: 'score-amber',      rank: 2 },
    good:    { label: 'Good',        description: 'Good coverage',        emoji: '', colorToken: 'score-green',      rank: 3 },
    high:    { label: 'High',        description: 'High coverage',        emoji: '', colorToken: 'score-green',      rank: 4 },
  };

  const m = meta[tier];
  const progressPct = Math.min(100, Math.round((connected / TARGET) * 100));

  return {
    tier,
    connected,
    estimated,
    label: m.label,
    description: m.description,
    emoji: m.emoji,
    colorToken: m.colorToken,
    rank: m.rank,
    target: TARGET,
    progressPct,
    meaningfulRate: connected >= 3,
  };
}
