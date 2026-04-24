import { useAuth } from '@/contexts/AuthContext';
import Homepage from '@/pages/Homepage';
import Home from '@/pages/Home';

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Home /> : <Homepage gated />;
};

export default RootRedirect;
