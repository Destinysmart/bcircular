import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, LocateFixed, Plus, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchCommunities, submitEarner, submitMerchant, submitTransaction } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import circularLogo from '@/assets/circular-logo.png';

type SubmitKind = 'merchant' | 'earner' | 'transaction';

const categories = [
  ['🍔', 'Food', 'food'], ['🛍️', 'Retail', 'retail'], ['💈', 'Services', 'services'],
  ['🚌', 'Transport', 'transport'], ['📚', 'Education', 'education'], ['🏠', 'Other', 'other'],
];

const QuickSubmit = () => {
  const [params] = useSearchParams();
  const presetSlug = params.get('economy') || '';
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: economies } = useQuery({ queryKey: ['communities'], queryFn: fetchCommunities });
  const economy = useMemo(() => economies?.find(e => e.slug === presetSlug) || economies?.[0], [economies, presetSlug]);
  const [kind, setKind] = useState<SubmitKind | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('food');
  const [payment, setPayment] = useState('lightning');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [location, setLocation] = useState('');
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const useLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setLatLng({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      },
      () => toast({ title: 'Location unavailable', description: 'Enter the location manually instead.', variant: 'destructive' })
    );
  };

  const handleSubmit = async () => {
    if (!economy || !kind) return;
    setLoading(true);
    try {
      if (!user) {
        if (!email) throw new Error('Enter your email to track your submission.');
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
        if (error) throw error;
        setSuccess(true);
        return;
      }
      if (kind === 'merchant') {
        await submitMerchant(economy.id, {
          name,
          category,
          address: address || location,
          lat: latLng?.lat,
          lng: latLng?.lng,
          payment_methods: payment === 'both' ? ['lightning', 'onchain'] : [payment],
          website: website || undefined,
        }, user.id);
      } else if (kind === 'earner') {
        await submitEarner(economy.id, { description: name, earning_method: category, payment_method: payment }, user.id);
      } else {
        await submitTransaction(economy.id, { amount_sats: Number(name) || 0, category, is_circular: true, transaction_date: new Date().toISOString().slice(0, 10) }, user.id);
      }
      setSuccess(true);
    } catch (err: any) {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <div className="min-h-screen bg-background px-4 py-8"><div className="mx-auto flex min-h-[80vh] max-w-sm flex-col items-center justify-center text-center"><motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><CheckCircle className="mb-5 h-16 w-16 text-score-green" /></motion.div><h1 className="mb-2 text-2xl font-bold">Submission received!</h1><p className="mb-6 text-sm text-muted-foreground">{user ? 'Validators will review within 48 hours.' : 'Check your email to sign in and finalise tracking your submission.'}</p><Button className="mb-3 min-h-11 w-full" onClick={() => { setKind(null); setName(''); setSuccess(false); }}>Submit another</Button>{economy && <Link className="text-sm text-primary" to={`/c/${economy.slug}`}>View {economy.name} dashboard</Link>}</div></div>;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5">
      <div className="mx-auto max-w-sm">
        <div className="mb-5 flex items-center gap-2"><img src={circularLogo} alt="Circular" className="h-9 w-auto object-contain" /><div><h1 className="font-semibold">Quick Submit</h1><p className="text-xs text-muted-foreground">{economy?.name || 'Select economy'}</p></div></div>
        {!kind ? (
          <section className="space-y-3">
            <h2 className="text-xl font-bold">What are you submitting?</h2>
            {[['merchant', '🏪 A merchant that accepts Bitcoin'], ['earner', '👤 Someone who earns in Bitcoin'], ['transaction', '⚡ A Bitcoin transaction I made']].map(([value, label]) => <button key={value} onClick={() => setKind(value as SubmitKind)} className="min-h-14 w-full rounded-lg border border-border bg-card px-4 text-left text-base font-medium">{label}</button>)}
          </section>
        ) : (
          <section className="space-y-5">
            <div><Label>{kind === 'transaction' ? 'Amount in sats' : kind === 'merchant' ? 'Business name' : 'Description'}</Label><Input className="min-h-12 text-base" type={kind === 'transaction' ? 'number' : 'text'} value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label>Category</Label><div className="mt-2 grid grid-cols-2 gap-2">{categories.map(([emoji, label, value]) => <button key={value} onClick={() => setCategory(value)} className={`min-h-11 rounded-lg border px-2 text-sm ${category === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'}`}>{emoji} {label}</button>)}</div></div>
            <div><Label>Payment method</Label><div className="mt-2 grid grid-cols-3 gap-2">{['lightning', 'onchain', 'both'].map(value => <button key={value} onClick={() => setPayment(value)} className={`min-h-11 rounded-lg border text-sm capitalize ${payment === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'}`}>{value === 'onchain' ? 'On-chain' : value}</button>)}</div></div>
            {kind === 'merchant' && <div><Button type="button" variant="ghost" className="min-h-11 w-full justify-start gap-1.5" onClick={() => setShowMore(!showMore)}><Plus className="h-4 w-4" /> Add more details</Button>{showMore && <div className="mt-3 space-y-3"><Input placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} /><Input placeholder="Website" value={website} onChange={e => setWebsite(e.target.value)} /></div>}</div>}
            <div className="space-y-2"><Button type="button" variant="outline" className="min-h-11 w-full gap-1.5" onClick={useLocation}><LocateFixed className="h-4 w-4" /> Use my current location</Button><Input className="min-h-11" placeholder="Or enter location manually" value={location} onChange={e => setLocation(e.target.value)} /></div>
            {!user && <div><Label>Enter your email to track your submission</Label><Input className="min-h-12 text-base" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>}
            <Button className="min-h-12 w-full gap-1.5" onClick={handleSubmit} disabled={loading || !name}><Zap className="h-4 w-4" /> {loading ? 'Submitting…' : user ? 'Submit' : 'Send magic link'}</Button>
          </section>
        )}
      </div>
    </main>
  );
};

export default QuickSubmit;
