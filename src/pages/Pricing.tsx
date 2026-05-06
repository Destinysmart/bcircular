import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ArrowRight, Check, ShieldCheck, Database, Sparkles, Globe, BarChart3, Mail } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Tier = 'researcher' | 'organization' | 'partner';

const tierLabel: Record<Tier, string> = {
  researcher: 'Academic & Research',
  organization: 'NGO / Funder',
  partner: 'Data Partner / API',
};

const schema = z.object({
  name: z.string().trim().min(1, 'Name required').max(200),
  organization: z.string().trim().max(200).optional(),
  email: z.string().trim().email('Invalid email').max(320),
  use_case: z.string().trim().min(1, 'Choose a use case').max(1000),
  message: z.string().trim().max(2000).optional(),
});

const PLANS = [
  {
    name: 'Free — Public',
    price: '$0',
    suffix: 'forever',
    audience: 'Anyone with an account',
    cta: { label: 'Sign up free', to: '/login?signup=1', variant: 'outline' as const },
    accent: false,
    features: [
      'Live global leaderboard',
      'Public economy profiles & widget',
      'CSV snapshot download',
      'Methodology & verified sources',
      'Validator-backed scores',
    ],
    limits: ['Current snapshot only', 'No historical time series', 'No API access'],
  },
  {
    name: 'Research',
    price: 'Free',
    suffix: 'with application',
    audience: 'Academic researchers, journalists',
    cta: { label: 'Apply for access', to: '#apply-researcher', variant: 'default' as const },
    accent: false,
    features: [
      'Everything in Free, plus:',
      'Full historical dataset',
      'Economy-level monthly time series',
      'Cross-economy comparison exports',
      'Citation-ready methodology pack',
    ],
    limits: ['Subject to review', 'Non-commercial use'],
  },
  {
    name: 'Pro',
    price: 'Custom',
    suffix: 'contact us',
    audience: 'NGOs, funders, Bitcoin companies',
    cta: { label: 'Request demo', to: '#apply-organization', variant: 'amber' as const },
    accent: true,
    features: [
      'Everything in Research, plus:',
      'Real-time API feeds',
      'White-label data + widgets',
      'Custom exports & due diligence',
      'Priority support & SLA',
      'Onboarding for your team',
    ],
    limits: [],
  },
];

