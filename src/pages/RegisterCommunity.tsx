import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { registerCommunity } from '@/lib/api';

const countries = [
  { name: 'El Salvador', code: 'SV', region: 'Latin America' },
  { name: 'Nigeria', code: 'NG', region: 'Africa' },
  { name: 'South Africa', code: 'ZA', region: 'Africa' },
  { name: 'Costa Rica', code: 'CR', region: 'Latin America' },
  { name: 'Guatemala', code: 'GT', region: 'Latin America' },
  { name: 'Switzerland', code: 'CH', region: 'Europe' },
  { name: 'Philippines', code: 'PH', region: 'Asia' },
  { name: 'Senegal', code: 'SN', region: 'Africa' },
  { name: 'Brazil', code: 'BR', region: 'Latin America' },
  { name: 'Colombia', code: 'CO', region: 'Latin America' },
  { name: 'Kenya', code: 'KE', region: 'Africa' },
  { name: 'Ghana', code: 'GH', region: 'Africa' },
  { name: 'Mexico', code: 'MX', region: 'Latin America' },
  { name: 'Argentina', code: 'AR', region: 'Latin America' },
];

const RegisterCommunity = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [declaredPopulation, setDeclaredPopulation] = useState('');
  const [economicZoneDesc, setEconomicZoneDesc] = useState('');
  const [foundingYear, setFoundingYear] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Login required', description: 'Please log in to register an economy.', variant: 'destructive' });
      navigate('/login');
      return;
    }
    const country = countries.find(c => c.name === selectedCountry);
    if (!country) return;

    setLoading(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await registerCommunity({
        name, country: country.name, country_code: country.code,
        city, region: country.region, description, slug,
        declared_population: parseInt(declaredPopulation) || 100,
        economic_zone_description: economicZoneDesc,
        founding_year: parseInt(foundingYear) || undefined,
        website: website || undefined,
        twitter_handle: twitter || undefined,
        contact_email: contactEmail || undefined,
      }, user.id);
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
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-xl font-semibold mb-2">Your economy is pending approval</h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Here's what happens next:</p>
            <ul className="text-left list-disc list-inside space-y-1">
              <li>A super-admin will review your registration within 48 hours</li>
              <li>You'll receive an email once your economy is approved</li>
              <li>Then you can start appointing validators and submitting data</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-lg">
        <h1 className="text-2xl font-bold mb-1">Register Your Circular Economy</h1>
        <p className="text-sm text-muted-foreground mb-6">Start tracking your Bitcoin circular economy.</p>
        {!user && <p className="text-sm text-primary mb-4">You'll need to <a href="/login" className="underline">log in</a> to register an economy.</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Economy name</Label><Input placeholder="e.g. Bitcoin Beach" value={name} onChange={e => setName(e.target.value)} required /></div>
          <div><Label>Country</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>{countries.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>City</Label><Input placeholder="e.g. El Zonte" value={city} onChange={e => setCity(e.target.value)} required /></div>
          <div>
            <Label>Economic zone description</Label>
            <Textarea placeholder="Describe the geographic area this economy covers (e.g. 'Ikorodu Local Government Area, Lagos, Nigeria')" value={economicZoneDesc} onChange={e => setEconomicZoneDesc(e.target.value)} rows={2} />
          </div>
          <div><Label>Description</Label><Textarea placeholder="Short description of your Bitcoin circular economy" value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
          <div>
            <Label>Approximate population (people)</Label>
            <Input type="number" placeholder="e.g. 5000" value={declaredPopulation} onChange={e => setDeclaredPopulation(e.target.value)} required min={1} />
            <p className="text-xs text-muted-foreground mt-1">Best estimate of how many people live or work in this economic zone. Used for density calculations.</p>
          </div>
          <div><Label>Founding year (when did Bitcoin activity start?)</Label><Input type="number" placeholder="e.g. 2019" value={foundingYear} onChange={e => setFoundingYear(e.target.value)} /></div>
          <div><Label>Website (optional)</Label><Input placeholder="https://" value={website} onChange={e => setWebsite(e.target.value)} /></div>
          <div><Label>Twitter handle (optional)</Label><Input placeholder="@handle" value={twitter} onChange={e => setTwitter(e.target.value)} /></div>
          <div><Label>Contact email</Label><Input type="email" placeholder="For the super-admin to reach you" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <Checkbox className="mt-0.5" />
            <span>I will appoint at least 2 validators and ensure submitted data is accurate.</span>
          </label>
          <Button type="submit" className="w-full" disabled={loading || !user}>{loading ? 'Submitting...' : 'Submit registration'}</Button>
        </form>
      </div>
    </div>
  );
};

export default RegisterCommunity;
