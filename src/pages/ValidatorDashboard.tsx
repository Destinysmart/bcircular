import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Clock, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { fetchValidatorCommunities, fetchPendingSubmissions, fetchVotesForSubmission, castVote, fetchPendingProofs, updateProofStatus } from '@/lib/api';

const ValidatorEmptyState = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
    <Shield style={{ width: 64, height: 64, marginBottom: 16, color: '#9CA3AF' }} />
    <h3 style={{ color: '#F9FAFB', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No pending submissions</h3>
    <p style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 1.7, maxWidth: 360, marginBottom: 24 }}>
      You'll be notified when community members submit merchants, earners, or transactions for review. Share the submit link to get data flowing.
    </p>
    <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 10, padding: '12px 20px', marginBottom: 24, maxWidth: 360, width: '100%' }}>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Submit link for your community</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <code style={{ fontSize: 12, color: '#F59E0B', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {window.location.origin}/quick-submit
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/quick-submit`);
            sonnerToast.success('Link copied');
          }}
          style={{ background: '#F59E0B', color: '#0A0F1E', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
        >
          Copy
        </button>
      </div>
    </div>
    <p style={{ fontSize: 12, color: '#6B7280' }}>Submissions require 2-of-3 validator approvals to go live</p>
  </div>
);

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
  const [proofs, setProofs] = useState<any[]>([]);
  const [tab, setTab] = useState<'merchant' | 'earner' | 'transaction' | 'proofs'>('merchant');
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
      const allProofs: any[] = [];

      for (const v of validatorData || []) {
        const [pending, pendingProofs] = await Promise.all([fetchPendingSubmissions(v.community_id), fetchPendingProofs(v.community_id)]);
        allProofs.push(...pendingProofs);

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
      setProofs(allProofs);
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

  const handleProofStatus = async (proofId: string, status: 'approved' | 'rejected') => {
    setVoting(proofId);
    try {
      await updateProofStatus(proofId, status);
      toast({ title: `Proof ${status}` });
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
        <p className="text-sm text-muted-foreground mb-6">{items.length + proofs.length} items pending review</p>

        {(() => {
          const counts = {
            merchant: items.filter(i => i.type === 'merchant').length,
            earner: items.filter(i => i.type === 'earner').length,
            transaction: items.filter(i => i.type === 'transaction').length,
            proofs: proofs.length,
          };
          const tabs: { key: typeof tab; label: string }[] = [
            { key: 'merchant', label: 'Merchants' },
            { key: 'earner', label: 'Earners' },
            { key: 'transaction', label: 'Transactions' },
            { key: 'proofs', label: 'Proofs' },
          ];
          return (
            <div className="mb-6 flex border-b border-border">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-sm border-b-2 ${tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'}`}
                >
                  {t.label} ({counts[t.key]})
                </button>
              ))}
            </div>
          );
        })()}

        {tab === 'proofs' ? (
          proofs.length === 0 ? (
            <ValidatorEmptyState />
          ) : (
            <div className="space-y-4">
              {proofs.map(proof => (
                <div key={proof.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-1 flex items-center gap-2"><Badge variant="outline" className="text-xs capitalize">{proof.proof_type}</Badge><span className="font-medium">{proof.title}</span></div>
                      <p className="text-sm text-muted-foreground">{proof.description || 'No description'}{proof.merchant_name ? ` · ${proof.merchant_name}` : ''}{proof.amount_sats ? ` · ${Number(proof.amount_sats).toLocaleString()} sats` : ''}</p>
                    </div>
                    {proof.media_url && <a href={proof.media_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View media</a>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1.5" disabled={voting === proof.id} onClick={() => handleProofStatus(proof.id, 'approved')}><CheckCircle className="h-3.5 w-3.5" /> Approve</Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" disabled={voting === proof.id} onClick={() => handleProofStatus(proof.id, 'rejected')}><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (() => {
          const filtered = items.filter(i => i.type === tab);
          if (filtered.length === 0) return <ValidatorEmptyState />;
          return (
            <div className="space-y-4">
              {filtered.map(item => (
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
          );
        })()}
      </div>
    </div>
  );
};

export default ValidatorDashboard;
