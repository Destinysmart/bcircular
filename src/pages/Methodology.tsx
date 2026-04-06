import Navbar from '@/components/Navbar';
import { Bitcoin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      'Is the community growing? This measures the rate of new merchant and earner additions over the past 30 days relative to total participants.',
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
      'Each community appoints trusted validators who review submissions using a 2-of-3 consensus model. Only approved data counts toward the circularity score.',
  },
  {
    name: 'Aggregate statistics',
    description:
      'Future integration with payment providers like Blink will allow communities to supplement self-reported data with aggregate transaction volumes. No individual transaction data will ever be exposed.',
  },
];

const Methodology = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container py-12 max-w-3xl">
      <div className="flex items-center gap-2 text-primary text-sm font-mono mb-4">
        <Bitcoin className="h-4 w-4" />
        <span>METHODOLOGY</span>
      </div>
      <h1 className="text-3xl font-bold mb-2">How the Circularity Score Works</h1>
      <p className="text-muted-foreground mb-10">
        The circularity score is a composite metric (0–100) that measures how effectively a community
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
        <div className="flex items-center gap-2"><Bitcoin className="h-4 w-4 text-primary" /><span>Circular — Bitcoin Circular Economy Tracker</span></div>
        <span>No funds held. Ever.</span>
      </div>
    </footer>
  </div>
);

export default Methodology;