const Pricing = () => {
  const [tier, setTier] = useState<Tier>('organization');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', organization: '', email: '', use_case: '', message: '' });

  const onApply = (t: Tier) => {
    setTier(t);
    document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Please check the form');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('data_access_requests').insert({
      name: parsed.data.name,
      organization: parsed.data.organization || null,
      email: parsed.data.email,
      use_case: parsed.data.use_case + (parsed.data.message ? `\n\n${parsed.data.message}` : ''),
      tier,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Could not send request. Try again.');
      return;
    }
    toast.success('Request received. We\'ll be in touch within a few business days.');
    setForm({ name: '', organization: '', email: '', use_case: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-14 max-w-6xl">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-score-amber/40 bg-score-amber/10 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-score-amber mb-5">
            <Sparkles className="h-3 w-3" />
            Pricing & access
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Open by default. <span className="text-score-amber">Premium where it matters.</span>
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            The leaderboard, profiles, and CSV are free forever. For deeper research, API feeds, or partner integrations, apply for Research or Pro access below.
          </p>
        </section>

        {/* Plans */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-16">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border bg-card p-6 flex flex-col ${
                plan.accent
                  ? 'border-score-amber/60 bg-gradient-to-br from-score-amber/[0.06] to-card lg:scale-[1.02]'
                  : 'border-border'
              }`}
            >
              {plan.accent && (
                <div className="absolute -top-3 left-6 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-score-amber text-background font-bold">
                  Most chosen
                </div>
              )}
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{plan.audience}</div>
              <div className="text-xl font-bold text-foreground mb-3">{plan.name}</div>
              <div className="flex items-baseline gap-2 mb-5">
                <div className="text-3xl font-bold text-foreground">{plan.price}</div>
                <div className="text-xs text-muted-foreground">{plan.suffix}</div>
              </div>
              <ul className="space-y-2 mb-5 text-sm text-muted-foreground">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className={`h-4 w-4 shrink-0 mt-0.5 ${plan.accent ? 'text-score-amber' : 'text-score-green'}`} />
                    <span className={f.endsWith('plus:') ? 'text-foreground font-medium' : ''}>{f}</span>
                  </li>
                ))}
              </ul>
              {plan.limits.length > 0 && (
                <ul className="space-y-1 mb-5 text-xs text-muted-foreground/70">
                  {plan.limits.map(l => (
                    <li key={l}>· {l}</li>
                  ))}
                </ul>
              )}
              <div className="mt-auto">
                {plan.cta.to.startsWith('#') ? (
                  <Button
                    onClick={() => onApply(plan.cta.to === '#apply-researcher' ? 'researcher' : 'organization')}
                    className={`w-full rounded-lg ${
                      plan.cta.variant === 'amber'
                        ? 'bg-score-amber text-background hover:bg-score-amber/90 font-semibold'
                        : ''
                    }`}
                    variant={plan.cta.variant === 'amber' ? 'default' : 'outline'}
                  >
                    {plan.cta.label} <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Link to={plan.cta.to}>
                    <Button variant="outline" className="w-full rounded-lg">
                      {plan.cta.label} <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Comparison */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-foreground mb-4">Compare in detail</h2>
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Feature</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Free</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Research</th>
                  <th className="px-4 py-3 font-semibold text-score-amber text-xs uppercase tracking-wider text-center">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ['Leaderboard & profiles', true, true, true],
                  ['CSV snapshot', true, true, true],
                  ['Embeddable widget', true, true, true],
                  ['Historical time series', false, true, true],
                  ['Cross-economy exports', false, true, true],
                  ['Real-time API access', false, false, true],
                  ['White-label data feeds', false, false, true],
                  ['Custom exports', false, false, true],
                  ['Priority support / SLA', false, false, true],
                  ['Commercial use', false, false, true],
                ].map(([label, a, b, c]) => (
                  <tr key={label as string} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-foreground">{label as string}</td>
                    <Cell ok={a as boolean} />
                    <Cell ok={b as boolean} />
                    <Cell ok={c as boolean} accent />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Apply form */}
        <section id="apply" className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-16 scroll-mt-20">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Apply for access</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tell us a little about your work. We respond within a few business days. Research access is granted free of charge for academic and journalistic use. Pro pricing scales with org size and use case.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-score-amber shrink-0 mt-0.5" /> Identity-free, aggregate data</li>
              <li className="flex items-start gap-2"><Database className="h-4 w-4 text-score-amber shrink-0 mt-0.5" /> Validator-verified circular activity</li>
              <li className="flex items-start gap-2"><Globe className="h-4 w-4 text-score-amber shrink-0 mt-0.5" /> Coverage across every continent</li>
              <li className="flex items-start gap-2"><BarChart3 className="h-4 w-4 text-score-amber shrink-0 mt-0.5" /> 5-pillar circularity score methodology</li>
            </ul>
          </div>
          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Access tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as Tier)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="researcher">{tierLabel.researcher}</SelectItem>
                  <SelectItem value="organization">{tierLabel.organization}</SelectItem>
                  <SelectItem value="partner">{tierLabel.partner}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" value={form.name} maxLength={200} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-org">Organization</Label>
                <Input id="p-org" value={form.organization} maxLength={200} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" type="email" value={form.email} maxLength={320} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-use">Primary use case</Label>
              <Select value={form.use_case} onValueChange={(v) => setForm({ ...form, use_case: v })}>
                <SelectTrigger id="p-use"><SelectValue placeholder="Select a use case" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic_research">Academic research</SelectItem>
                  <SelectItem value="journalism">Journalism / reporting</SelectItem>
                  <SelectItem value="grant_due_diligence">Grant due diligence</SelectItem>
                  <SelectItem value="impact_measurement">Impact measurement</SelectItem>
                  <SelectItem value="product_integration">Product integration / API</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-msg">Anything else? (optional)</Label>
              <Textarea id="p-msg" value={form.message} maxLength={2000} rows={4} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us about your project, timeline, or specific data needs." />
            </div>
            <Button onClick={submit} disabled={submitting} className="w-full bg-score-amber text-background hover:bg-score-amber/90 font-semibold">
              {submitting ? 'Sending…' : 'Send request'} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Or email us directly at{' '}
              <a href="mailto:smartdestinyonyekachi@gmail.com" className="text-score-amber hover:underline inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> smartdestinyonyekachi@gmail.com
              </a>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-foreground mb-4">FAQ</h2>
          <div className="space-y-3">
            {[
              ['Is the free tier really free forever?', 'Yes. The leaderboard, public economy profiles, embeddable widget, and CSV snapshot are free for anyone, no account upgrade required.'],
              ['Who qualifies for free Research access?', 'Academic researchers, journalists, and policy analysts. We grant access on a per-application basis after a quick review.'],
              ['How is Pro priced?', 'Pricing scales with organization size and use case (API volume, white-label, custom exports). Contact us for a quote.'],
              ['Is the data identity-free?', 'Yes. We never collect or share personal information. All data is aggregate and validator-verified.'],
            ].map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium text-foreground flex items-center justify-between">
                  {q}
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">⌄</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

const Cell = ({ ok, accent }: { ok: boolean; accent?: boolean }) => (
  <td className="px-4 py-3 text-center">
    {ok ? (
      <Check className={`h-4 w-4 inline ${accent ? 'text-score-amber' : 'text-score-green'}`} />
    ) : (
      <span className="text-muted-foreground/40">—</span>
    )}
  </td>
);

export default Pricing;
