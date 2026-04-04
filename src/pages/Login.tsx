import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bitcoin } from 'lucide-react';

const Login = () => {
  const [isSignup, setIsSignup] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container flex items-center justify-center py-16">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <Bitcoin className="h-8 w-8 text-primary mx-auto mb-3" />
            <h1 className="text-xl font-semibold">{isSignup ? 'Create account' : 'Welcome back'}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignup ? 'Sign up to track submissions and validate data.' : 'Log in to manage your community.'}
            </p>
          </div>

          <form onSubmit={e => e.preventDefault()} className="space-y-4">
            {isSignup && (
              <div>
                <Label>Name</Label>
                <Input placeholder="Full name" />
              </div>
            )}
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full">
              {isSignup ? 'Sign up' : 'Log in'}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => setIsSignup(!isSignup)} className="text-primary hover:underline">
              {isSignup ? 'Log in' : 'Sign up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
