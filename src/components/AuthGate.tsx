import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';

interface Props {
  title?: string;
  message?: string;
}

/**
 * Shown to logged-out visitors on routes that require an account
 * (currently /leaderboard and /compare). Public economy pages at
 * /c/:slug stay fully open and never use this gate.
 */
const AuthGate = ({
  title = 'Join Bitcoin Circular',
  message = 'Sign up to access the full leaderboard, compare economies, and track your Bitcoin circular economy.',
}: Props) => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container py-20 flex items-center justify-center">
      <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center max-w-lg w-full">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-score-amber/15 border border-score-amber/30 text-score-amber mb-4">
          <Zap className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-md mx-auto">
          {message}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/login?signup=1">
            <Button className="rounded-lg px-6 bg-score-amber text-background hover:bg-score-amber/90 font-semibold">
              Create free account
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" className="rounded-lg px-6 border-foreground/20">
              Log in
            </Button>
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground mt-5">Free forever · No funds held · Ever</p>
      </div>
    </div>
  </div>
);

export default AuthGate;
