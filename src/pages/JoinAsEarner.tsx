import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Copy, MessageCircle, Lock, Sparkles, Zap, Wrench, Store, Briefcase, Palette, Car, GraduationCap, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Navbar from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { fetchCommunityBySlug, submitEarner } from '@/lib/api';
import { shareUrl } from '@/lib/shareUrl';
import { useToast } from '@/hooks/use-toast';

const ROLES = [
  { id: 'freelancer', label: 'Freelancer', icon: Wrench },
  { id: 'vendor', label: 'Vendor / Seller', icon: Store },
  { id: 'employee', label: 'Employee', icon: Briefcase },
  { id: 'creator', label: 'Creator', icon: Palette },
  { id: 'transport', label: 'Transport', icon: Car },
  { id: 'educator', label: 'Educator', icon: GraduationCap },
  { id: 'other', label: 'Other', icon: Plus },
] as const;

const FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'occasionally', label: 'Sometimes' },
] as const;

type Role = typeof ROLES[number]['id'];
type Frequency = typeof FREQUENCIES[number]['id'];

const JoinAsEarner = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | ''>('');
  const [frequency, setFrequency] = useState<Frequency | ''>('');
  const [lnAddress, setLnAddress] = useState('');
  const [blinkKey, setBlinkKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [earnerCode, setEarnerCode] = useState<string | null>(null);

  const { data: community, isLoading } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => fetchCommunityBySlug(slug!),
    enabled: !!slug,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleSubmit = async () => {
    if (!community || !role || !frequency) return;
    setSubmitting(true);
    try {
      // Only attach submitted_by when we have a live session whose JWT will
      // actually be sent to PostgREST. Otherwise auth.uid() is NULL server-side
      // and the RLS check (submitted_by = auth.uid()) fails.
      const { data: { session } } = await supabase.auth.getSession();
      const submitterId = session?.user?.id;
      const earner = await submitEarner(
        community.id,
        {
          description: `${ROLES.find(r => r.id === role)?.label || 'Earner'}`,
          earning_method: role,
          earning_frequency: frequency as any,
        },
        submitterId
      );

      // Wallet save requires an API key (ln address alone is not enough)
      if (blinkKey.trim()) {
        try {
          await supabase.functions.invoke('save-pending-wallet', {
            body: {
              owner_type: 'earner',
              owner_id: earner.id,
              api_key: blinkKey.trim(),
              ln_address: lnAddress.trim() || null,
            },
          });
        } catch (err) {
          // Don't block earner creation on wallet save failure
          console.error('Pending wallet save failed:', err);
        }
      }

      setEarnerCode(earner.earner_code || earner.id);
      setStep(5);
      toast({ title: 'Welcome to the economy', description: 'Your earner registration was submitted.' });
    } catch (err: any) {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const dashboardUrl = earnerCode ? shareUrl(`/connect/dashboard?code=${earnerCode}`) : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(dashboardUrl);
    toast({ title: 'Copied to clipboard' });
  };

  const handleWhatsApp = async () => {
    const message = `I just joined ${community?.name} on Bitcoin Circular. My dashboard: ${dashboardUrl}`;
    const text = encodeURIComponent(message);
    window.location.href = `https://wa.me/?text=${text}`;
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="container py-16 text-center text-muted-foreground">Loading…</div></div>;
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <h2 className="text-xl font-semibold mb-2">Economy not found</h2>
          <Link to="/leaderboard"><Button variant="outline">Back to leaderboard</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-xl">
        {step < 5 && (
          <Link to={`/c/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to {community.name}
          </Link>
        )}

        {step < 5 && (
          <>
            <div className="mb-2 text-xs uppercase tracking-widest text-score-amber font-semibold">Join {community.name}</div>
            <h1 className="text-3xl font-bold mb-1">Become an earner</h1>
            <p className="text-sm text-muted-foreground mb-6">Anonymous by default. No name needed. Your earner code is your only identity.</p>

            {/* Step indicator */}
            <div className="flex gap-1.5 mb-8">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? 'bg-score-amber' : 'bg-muted'}`}
                />
              ))}
            </div>
          </>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1 — Role */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-semibold mb-4">What do you do?</h2>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      role === r.id
                        ? 'border-score-amber bg-score-amber/10'
                        : 'border-border bg-card hover:border-score-amber/40'
                    }`}
                  >
                    <r.icon className="h-5 w-5 text-score-amber shrink-0" />
                    <span className="text-sm font-medium">{r.label}</span>
                  </button>
                ))}
              </div>
              <Button
                className="w-full"
                disabled={!role}
                onClick={() => setStep(2)}
              >
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {/* Step 2 — Frequency */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-semibold mb-4">How often do you earn in Bitcoin?</h2>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFrequency(f.id)}
                    className={`rounded-xl border p-4 text-center transition-all ${
                      frequency === f.id
                        ? 'border-score-amber bg-score-amber/10'
                        : 'border-border bg-card hover:border-score-amber/40'
                    }`}
                  >
                    <span className="text-sm font-medium">{f.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button
                  className="flex-1"
                  disabled={!frequency}
                  onClick={() => setStep(3)}
                >
                  Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Optional wallet */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-semibold mb-1">Connect your wallet (optional)</h2>
              <p className="text-sm text-muted-foreground mb-2">Help prove Bitcoin actually circulates here. Activated after validator approval.</p>
              <p className="text-xs text-primary mb-4">
                Each connected wallet improves circular flow accuracy for {community?.name}.
              </p>

              <div className="rounded-lg border border-border bg-card p-4 space-y-4 mb-4">
                <div>
                  <Label htmlFor="ln" className="text-xs">Lightning address</Label>
                  <Input
                    id="ln"
                    placeholder="you@blink.sv"
                    value={lnAddress}
                    onChange={(e) => setLnAddress(e.target.value)}
                    className="mt-1.5 font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="key" className="text-xs">Blink API key (read-only)</Label>
                  <Input
                    id="key"
                    type="password"
                    placeholder="blink_..."
                    value={blinkKey}
                    onChange={(e) => setBlinkKey(e.target.value)}
                    className="mt-1.5 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-score-green/30 bg-score-green/5 p-3 mb-6 flex items-start gap-2">
                <Lock className="h-4 w-4 text-score-green mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-score-green">Privacy guarantee:</span> we never store your wallet address, payment hashes, or real name.
                  Your earner code is your only identity. Disconnect anytime — your data is irreversibly deleted.
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(4)} className="flex-1">
                  Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <button
                onClick={() => { setLnAddress(''); setBlinkKey(''); setStep(4); }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-3 underline underline-offset-2"
              >
                Skip — I'll connect later
              </button>
            </motion.div>
          )}

          {/* Step 4 — Review & submit */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-semibold mb-4">Ready to join?</h2>
              <div className="rounded-lg border border-border bg-card p-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Economy</span><span className="font-medium">{community.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-medium capitalize">{ROLES.find(r => r.id === role)?.label}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Frequency</span><span className="font-medium capitalize">{FREQUENCIES.find(f => f.id === frequency)?.label}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Wallet</span><span className="font-medium">{(lnAddress || blinkKey) ? 'Pending validator approval' : 'Skipped'}</span></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1" disabled={submitting}>Back</Button>
                <Button onClick={handleSubmit} className="flex-1 bg-score-amber text-background hover:bg-score-amber/90" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit anonymously'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5 — Success */}
          {step === 5 && earnerCode && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-score-green/20 text-score-green mb-4">
                <Check className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold mb-2 inline-flex items-center gap-2">Welcome to {community.name} <Zap className="h-6 w-6 text-score-amber" fill="currentColor" /></h1>
              <p className="text-sm text-muted-foreground mb-6">
                Your registration is pending validator approval. Save your dashboard link below — it's how you'll access your data.
              </p>

              <div className="rounded-xl border border-score-amber/30 bg-card p-5 mb-6 text-left">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Your earner code</div>
                <div className="font-mono text-lg font-bold text-score-amber mb-4 break-all">{earnerCode}</div>

                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Your private dashboard link</div>
                <div className="font-mono text-xs text-muted-foreground break-all bg-background rounded p-2 border border-border">
                  {dashboardUrl}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mb-6">
                <Button onClick={handleCopy} variant="outline" className="flex-1 gap-1.5">
                  <Copy className="h-4 w-4" /> Copy link
                </Button>
                <Button onClick={handleWhatsApp} className="flex-1 gap-1.5 bg-score-amber text-background hover:bg-score-amber/90">
                  <MessageCircle className="h-4 w-4" /> Share via WhatsApp
                </Button>
              </div>

              <div className="rounded-lg border border-border bg-card p-3 text-left flex items-start gap-2 mb-6">
                <Sparkles className="h-4 w-4 text-score-amber mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">Save this link.</span> There is no password or login — your code IS your access. Lose it and your data is gone forever.
                </p>
              </div>

              <Link to={`/c/${slug}`}>
                <Button variant="outline" className="w-full">Back to {community.name}</Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default JoinAsEarner;
