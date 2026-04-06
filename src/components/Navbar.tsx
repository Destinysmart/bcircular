import { Link } from 'react-router-dom';
import { Bitcoin, LogOut, Menu, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['my-profile-nav', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('is_super_admin').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Bitcoin className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg tracking-tight">Circular</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</Link>
          <Link to="/register" className="hover:text-foreground transition-colors">Register</Link>
          {user && <Link to="/validate" className="hover:text-foreground transition-colors">Validate</Link>}
          {profile?.is_super_admin && (
            <Link to="/admin" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
          )}
          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-border p-4 space-y-2 text-sm">
          <Link to="/leaderboard" className="block py-1 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Leaderboard</Link>
          <Link to="/register" className="block py-1 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Register</Link>
          {user && <Link to="/validate" className="block py-1 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Validate</Link>}
          {profile?.is_super_admin && (
            <Link to="/admin" className="block py-1 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Admin</Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
