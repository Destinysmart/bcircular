import { Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, Shield, Settings, X, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import circularLogo from '@/assets/circular-logo.png';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['my-profile-nav', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('is_super_admin, display_name, avatar_url').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/compare', label: 'Compare' },
    { to: '/register', label: 'Register' },
    ...(user ? [{ to: '/validate', label: 'Validate' }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={circularLogo} alt="Circular" className="h-9 w-auto object-contain" />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`border-b-2 px-3 py-2 text-sm rounded-md transition-colors ${location.pathname === link.to ? 'border-score-amber text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
            >
              {link.label}
            </Link>
          ))}
          {profile?.is_super_admin && (
            <Link
              to="/admin"
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors flex items-center gap-1.5"
            >
              <Shield className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/settings" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || ''} />
                  <AvatarFallback className="text-[10px] font-medium bg-primary/10 text-primary">
                    {(profile?.display_name || user.email || '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground hidden sm:inline truncate max-w-[140px]">
                  {profile?.display_name || user.email}
                </span>
              </Link>
              <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm" variant="outline">Log in</Button>
            </Link>
          )}
          <button
            className="md:hidden p-2 rounded-md hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {profile?.is_super_admin && (
            <Link to="/admin" className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary" onClick={() => setMobileOpen(false)}>Admin</Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
