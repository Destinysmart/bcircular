import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { submitMerchant, submitEarner, fetchCommunityBySlug } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'merchant' | 'earner';
type EarningFrequency = 'daily' | 'weekly' | 'monthly' | 'occasionally';

const ROLE_OPTIONS = ['Freelancer', 'Employee', 'Vendor', 'Services', 'Content creator', 'Other'];
const FREQUENCY_OPTIONS: EarningFrequency[] = ['daily', 'weekly', 'monthly', 'occasionally'];

const amberBtnClass =
  'w-full font-bold text-[#0A0F1E] bg-[#F59E0B] hover:bg-[#F59E0B]/90 disabled:opacity-60';

const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-4 py-2.5 rounded-full text-[13px] border transition-colors',
      active
        ? 'bg-[#F59E0B] text-[#0A0F1E] border-[#F59E0B] font-semibold'
        : 'border-[#374151] text-foreground hover:border-[#F59E0B]/60',
    )}
  >
    {children}
  </button>
);

const WalletTrackingBlock = ({
  apiKey,
  setApiKey,
  lnAddress,
  setLnAddress,
  contextLine,
  showDisconnectNote = false,
}: {
  apiKey: string;
  setApiKey: (v: string) => void;
  lnAddress: string;
  setLnAddress: (v: string) => void;
  contextLine: string;
  showDisconnectNote?: boolean;
}) => (
  <div className="rounded-xl border border-score-amber/30 bg-card/60 p-4 space-y-4">
    <div className="flex items-center gap-2">
      <Zap className="h-4 w-4 text-score-amber" />
      <span className="text-xs uppercase tracking-wider text-score-amber font-semibold">
        Wallet tracking <span className="text-muted-foreground normal-case font-normal">(Optional but recommended)</span>
      </span>
    </div>
    <p className="text-xs text-muted-foreground leading-relaxed">{contextLine}</p>
    <div>
      <Label className="text-xs">Blink API Key (read-only)</Label>
      <Input
        type="password"
        autoComplete="off"
        placeholder="Paste your read-only API key here"
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
        maxLength={500}
        className="mt-1.5"
      />
      <p className="text-[11px] text-muted-foreground mt-1">
        Get yours at:{' '}
        <a href="https://dashboard.blink.sv/api" target="_blank" rel="noopener noreferrer" className="text-score-amber hover:underline">
          dashboard.blink.sv/api
        </a>
      </p>
    </div>
    <div>
      <Label className="text-xs">Lightning Address (optional)</Label>
      <Input
        placeholder="e.g. yourname@blink.sv"
        value={lnAddress}
        onChange={e => setLnAddress(e.target.value)}
        maxLength={120}
        className="mt-1.5"
      />
    </div>
    <div className="text-[11px] text-muted-foreground space-y-0.5">
      <div>✓ Read-only · ✓ No personal data · ✓ Encrypted</div>
      {showDisconnectNote && <div>✓ You can disconnect at any time</div>}
    </div>
  </div>
);

const SubmitPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('merchant');
  const [submitted, setSubmitted] = useState(false);
  const [submittedWithWallet, setSubmittedWithWallet] = useState(false);
  const [loading, setLoading] = useState(false);

  // Merchant form
  const [mName, setMName] = useState('');
  const [mCategory, setMCategory] = useState('');
  const [mAddress, setMAddress] = useState('');
  const [mPayments, setMPayments] = useState<string[]>([]);
  const [mWebsite, setMWebsite] = useState('');
  const [mApiKey, setMApiKey] = useState('');
  const [mLnAddress, setMLnAddress] = useState('');

  // Earner form
  const [eRole, setERole] = useState<string>('');
  const [eDesc, setEDesc] = useState('');
  const [eFrequency, setEFrequency] = useState<EarningFrequency | ''>('');
  const [eApiKey, setEApiKey] = useState('');
  const [eLnAddress, setELnAddress] = useState('');

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => fetchCommunityBySlug(slug!),
    enabled: !!slug,
  });

  const togglePayment = (method: string) =>
    setMPayments(prev => (prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]));

  const savePendingWallet = async (
    owner_type: 'merchant' | 'earner',
    owner_id: string,
    api_key: string,
    ln_address: string,
  ) => {
    try {
      await supabase.functions.invoke('save-pending-wallet', {
        body: { owner_type, owner_id, api_key, ln_address: ln_address || null },
      });
      return true;
    } catch (e: any) {
      toast({
        title: 'Submission saved, wallet not linked',
        description: e?.message || 'Could not save wallet key. You can connect later.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!community) return;
    setLoading(true);
    try {
      let walletAttached = false;
      if (tab === 'merchant') {
        const merchant = await submitMerchant(
          community.id,
          {
            name: mName,
            category: mCategory,
            address: mAddress,
            payment_methods: mPayments,
            website: mWebsite || undefined,
          },
          user?.id,
        );
        if (mApiKey.trim()) {
          walletAttached = await savePendingWallet('merchant', merchant.id, mApiKey.trim(), mLnAddress.trim());
        }
      } else {
        if (!eRole) throw new Error('Please select how you earn Bitcoin');
        const earner = await submitEarner(
          community.id,
          {
            description: eDesc || eRole,
            earning_method: eRole,
            earning_frequency: (eFrequency || undefined) as EarningFrequency | undefined,
          },
          user?.id,
        );
        if (eApiKey.trim()) {
          walletAttached = await savePendingWallet('earner', earner.id, eApiKey.trim(), eLnAddress.trim());
        }
      }
      setSubmittedWithWallet(walletAttached);
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setSubmitted(false);
    setSubmittedWithWallet(false);
    setMName(''); setMCategory(''); setMAddress(''); setMPayments([]); setMWebsite(''); setMApiKey(''); setMLnAddress('');
    setERole(''); setEDesc(''); setEFrequency(''); setEApiKey(''); setELnAddress('');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 max-w-lg text-center">
          <div className="text-4xl mb-4 text-score-amber">✓</div>
          <h2 className="text-xl font-semibold mb-2">Submitted successfully</h2>
          <p className="text-muted-foreground text-sm">
            Your submission is being reviewed by validators.
          </p>
          {submittedWithWallet && (
            <div className="mt-3 text-sm text-muted-foreground space-y-1">
              <p>Your wallet will be connected once approved.</p>
              <p>Transaction data will start syncing automatically.</p>
            </div>
          )}
          <Button className={cn('mt-6', amberBtnClass)} onClick={resetAll}>Submit another</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-lg">
        <div className="text-sm text-muted-foreground mb-1">{community?.name || slug}</div>
        <h1 className="text-2xl font-bold mb-2">Submit Data</h1>

        <div className="flex items-center gap-2 rounded-lg bg-secondary/50 border border-border p-3 mb-6 text-sm text-muted-foreground">
          <Zap className="h-4 w-4 text-score-amber shrink-0" />
          <span>Transactions are tracked automatically via Blink Wallet integration. Submit merchants and earners here.</span>
        </div>

        <div className="flex border-b border-border mb-6">
          {(['merchant', 'earner'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize border-b-2 transition-colors ${
                tab === t ? 'border-score-amber text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'merchant' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Business name</Label><Input placeholder="e.g. Mama Rosa's Kitchen" value={mName} onChange={e => setMName(e.target.value)} required /></div>
            <div>
              <Label>Category</Label>
              <Select value={mCategory} onValueChange={setMCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {['food', 'retail', 'services', 'education', 'transport', 'other'].map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Address</Label><Input placeholder="Street address or landmark" value={mAddress} onChange={e => setMAddress(e.target.value)} /></div>
            <div>
              <Label className="mb-2 block">Payment methods accepted</Label>
              <div className="grid grid-cols-2 gap-3">
                {['lightning', 'onchain', 'blink', 'lnurlp'].map(m => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={mPayments.includes(m)} onCheckedChange={() => togglePayment(m)} />{' '}
                    {m === 'lnurlp' ? 'LNURL-pay' : m.charAt(0).toUpperCase() + m.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div><Label>Website (optional)</Label><Input placeholder="https://" value={mWebsite} onChange={e => setMWebsite(e.target.value)} /></div>

            <WalletTrackingBlock
              apiKey={mApiKey}
              setApiKey={setMApiKey}
              lnAddress={mLnAddress}
              setLnAddress={setMLnAddress}
              contextLine="Connect your Blink wallet to automatically track your Bitcoin transactions. This helps prove real circular economy activity. Read-only access only. No funds can be moved."
            />

            <Button type="submit" className={amberBtnClass} disabled={loading}>
              {loading ? 'Submitting…' : 'Submit merchant →'}
            </Button>
          </form>
        )}

        {tab === 'earner' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="mb-2 block">How do you earn Bitcoin?</Label>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map(r => (
                  <Pill key={r} active={eRole === r} onClick={() => setERole(r)}>{r}</Pill>
                ))}
              </div>
            </div>

            <div>
              <Label>Describe what you do (optional)</Label>
              <Textarea
                placeholder="e.g. I fix phones and get paid in sats"
                value={eDesc}
                onChange={e => setEDesc(e.target.value)}
                maxLength={500}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="mb-2 block">How often do you earn in Bitcoin?</Label>
              <div className="flex flex-wrap gap-2">
                {FREQUENCY_OPTIONS.map(f => (
                  <Pill key={f} active={eFrequency === f} onClick={() => setEFrequency(f)}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <WalletTrackingBlock
                apiKey={eApiKey}
                setApiKey={setEApiKey}
                lnAddress={eLnAddress}
                setLnAddress={setELnAddress}
                contextLine={`Connect your Blink wallet so your earnings count toward real circularity data for ${community?.name || 'this economy'}. Anonymous — no identity required.`}
                showDisconnectNote
              />
            </div>

            <Button type="submit" className={amberBtnClass} disabled={loading || !eRole}>
              {loading ? 'Submitting…' : 'Submit earner →'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SubmitPage;
