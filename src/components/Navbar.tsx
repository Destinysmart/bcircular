import { Link } from 'react-router-dom';
import { Bitcoin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navbar = () => (
  <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
    <div className="container flex h-14 items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <Bitcoin className="h-6 w-6 text-primary" />
        <span className="font-semibold text-lg tracking-tight">Circular</span>
      </Link>
      <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
        <Link to="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</Link>
        <Link to="/register" className="hover:text-foreground transition-colors">Register</Link>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/login">
          <Button variant="ghost" size="sm">Log in</Button>
        </Link>
      </div>
    </div>
  </nav>
);

export default Navbar;
