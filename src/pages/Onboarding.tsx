import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Briefcase, Users, Sparkles, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type UserType = 'freelancer' | 'client' | 'both';

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [userType, setUserType] = useState<UserType | null>(null);
  const [about, setAbout] = useState('');
  const [website, setWebsite] = useState('');
  const [lightning, setLightning] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/onboarding', { replace: true });
  }, [user, authLoading, navigate]);

  // Skip onboarding if already complete
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('profiles')
        .select('onboarding_completed_at, display_name, username' as any)
        .eq('user_id', user.id)
        .maybeSingle();
      const p = data as any;
      if (p?.onboarding_completed_at) navigate(redirectTo, { replace: true });
      if (p?.display_name && !displayName) setDisplayName(p.display_name);
      if (p?.username) setUsername(p.username);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Debounced username availability check
  useEffect(() => {
    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(u)) { setAvailable(null); return; }
    setChecking(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles')
        .select('user_id' as any)
        .ilike('username' as any, u)
        .neq('user_id', user?.id ?? '')
        .maybeSingle();
      setAvailable(!data);
      setChecking(false);
    }, 400);
    return () => clearTimeout(t);
  }, [username, user?.id]);

  const canStep1 = username.trim().length >= 3 && available === true && displayName.trim().length > 0;
  const canStep2 = userType !== null;

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        username: username.trim().toLowerCase(),
        display_name: displayName.trim(),
        user_type: userType,
        about: about.trim() || null,
        website: website.trim() || null,
        lightning_address: lightning.trim() || null,
        onboarding_completed_at: new Date().toISOString(),
      } as any).eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'You\'re all set', description: 'Welcome to Bitcoin Circular.' });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast({ title: 'Couldn\'t save', description: err instanceof Error ? err.message : 'Try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Complete your profile" description="Set up your Bitcoin Circular profile." path="/onboarding" noIndex />
      <Navbar />
      <div className="container flex items-center justify-center py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-1.5 justify-center">
            {[1, 2, 3].map(n => (
              <div key={n} className={`h-1 w-10 rounded-full ${step >= n ? 'bg-score-amber' : 'bg-muted'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-xl font-semibold">Pick a username</h1>
                <p className="text-sm text-muted-foreground mt-1">This is how people find you.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <Input
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder="satoshi"
                    className="pl-7 lowercase"
                    maxLength={24}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground min-h-[16px]">
                  {username && !/^[a-zA-Z0-9_]{3,24}$/.test(username)
                    ? '3–24 chars, letters/numbers/underscore only'
                    : checking ? 'Checking…'
                    : available === true ? '✓ Available'
                    : available === false ? '✗ Taken'
                    : ''}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Display name</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" maxLength={80} />
              </div>
              <Button className="w-full rounded-full" disabled={!canStep1} onClick={() => setStep(2)}>
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-xl font-semibold">How will you use Bitcoin Circular?</h1>
                <p className="text-sm text-muted-foreground mt-1">Pick one — you can change this later.</p>
              </div>
              <div className="grid gap-3">
                {[
                  { id: 'freelancer', icon: Briefcase, title: 'Freelancer', desc: 'Offer skills, get paid in Bitcoin.' },
                  { id: 'client', icon: Users, title: 'Client', desc: 'Hire people and pay in Bitcoin.' },
                  { id: 'both', icon: Sparkles, title: 'Both', desc: 'I do both.' },
                ].map(({ id, icon: Icon, title, desc }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setUserType(id as UserType)}
                    className={`text-left rounded-xl border p-4 transition flex items-start gap-3 ${
                      userType === id ? 'border-score-amber bg-score-amber/5' : 'border-border hover:border-foreground/30'
                    }`}
                  >
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{title}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1 rounded-full" disabled={!canStep2} onClick={() => setStep(3)}>
                  Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-xl font-semibold">Tell people about you</h1>
                <p className="text-sm text-muted-foreground mt-1">All optional. Skip anything you don't want to share.</p>
              </div>
              <div className="space-y-1.5">
                <Label>About</Label>
                <Textarea value={about} onChange={e => setAbout(e.target.value)} rows={3} maxLength={280} placeholder="A short bio…" />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://…" maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label>Lightning address</Label>
                <Input value={lightning} onChange={e => setLightning(e.target.value)} placeholder="you@getalby.com" maxLength={120} />
                <p className="text-[11px] text-muted-foreground">Optional. Lets people zap you.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1 rounded-full" disabled={saving} onClick={finish}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Finish'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
