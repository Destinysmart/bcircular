import { Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, Shield, Settings, X, Sun, Moon, Home, Trophy, BarChart2, PlusCircle, CheckCircle } from 'lucide-react';
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
    { to: '/', label: 'Home', Icon: Home },
    { to: '/leaderboard', label: 'Leaderboard', Icon: Trophy },
    { to: '/compare', label: 'Compare', Icon: BarChart2 },
    { to: '/register', label: 'Register', Icon: PlusCircle },
    ...(user ? [{ to: '/validate', label: 'Validate', Icon: CheckCircle }] : []),
  ];

  const displayName = profile?.display_name || user?.email?.split('@')[0] || '';
  const initials = (profile?.display_name || user?.email || '?').slice(0, 2).toUpperCase();

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
          <button
            onClick={toggleTheme}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
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
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-2 py-2 divide-y divide-border">
            {navLinks.map(link => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-3 px-3 py-4 text-sm rounded-md transition-colors ${
                    active ? 'text-[#F7931A] font-semibold' : 'text-foreground hover:bg-secondary'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  <link.Icon size={18} className={active ? 'text-[#F7931A]' : 'text-muted-foreground'} />
                  {link.label}
                </Link>
              );
            })}
            {profile?.is_super_admin && (
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-3 py-4 text-sm rounded-md transition-colors ${
                  location.pathname === '/admin' ? 'text-[#F7931A] font-semibold' : 'text-foreground hover:bg-secondary'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                <Settings size={18} className={location.pathname === '/admin' ? 'text-[#F7931A]' : 'text-muted-foreground'} />
                Admin
              </Link>
            )}
          </div>
          {user && (
            <div className="border-t border-border px-4 py-4 bg-secondary/30">
              <Link to="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{displayName}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
              </Link>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => { setMobileOpen(false); signOut(); }}>
                <LogOut className="h-4 w-4" /> Log out
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
