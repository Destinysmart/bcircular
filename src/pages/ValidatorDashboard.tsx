import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { fetchValidatorCommunities, fetchPendingSubmissions, fetchVotesForSubmission, castVote } from '@/lib/api';

interface PendingItem {
  id: string;
  type: 'merchant' | 'earner' | 'transaction';
  title: string;
  detail: string;
  communityId: string;
  votes: { approve: number; reject: number };
}

const ValidatorDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [voting, setVoting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    loadItems();
  }, [user]);

  const loadItems = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const validatorData = await fetchValidatorCommunities(user.id);
      const allItems: PendingItem[] = [];

      for (const v of validatorData || []) {
        const pending = await fetchPendingSubmissions(v.community_id);

        for (const m of pending.merchants) {
          const votes = await fetchVotesForSubmission(m.id);
          allItems.push({
            id: m.id, type: 'merchant', communityId: v.community_id,
            title: m.name, detail: `Category: ${m.category} · Payment: ${m.payment_methods?.join(', ')}`,
            votes: { approve: votes?.filter(v => v.vote === 'approve').length || 0, reject: votes?.filter(v => v.vote === 'reject').length || 0 },
          });
        }
        for (const e of pending.earners) {
          const votes = await fetchVotesForSubmission(e.id);
          allItems.push({
            id: e.id, type: 'earner', communityId: v.community_id,
            title: e.description, detail: `Method: ${e.earning_method || 'N/A'} · Payment: ${e.payment_method || 'N/A'}`,
            votes: { approve: votes?.filter(v => v.vote === 'approve').length || 0, reject: votes?.filter(v => v.vote === 'reject').length || 0 },
          });
        }
        for (const t of pending.transactions) {
          const votes = await fetchVotesForSubmission(t.id);
          allItems.push({
            id: t.id, type: 'transaction', communityId: v.community_id,
            title: `${t.amount_sats?.toLocaleString()} sats — ${t.category}`,
            detail: `Circular: ${t.is_circular ? 'Yes' : 'No'} · Date: ${t.transaction_date}`,
            votes: { approve: votes?.filter(v => v.vote === 'approve').length || 0, reject: votes?.filter(v => v.vote === 'reject').length || 0 },
          });
        }
      }
      setItems(allItems);
    } catch (err: any) {
      toast({ title: 'Error loading items', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (item: PendingItem, vote: 'approve' | 'reject') => {
    if (!user) return;
    setVoting(item.id);
    try {
      await castVote(item.id, item.type, user.id, vote, notes[item.id]);
      toast({ title: `Vote cast: ${vote}` });
      loadItems();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setVoting(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-1">Validator Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-6">{items.length} items pending review</p>

        {items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No pending submissions to review.</p>
            <p className="text-xs mt-1">You'll see items here when you're appointed as a validator for an economy.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono">{item.votes.approve}/2 approvals</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="gap-1.5" disabled={voting === item.id} onClick={() => handleVote(item, 'approve')}>
                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" disabled={voting === item.id} onClick={() => handleVote(item, 'reject')}>
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                  <Input placeholder="Optional note..." className="h-8 text-xs flex-1 ml-2" value={notes[item.id] || ''} onChange={e => setNotes(prev => ({ ...prev, [item.id]: e.target.value }))} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidatorDashboard;
