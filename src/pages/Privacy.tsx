import { Link } from 'react-router-dom';
import { Shield, EyeOff, Users, Lock, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12 md:py-16 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-score-amber/40 bg-score-amber/10 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-score-amber mb-5">
          <Shield className="h-3 w-3" /> Privacy philosophy
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
          Show what Bitcoin does.<br />
          <span className="text-score-amber">Never who does it.</span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-10">
          Bitcoin Circular exists to make ecosystem-level activity visible — not to surveil people.
          Every design choice on this platform starts from that principle.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          <Pillar Icon={Shield} title="Built with consent">
            Communities decide whether to join, what to share, and when to disconnect.
          </Pillar>
          <Pillar Icon={Users} title="Aggregate, not individual">
            We surface ecosystem trends — merchant counts, activity rates, growth.
            Individual transactions are not publicly displayed.
          </Pillar>
          <Pillar Icon={EyeOff} title="No identities stored">
            We never store wallet addresses, payment hashes, or real names.
            Everything sensitive is hashed.
          </Pillar>
          <Pillar Icon={Lock} title="Disconnect is irreversible">
            When an economy disconnects, the associated data is permanently deleted.
            No backups, no shadow copies.
          </Pillar>
        </div>

        <section className="space-y-8">
          <Block title="What we collect">
            <List items={[
              'Public economy metadata communities choose to share (name, city, country, banner).',
              'Aggregate counts of transactions, merchants, and earners over time windows.',
              'Read-only wallet sync data when a community opts in — used to compute scores, never to expose individuals.',
            ]} positive />
          </Block>

          <Block title="What we never collect">
            <List items={[
              'Wallet addresses or payment hashes in any user-facing surface.',
              'Personal names tied to transaction activity.',
              'Counterparty information from wallet integrations.',
              'Anything required to deanonymize a participant.',
            ]} positive={false} />
          </Block>

          <Block title="How opt-in works">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Wallet integrations (currently Blink) are <span className="text-foreground font-medium">read-only and per-economy</span>.
              An economy admin generates a scoped API key and pastes it into their dashboard.
              We only fetch what's needed to compute aggregate metrics — and we surface what we synced in the dashboard so it's auditable.
            </p>
          </Block>

          <Block title="The current state of the data">
            <p className="text-sm text-muted-foreground leading-relaxed">
              A meaningful chunk of what's currently visible is <span className="text-foreground font-medium">sample / demo data</span> used
              to test the platform end-to-end. Communities with real integrations are clearly marked, and the data sources are visible on each economy page.
            </p>
          </Block>

          <Block title="Open methodology">
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              The scoring algorithm, the validator process, and the data pipeline are documented publicly.
              The codebase is open source.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/methodology">
                <Button variant="outline" size="sm" className="rounded-full">
                  Read the methodology <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
              <a href="https://github.com/Destinysmart/bcircular" target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="rounded-full">View source code</Button>
              </a>
            </div>
          </Block>
        </section>
      </main>
    </div>
  );
};

const Pillar = ({ Icon, title, children }: { Icon: typeof Shield; title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="h-10 w-10 rounded-xl bg-score-amber/10 border border-score-amber/30 text-score-amber flex items-center justify-center mb-3">
      <Icon className="h-5 w-5" />
    </div>
    <div className="font-semibold text-sm mb-1.5">{title}</div>
    <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
  </div>
);

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h2 className="text-lg font-semibold mb-3">{title}</h2>
    {children}
  </div>
);

const List = ({ items, positive }: { items: string[]; positive: boolean }) => (
  <ul className="space-y-2">
    {items.map(item => (
      <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
        {positive
          ? <CheckCircle2 className="h-4 w-4 text-score-green shrink-0 mt-0.5" />
          : <XCircle className="h-4 w-4 text-score-red shrink-0 mt-0.5" />}
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

export default Privacy;
