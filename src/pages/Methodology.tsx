import Navbar from '@/components/Navbar';
import { ExternalLink, Zap, MapPin, Trophy, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import circularLogo from '@/assets/circular-logo.png';

const pillars = [
  {
    name: 'Merchant Saturation',
    weight: '25%',
    formula: 'min((approved_merchants / declared_population) × 1000 + diversity_bonus, 100)',
    description:
      'Measures how many merchants accept Bitcoin relative to the economy size. A diversity bonus (up to 10 points) rewards economies with merchants across multiple categories (food, retail, services, education, transport, other).',
  },
  {
    name: 'Retention Rate',
    weight: '25%',
    formula: 'circular_transactions / total_transactions × 100',
    description:
      'Of all approved transactions, what percentage stayed within the economy? A transaction is "circular" when the sats were spent again locally rather than converted to fiat or sent outside.',
  },
  {
    name: 'Earner Penetration',
    weight: '20%',
    formula: 'min((approved_earners / declared_population) × 500, 100)',
    description:
      'How many people in the economy earn in Bitcoin? This measures the supply side — freelancers, market vendors, employees, and anyone receiving Bitcoin for goods or services.',
  },
  {
    name: 'Transaction Velocity',
    weight: '15%',
    formula: 'min((transactions_last_30_days / earners) × 10, 100)',
    description:
      'How actively are earners transacting? This pillar rewards communities where Bitcoin earners are regularly spending within the local economy, not just holding.',
  },
  {
    name: 'Growth Momentum',
    weight: '15%',
    formula: 'min(((new_merchants_30d + new_earners_30d) / total_participants) × 200, 100)',
    description:
      'Is the economy growing? This measures the rate of new merchant and earner additions over the past 30 days relative to total participants.',
  },
];

const dataSources = [
  {
    name: 'Self-reported submissions',
    description:
      'Community members submit merchants, earners, and transactions through the public submission form. No login is required to submit, lowering the barrier to participation.',
  },
  {
    name: 'Validator-approved data',
    description:
      'Each economy appoints trusted validators who review submissions using a 2-of-3 consensus model. Only approved data counts toward the circularity score.',
  },
  {
    name: 'Blink Wallet API (Live)',
    description:
      'Read-only API integration with Blink wallet. BCEs connect their wallet to enable automatic transaction tracking. No custody. No private keys. Aggregate data only.',
  },
  {
    name: 'BTCMap (Open Source)',
    description:
      'Merchant data sourced from BTCMap, the open-source global Bitcoin merchant directory. Auto-synced weekly. Attribution displayed on all merchant data.',
  },
  {
    name: 'FBCE Tier Framework',
    description:
      'Development classification using the internationally recognized FBCE 5-tier standard. Self-classified by economy admins with validator review.',
  },
];

const pillarCards: Array<{
  Icon: LucideIcon;
  title: string;
  source: string;
  badge: string;
  color: string;
  description: string;
  tracks: string[];
}> = [
  {
    Icon: Zap,
    title: 'Real Sats Flow',
    source: 'Blink Wallet API',
    badge: 'Live Integration',
    color: '#F7931A',
    description:
      'Bitcoin circular economies connect their Blink wallet via read-only API. We automatically track real transaction flow between participants. No manual input. No fabrication possible. Real sats. Real data.',
    tracks: ['Transaction count', 'Flow between participants', 'Activity frequency', 'Sats velocity'],
  },
  {
    Icon: MapPin,
    title: 'Verified Merchants',
    source: 'BTCMap',
    badge: 'Open Source Data',
    color: '#10B981',
    description:
      'Merchant data is sourced from BTCMap — the open-source global directory of Bitcoin-accepting businesses trusted by researchers and institutions worldwide. BTCMap-verified merchants carry a 1.5x trust weight in our scoring.',
    tracks: ['Merchant locations', 'Merchant categories', 'Payment methods accepted', 'Coverage vs active ratio'],
  },
  {
    Icon: Trophy,
    title: 'Development Standard',
    source: 'FBCE 5-Tier Framework',
    badge: 'International Standard',
    color: '#3B82F6',
    description:
      'We implement the globally recognized FBCE (Foundation for Bitcoin Circular Economies) 5-tier development classification. This allows apples-to-apples comparison between emerging and advanced economies worldwide.',
    tracks: ['Tier 1-2: Emerging economies', 'Tier 3-5: Advanced economies', 'Development milestone checklist', 'Progression over time'],
  },
];

const Methodology = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container py-12 max-w-5xl">
      <div className="flex items-center gap-3 text-primary text-sm font-mono mb-4">
        <img src={circularLogo} alt="Circular" className="h-12 w-auto object-contain" />
        <span>METHODOLOGY</span>
      </div>

      <h1 className="text-3xl font-bold mb-2">How Circularity Works</h1>
      <p className="text-muted-foreground mb-10 max-w-3xl">
        We combine three independent verified data sources to measure real Bitcoin circular economy activity.
        No single point of failure. No self-reported only data.
      </p>

      <div className="grid md:grid-cols-3 gap-5 mb-10">
        {pillarCards.map((c) => (
          <div
            key={c.title}
            className="rounded-lg border bg-card p-5 flex flex-col"
            style={{ borderTopWidth: '3px', borderTopColor: c.color }}
          >
            <div className="flex items-center justify-between mb-3">
              <c.Icon className="w-6 h-6" style={{ color: c.color }} aria-hidden />
              <span
                className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border"
                style={{ color: c.color, borderColor: `${c.color}55`, backgroundColor: `${c.color}14` }}
              >
                {c.badge}
              </span>
            </div>
            <h3 className="font-semibold text-foreground">{c.title}</h3>
            <div className="text-xs font-mono text-muted-foreground mb-3">Source: {c.source}</div>
            <p className="text-sm text-muted-foreground mb-4">{c.description}</p>
            <div className="mt-auto">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">What we track</div>
              <ul className="space-y-1">
                {c.tracks.map((t) => (
                  <li key={t} className="text-sm text-foreground flex items-start gap-2">
                    <span style={{ color: c.color }}>•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 mb-12 max-w-3xl">
        <p className="text-sm text-foreground">
          Together these three sources create the most comprehensive and independently verifiable
          picture of Bitcoin circular economy activity available anywhere.
        </p>
      </div>

      <h2 className="text-2xl font-bold mb-2">How the Circularity Score Works</h2>
      <p className="text-muted-foreground mb-10">
        The circularity score is a composite metric (0–100) that measures how effectively a Bitcoin circular economy
        uses Bitcoin as a medium of exchange. It is calculated from five weighted pillars.
      </p>

      <div className="space-y-8 mb-12">
        {pillars.map((p, i) => (
          <div key={p.name} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-semibold">
                <span className="text-primary font-mono mr-2">0{i + 1}</span>
                {p.name}
              </h3>
              <span className="text-xs font-mono text-muted-foreground">Weight: {p.weight}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{p.description}</p>
            <pre className="text-xs font-mono bg-secondary rounded-md p-3 overflow-x-auto text-foreground">
              {p.formula}
            </pre>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-5 mb-12">
        <h3 className="font-semibold mb-1">Final Score</h3>
        <pre className="text-xs font-mono bg-secondary rounded-md p-3 overflow-x-auto text-foreground">
{`score = saturation × 0.25
      + retention  × 0.25
      + earner_penetration × 0.20
      + velocity   × 0.15
      + growth     × 0.15`}
        </pre>
        <p className="text-sm text-muted-foreground mt-3">
          The result is rounded to the nearest integer and capped at 100.
        </p>
      </div>

      <h2 className="text-2xl font-bold mb-2">How Circular Flow Is Measured</h2>
      <p className="text-muted-foreground mb-6 max-w-3xl">
        Circular flow tracking works by connecting community members' Blink wallets via read-only API.
      </p>

      <div className="grid gap-4 mb-12">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold mb-2">How it works</h3>
          <p className="text-sm text-muted-foreground mb-3">When wallet A sends sats to wallet B:</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-score-green mt-0.5">→</span>
              <span><strong className="text-foreground">If both are connected to this economy:</strong> Tagged as <span className="font-mono text-score-green">INTERNAL FLOW ✓</span></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-score-amber mt-0.5">→</span>
              <span><strong className="text-foreground">If only wallet A is connected:</strong> Tagged as <span className="font-mono text-score-amber">UNMATCHED OUTFLOW</span> (may still be circular — we just cannot verify without wallet B)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">→</span>
              <span><strong className="text-foreground">If only wallet B is connected:</strong> Tagged as <span className="font-mono text-primary">EXTERNAL INFLOW</span></span>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-score-amber/30 bg-score-amber/5 p-5">
          <h3 className="font-semibold mb-2">Why this matters</h3>
          <p className="text-sm text-muted-foreground mb-2">
            A low circular flow percentage does <strong className="text-foreground">not</strong> necessarily mean sats are leaving the community. It may simply mean most community members have not yet connected their wallets.
          </p>
          <p className="text-sm text-muted-foreground">
            Circular flow accuracy increases as more merchants and earners connect their Blink wallets.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold mb-2">Data sources</h3>
          <p className="text-sm text-muted-foreground mb-2">
            All transaction data comes directly from the Blink Lightning wallet API (read-only).
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Raw transaction numbers (amounts, counts, dates) are accurate.</li>
            <li>Flow classification accuracy depends on wallet coverage.</li>
          </ul>
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
          <h3 className="font-semibold mb-2 text-primary">Privacy</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Wallet addresses are never stored.</li>
            <li>Only SHA-256 hashes are used for matching.</li>
            <li>Individual transaction details are never shown publicly — only aggregate totals.</li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Data Sources</h2>
      <div className="space-y-4 mb-12">
        {dataSources.map((ds) => (
          <div key={ds.name} className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-semibold mb-1">{ds.name}</h3>
            <p className="text-sm text-muted-foreground">{ds.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 mb-12">
        <h3 className="font-semibold mb-2 text-primary">Privacy Commitment</h3>
        <p className="text-sm text-muted-foreground">
          All transaction data is anonymous and self-reported. No wallet addresses or payment hashes
          are stored. Circular tracks <em>aggregate economic activity</em>, not individual financial
          behavior. No funds are held. Ever.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <a href="https://github.com/example/circular/issues/new" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Suggest an improvement
          </Button>
        </a>
        <span className="text-xs text-muted-foreground">
          Open a GitHub issue to propose changes to this methodology.
        </span>
      </div>
    </div>

    <footer className="border-t border-border py-8 mt-8">
      <div className="container flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2"><img src={circularLogo} alt="Circular" className="h-6 w-auto object-contain" /><span>Circular — Bitcoin Circular Economy Tracker</span></div>
        <span>No funds held. Ever.</span>
      </div>
    </footer>
  </div>
);

export default Methodology;
