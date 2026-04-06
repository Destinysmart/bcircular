import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { submitMerchant, submitEarner, submitTransaction, fetchCommunityBySlug } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

type Tab = 'merchant' | 'earner' | 'transaction';

const SubmitPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('merchant');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Merchant form state
  const [mName, setMName] = useState('');
  const [mCategory, setMCategory] = useState('');
  const [mAddress, setMAddress] = useState('');
  const [mPayments, setMPayments] = useState<string[]>([]);
  const [mWebsite, setMWebsite] = useState('');

  // Earner form state
  const [eDesc, setEDesc] = useState('');
  const [eMethod, setEMethod] = useState('');
  const [ePayment, setEPayment] = useState('');

  // Transaction form state
  const [tAmount, setTAmount] = useState('');
  const [tCategory, setTCategory] = useState('');
  const [tCircular, setTCircular] = useState(false);
  const [tDate, setTDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => fetchCommunityBySlug(slug!),
    enabled: !!slug,
  });

  const togglePayment = (method: string) => {
    setMPayments(prev => prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!community) return;
    setLoading(true);
    try {
      if (tab === 'merchant') {
        await submitMerchant(community.id, {
          name: mName, category: mCategory, address: mAddress,
          payment_methods: mPayments, website: mWebsite || undefined,
        }, user?.id);
      } else if (tab === 'earner') {
        await submitEarner(community.id, {
          description: eDesc, earning_method: eMethod, payment_method: ePayment,
        }, user?.id);
      } else {
        await submitTransaction(community.id, {
          amount_sats: parseInt(tAmount), category: tCategory,
          is_circular: tCircular, transaction_date: tDate,
        }, user?.id);
      }
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 max-w-lg text-center">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold mb-2">Submission received</h2>
          <p className="text-muted-foreground text-sm">
            Your submission is in the review queue. Economy validators will review it within 48 hours.
          </p>
          <Button className="mt-6" onClick={() => setSubmitted(false)}>Submit another</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-lg">
        <div className="text-sm text-muted-foreground mb-1">{community?.name || slug}</div>
        <h1 className="text-2xl font-bold mb-6">Submit Data</h1>

        <div className="flex border-b border-border mb-6">
          {(['merchant', 'earner', 'transaction'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize border-b-2 transition-colors ${tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >{t}</button>
          ))}
        </div>

        {tab === 'merchant' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Business name</Label><Input placeholder="e.g. Mama Rosa's Kitchen" value={mName} onChange={e => setMName(e.target.value)} required /></div>
            <div><Label>Category</Label>
              <Select value={mCategory} onValueChange={setMCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{['food', 'retail', 'services', 'education', 'transport', 'other'].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Address</Label><Input placeholder="Street address or landmark" value={mAddress} onChange={e => setMAddress(e.target.value)} /></div>
            <div><Label className="mb-2 block">Payment methods accepted</Label>
              <div className="grid grid-cols-2 gap-3">
                {['lightning', 'onchain', 'blink', 'lnurlp'].map(m => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={mPayments.includes(m)} onCheckedChange={() => togglePayment(m)} /> {m === 'lnurlp' ? 'LNURL-pay' : m.charAt(0).toUpperCase() + m.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div><Label>Website (optional)</Label><Input placeholder="https://" value={mWebsite} onChange={e => setMWebsite(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Submitting...' : 'Submit merchant'}</Button>
          </form>
        )}

        {tab === 'earner' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Role / Description</Label><Input placeholder="e.g. market vendor, freelancer" value={eDesc} onChange={e => setEDesc(e.target.value)} required /></div>
            <div><Label>How do they earn in Bitcoin?</Label>
              <Select value={eMethod} onValueChange={setEMethod}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct BTC payment</SelectItem>
                  <SelectItem value="converted">Converted from fiat</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Payment method preference</Label>
              <Select value={ePayment} onValueChange={setEPayment}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{['lightning', 'onchain', 'blink', 'lnurlp'].map(m => <SelectItem key={m} value={m}>{m === 'lnurlp' ? 'LNURL-pay' : m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Submitting...' : 'Submit earner'}</Button>
          </form>
        )}

        {tab === 'transaction' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Amount (sats)</Label><Input type="number" placeholder="e.g. 50000" value={tAmount} onChange={e => setTAmount(e.target.value)} required /></div>
            <div><Label>Category</Label>
              <Select value={tCategory} onValueChange={setTCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{['food', 'goods', 'services', 'education', 'other'].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div><Label>Was this circular?</Label><p className="text-xs text-muted-foreground">Did the sats stay in your community?</p></div>
              <Switch checked={tCircular} onCheckedChange={setTCircular} />
            </div>
            <div><Label>Date</Label><Input type="date" value={tDate} onChange={e => setTDate(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Submitting...' : 'Submit transaction'}</Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SubmitPage;
