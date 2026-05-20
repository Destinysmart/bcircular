import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import circularLogo from '@/assets/circular-logo.png';

const Login = () => {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const signupParam = searchParams.get('signup') === '1';
  const [isSignup, setIsSignup] = useState(signupParam);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, redirectTo, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: 'Check your email', description: 'We sent you a password reset link.' });
        setIsForgot(false);
      } else if (isSignup) {
        const { error } = await signUp(email, password, name);
        if (error) throw error;
        toast({ title: 'Account created', description: 'Check your email to confirm your account.' });
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate(redirectTo);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const title = isForgot ? 'Reset password' : isSignup ? 'Create account' : 'Welcome back';
  const subtitle = isForgot
    ? 'Enter your email and we\'ll send you a reset link.'
    : isSignup
      ? 'Sign up to track submissions and validate data.'
      : 'Log in to manage your economy.';

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={isSignup ? 'Sign Up' : isForgot ? 'Reset Password' : 'Log In'}
        description="Sign in to Bitcoin Circular to manage your economy, validate submissions, and track real-time circular flow data."
        path="/login"
        noIndex
      />
      <Navbar />
      <div className="container flex items-center justify-center py-20">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <img src={circularLogo} alt="Circular" className="mx-auto mb-4 h-16 w-auto object-contain" />
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && !isForgot && (
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            {!isForgot && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Password</Label>
                  {!isSignup && (
                    <button
                      type="button"
                      onClick={() => { setIsForgot(true); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading ? 'Loading...' : isForgot ? 'Send reset link' : isSignup ? 'Sign up' : 'Log in'}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {isForgot ? (
              <button onClick={() => setIsForgot(false)} className="text-primary hover:underline">
                Back to login
              </button>
            ) : (
              <>
                {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button onClick={() => setIsSignup(!isSignup)} className="text-primary hover:underline">
                  {isSignup ? 'Log in' : 'Sign up'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
