import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { registerCommunity } from '@/lib/api';
import { countries } from '@/lib/countries';
import CountrySelect from '@/components/CountrySelect';

const STEP_LABELS = ['Your Economy', 'Your Area', 'Your Story', 'Your Contact'] as const;

const RegisterCommunity = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();



  const [step, setStep] = useState(1);
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
  const [committed, setCommitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container px-4 sm:px-6 py-12 sm:py-20 max-w-lg" aria-busy="true" aria-live="polite">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 text-center">
            <Loader2 className="h-6 w-6 mx-auto mb-4 text-score-amber animate-spin" />
            <div className="h-6 w-3/4 mx-auto mb-3 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-full mx-auto mb-2 rounded bg-muted animate-pulse" />
            <div className="h-4 w-5/6 mx-auto mb-6 rounded bg-muted animate-pulse" />
            <div className="h-11 w-full mx-auto mb-2 rounded-md bg-muted animate-pulse" />
            <div className="h-11 w-full mx-auto rounded-md bg-muted animate-pulse" />
            <span className="sr-only">Checking your sign-in status…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Seo
          title="Log in to register your Bitcoin economy"
          description="Create a free account to register your Bitcoin economy on Bitcoin Circular."
          path="/register"
          noIndex
        />
        <Navbar />
        <div className="container px-4 sm:px-6 py-12 sm:py-20 max-w-lg">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-score-amber/15 border border-score-amber/30 text-score-amber mb-4">
              <Zap className="h-6 w-6" fill="currentColor" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">Log in to register your economy</h1>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Creating a Bitcoin economy is free and takes ~3 minutes. We just need an account first so you can edit and manage it later.
            </p>
            <div className="flex flex-col gap-2">
              <Link to="/login?signup=1&redirect=/register">
                <Button className="w-full h-11 bg-score-amber text-background hover:bg-score-amber/90 font-semibold">
                  Create free account <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link to="/login?redirect=/register">
                <Button variant="outline" className="w-full h-11">
                  I already have an account — Log in
                </Button>
              </Link>
            </div>
            <p className="text-[11px] text-muted-foreground mt-5">
              Free forever · No funds held · ~3 min to complete
            </p>
          </div>
        </div>
      </div>
    );
  }


  function validateStep(s: number) {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!name.trim()) e.name = 'Economy name is required';
      if (!selectedCountry) e.country = 'Country is required';
    } else if (s === 2) {
      if (!economicZoneDesc.trim()) e.economicZoneDesc = 'Please describe your economic zone';
      if (!declaredPopulation || parseInt(declaredPopulation) < 1) e.declaredPopulation = 'Population is required';
    } else if (s === 3) {
      if (!description.trim()) e.description = 'A short description is required';
      if (!foundingYear) e.foundingYear = 'Founding year is required';
    } else if (s === 4) {
      if (!contactEmail.trim()) e.contactEmail = 'Contact email is required';
      if (!committed) e.committed = 'Please confirm the validator commitment';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1));
  }
  function back() {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) {
      toast({ title: 'Please complete the required fields', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'Login required', description: 'Please log in to register an economy.', variant: 'destructive' });
      navigate('/login');
      return;
    }
    const country = countries.find((c) => c.name === selectedCountry);
    if (!country) {
      toast({ title: 'Please select a valid country', variant: 'destructive' });
      setStep(1);
      return;
    }

    const twitterHandle = twitter.trim().replace(/^@+/, '');

    setLoading(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await registerCommunity({
        name, country: country.name, country_code: country.code,
        city, region: country.region, description, slug,
        declared_population: parseInt(declaredPopulation) || 100,
        economic_zone_description: economicZoneDesc,
        founding_year: parseInt(foundingYear) || undefined,
        website: website.trim() || undefined,
        twitter_handle: twitterHandle || undefined,
        contact_email: contactEmail.trim() || undefined,
      }, user.id);
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container px-4 sm:px-6 py-12 sm:py-20 max-w-xl">
          <div className="rounded-2xl border border-score-amber/30 bg-card p-8 sm:p-10 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-score-amber/15 text-score-amber mb-4">
              <Zap className="h-8 w-8" fill="currentColor" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Your economy has been submitted!</h1>
            <p className="text-sm text-muted-foreground mb-2">
              We'll review and approve within 48 hours.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Check your email at <span className="font-medium text-foreground break-all">{contactEmail}</span> for next steps.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              While you wait — explore active economies on the leaderboard.
            </p>
            <div className="flex flex-col gap-2">
              <Link to="/leaderboard">
                <Button className="w-full h-11 bg-score-amber text-background hover:bg-score-amber/90">
                  View Leaderboard <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" className="w-full h-11">
                  Explore your dashboard <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepTitles: Record<number, { title: string; subtitle: string }> = {
    1: { title: "What's your Bitcoin community called?", subtitle: "Tell us the basics — we'll help you set up the rest." },
    2: { title: 'Where does your economy operate?', subtitle: 'This helps us match your merchants on BTCMap and calculate your coverage.' },
    3: { title: 'Tell us about your community', subtitle: 'This appears on your public economy profile.' },
    4: { title: 'Almost there — how do we reach you?', subtitle: 'Your contact details are never shown publicly.' },
  };

  const current = stepTitles[step];

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Register your Bitcoin Economy"
        description="Add your community to the world's first Bitcoin circular economy intelligence platform. Free, privacy-first, validator-reviewed in 48 hours."
        path="/register"
      />
      <Navbar />
      <div className="container px-4 sm:px-6 py-8 sm:py-12 max-w-[560px]">

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            {[1, 2, 3, 4].map((n, i) => {
              const isDone = n < step;
              const isCurrent = n === step;
              return (
                <div key={n} className="flex items-center flex-1 last:flex-none">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      isCurrent
                        ? 'bg-score-amber text-background'
                        : isDone
                        ? 'bg-score-amber/20 text-score-amber'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : n}
                  </div>
                  {i < 3 && (
                    <div className={`flex-1 h-0.5 mx-2 ${n < step ? 'bg-score-amber/40' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Step {step} of 4 — {STEP_LABELS[step - 1]}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-5 sm:p-7">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">{current.title}</h1>
          <p className="text-sm text-muted-foreground mb-6">{current.subtitle}</p>

          <form onSubmit={handleSubmit} noValidate>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="space-y-4"
              >
                {step === 1 && (
                  <>
                    <div>
                      <Label>Economy name</Label>
                      <Input
                        placeholder="e.g. Bitcoin Beach"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-11"
                      />
                      {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Country</Label>
                        <CountrySelect value={selectedCountry} onChange={setSelectedCountry} />
                        {errors.country && <p className="text-xs text-destructive mt-1">{errors.country}</p>}
                      </div>
                      <div>
                        <Label>City</Label>
                        <Input
                          placeholder="e.g. El Zonte"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="h-11"
                        />
                      </div>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div>
                      <Label>Economic zone description</Label>
                      <Textarea
                        placeholder="Describe the geographic area this economy covers (e.g. 'Ikorodu Local Government Area, Lagos, Nigeria')"
                        value={economicZoneDesc}
                        onChange={(e) => setEconomicZoneDesc(e.target.value)}
                        rows={3}
                      />
                      {errors.economicZoneDesc && <p className="text-xs text-destructive mt-1">{errors.economicZoneDesc}</p>}
                    </div>
                    <div>
                      <Label>Approximate population (people)</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="e.g. 5000"
                        value={declaredPopulation}
                        onChange={(e) => setDeclaredPopulation(e.target.value)}
                        min={1}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Best estimate of how many people live or work in this economic zone. Used for density calculations.
                      </p>
                      {errors.declaredPopulation && <p className="text-xs text-destructive mt-1">{errors.declaredPopulation}</p>}
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Short description of your Bitcoin circular economy"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                      />
                      {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
                    </div>
                    <div>
                      <Label>Founding year (when did Bitcoin activity start?)</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="e.g. 2019"
                        value={foundingYear}
                        onChange={(e) => setFoundingYear(e.target.value)}
                        className="h-11"
                      />
                      {errors.foundingYear && <p className="text-xs text-destructive mt-1">{errors.foundingYear}</p>}
                    </div>
                    <div>
                      <Label>Website (optional)</Label>
                      <Input
                        placeholder="https://"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </>
                )}

                {step === 4 && (
                  <>
                    <div>
                      <Label>Twitter handle (optional)</Label>
                      <Input
                        placeholder="@handle"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div>
                      <Label>Contact email</Label>
                      <Input
                        type="email"
                        placeholder="For the super-admin to reach you"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="h-11"
                      />
                      {errors.contactEmail && <p className="text-xs text-destructive mt-1">{errors.contactEmail}</p>}
                    </div>
                    <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
                      <Checkbox
                        className="mt-0.5"
                        checked={committed}
                        onCheckedChange={(v) => setCommitted(v === true)}
                      />
                      <span>I will appoint at least 2 validators and ensure submitted data is accurate.</span>
                    </label>
                    {errors.committed && <p className="text-xs text-destructive">{errors.committed}</p>}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mt-7">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={back}
                  className="h-11 sm:flex-none sm:px-6"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              {step < 4 ? (
                <Button
                  type="button"
                  onClick={next}
                  className="h-11 flex-1 bg-score-amber text-background hover:bg-score-amber/90"
                >
                  Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading || !user}
                  className="h-11 flex-1 bg-score-amber text-background hover:bg-score-amber/90"
                >
                  {loading ? 'Submitting...' : 'Submit registration'}
                </Button>
              )}
            </div>
            {step === 4 && !user && (
              <p className="text-xs text-destructive mt-2">
                You need to <Link to="/login" className="underline">log in</Link> before submitting.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterCommunity;
