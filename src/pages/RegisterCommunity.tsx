import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const countries = ['El Salvador', 'Nigeria', 'South Africa', 'Costa Rica', 'Guatemala', 'Switzerland', 'Philippines', 'Senegal', 'Brazil', 'Colombia', 'Kenya', 'Ghana', 'Mexico', 'Argentina', 'Other'];

const RegisterCommunity = () => {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 max-w-lg text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-xl font-semibold mb-2">Registration submitted</h2>
          <p className="text-muted-foreground text-sm">
            We'll review your community application and get back to you within a few days.
            Once approved, you'll be able to appoint validators and start tracking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-lg">
        <h1 className="text-2xl font-bold mb-1">Register Your Community</h1>
        <p className="text-sm text-muted-foreground mb-6">Start tracking your Bitcoin circular economy.</p>

        <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
          <div>
            <Label>Community name</Label>
            <Input placeholder="e.g. Bitcoin Beach" required />
          </div>
          <div>
            <Label>Country</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>City</Label>
            <Input placeholder="e.g. El Zonte" required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea placeholder="Short description of your community's Bitcoin economy" rows={3} />
          </div>
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-medium mb-3">Admin account</h3>
            <div className="space-y-3">
              <div>
                <Label>Your name</Label>
                <Input placeholder="Full name" required />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="you@example.com" required />
              </div>
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <Checkbox className="mt-0.5" />
            <span>I will appoint at least 2 validators and ensure submitted data is accurate.</span>
          </label>
          <Button type="submit" className="w-full">Submit registration</Button>
        </form>
      </div>
    </div>
  );
};

export default RegisterCommunity;
