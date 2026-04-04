import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { mockCommunities, getFlagEmoji } from '@/lib/mock-data';

type Tab = 'merchant' | 'earner' | 'transaction';

const SubmitPage = () => {
  const { slug } = useParams();
  const community = mockCommunities.find(c => c.slug === slug) || mockCommunities[0];
  const [tab, setTab] = useState<Tab>('merchant');
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 max-w-lg text-center">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold mb-2">Submission received</h2>
          <p className="text-muted-foreground text-sm">
            Your submission is in the review queue. Community validators will review it within 48 hours.
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
        <div className="text-sm text-muted-foreground mb-1">
          {getFlagEmoji(community.countryCode)} {community.name}
        </div>
        <h1 className="text-2xl font-bold mb-6">Submit Data</h1>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          {(['merchant', 'earner', 'transaction'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize border-b-2 transition-colors ${
                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'merchant' && (
          <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
            <div>
              <Label>Business name</Label>
              <Input placeholder="e.g. Mama Rosa's Kitchen" required />
            </div>
            <div>
              <Label>Category</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {['Food', 'Retail', 'Services', 'Education', 'Transport', 'Other'].map(c => (
                    <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Address</Label>
              <Input placeholder="Street address or landmark" />
            </div>
            <div>
              <Label className="mb-2 block">Payment methods accepted</Label>
              <div className="grid grid-cols-2 gap-3">
                {['Lightning', 'On-chain', 'Blink', 'LNURL-pay'].map(m => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <Checkbox /> {m}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Website or social link (optional)</Label>
              <Input placeholder="https://" />
            </div>
            <Button type="submit" className="w-full">Submit merchant</Button>
          </form>
        )}

        {tab === 'earner' && (
          <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
            <div>
              <Label>Role / Description</Label>
              <Input placeholder="e.g. market vendor, freelancer, employee" required />
            </div>
            <div>
              <Label>How do they earn in Bitcoin?</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct BTC payment</SelectItem>
                  <SelectItem value="converted">Converted from fiat</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment method preference</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['Lightning', 'On-chain', 'Blink', 'LNURL-pay'].map(m => (
                    <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Submit earner</Button>
          </form>
        )}

        {tab === 'transaction' && (
          <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
            <div>
              <Label>Amount (sats)</Label>
              <Input type="number" placeholder="e.g. 50000" required />
            </div>
            <div>
              <Label>Category</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {['Food', 'Goods', 'Services', 'Education', 'Other'].map(c => (
                    <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label>Was this circular?</Label>
                <p className="text-xs text-muted-foreground">Did the sats stay in your community?</p>
              </div>
              <Switch />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <Button type="submit" className="w-full">Submit transaction</Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SubmitPage;
