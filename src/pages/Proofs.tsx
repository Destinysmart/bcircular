import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, ImageIcon, Upload, Video, Zap, Recycle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { fetchCommunityBySlug, fetchProofs, submitProof } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type ProofType = 'photo' | 'video' | 'receipt' | 'screenshot';

const Proofs = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [proofType, setProofType] = useState<ProofType>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [merchantName, setMerchantName] = useState('');
  const [amountSats, setAmountSats] = useState('');
  const [isCircular, setIsCircular] = useState(true);

  const { data: community, isLoading } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => fetchCommunityBySlug(slug!),
    enabled: !!slug,
  });

  const { data: proofs } = useQuery({
    queryKey: ['proofs', community?.id],
    queryFn: () => fetchProofs(community!.id),
    enabled: !!community?.id,
  });

  const acceptedTypes = useMemo(() => {
    if (proofType === 'video') return 'video/mp4,video/webm';
    if (proofType === 'receipt') return 'application/pdf,image/jpeg,image/png';
    return 'image/jpeg,image/png';
  }, [proofType]);

  const handleOpenSubmit = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!community || !user || !title.trim()) return;
    setSubmitting(true);
    try {
      let mediaUrl: string | null = null;
      if (file) {
        if (file.size > 20 * 1024 * 1024) throw new Error('Proof media must be 20MB or less.');
        const ext = file.name.split('.').pop() || 'upload';
        const path = `${community.id}/${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('proof-media').upload(path, file);
        if (uploadError) throw uploadError;
        mediaUrl = supabase.storage.from('proof-media').getPublicUrl(path).data.publicUrl;
      }
      await submitProof({
        community_id: community.id,
        submitted_by: user.id,
        title: title.trim(),
        description: description.trim() || null,
        proof_type: proofType,
        media_url: mediaUrl,
        merchant_name: merchantName.trim() || null,
        amount_sats: amountSats ? Number(amountSats) : null,
        is_circular: isCircular,
      });
      setSubmitted(true);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['proofs', community.id] });
    } catch (err: any) {
      toast({ title: 'Proof submission failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center text-muted-foreground">Loading…</div></div>;
  if (!community) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center">Economy not found</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">Proof of Circularity — {community.name}</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">Real Bitcoin transactions happening in this economy. Submitted by community members, verified by validators.</p>
          </div>
          <Button onClick={handleOpenSubmit} variant="outline" className="gap-1.5 border-score-amber text-score-amber hover:text-score-amber"><Upload className="h-4 w-4" /> Submit Proof</Button>
        </div>

        {submitted && (
          <div className="mb-6 rounded-lg border border-score-green/40 bg-score-green/10 p-4 text-sm text-score-green">Your proof is under review. Validators will approve it within 48 hours.</div>
        )}

        {!proofs || proofs.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">No proofs submitted yet. Be the first to document a Bitcoin transaction in {community.name}.</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {proofs.map((proof: any) => (
              <article key={proof.id} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex aspect-video items-center justify-center bg-secondary/50">
                  {proof.proof_type === 'video' && proof.media_url ? <video src={proof.media_url} controls className="h-full w-full object-cover" /> : null}
                  {['photo', 'screenshot'].includes(proof.proof_type) && proof.media_url ? <img src={proof.media_url} alt={proof.title} className="h-full w-full object-cover" /> : null}
                  {proof.proof_type === 'receipt' ? <FileText className="h-10 w-10 text-muted-foreground" /> : null}
                  {!proof.media_url && proof.proof_type !== 'receipt' ? proof.proof_type === 'video' ? <Video className="h-10 w-10 text-muted-foreground" /> : <ImageIcon className="h-10 w-10 text-muted-foreground" /> : null}
                </div>
                <div className="p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {proof.is_circular && <Badge className="rounded-full inline-flex items-center gap-1"><Recycle className="h-3 w-3" /> Circular transaction</Badge>}
                    {proof.amount_sats ? <span className="font-mono text-xs text-score-amber inline-flex items-center gap-1"><Zap className="w-3 h-3" style={{ color: '#F7931A' }} />{Number(proof.amount_sats).toLocaleString()} sats</span> : null}
                  </div>
                  <h2 className="font-semibold mb-1">{proof.title}</h2>
                  {proof.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{proof.description}</p>}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {proof.merchant_name && <p>Merchant: {proof.merchant_name}</p>}
                    <p>{new Date(proof.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm sm:items-center sm:justify-center">
          <form onSubmit={handleSubmit} className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-border bg-card p-5 shadow-lg sm:max-w-lg sm:rounded-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Submit Proof</h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
            </div>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} required maxLength={120} /></div>
              <div><Label>Description (optional)</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={800} /></div>
              <div><Label>Proof type</Label><Select value={proofType} onValueChange={(value) => setProofType(value as ProofType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="photo">Photo</SelectItem><SelectItem value="video">Video</SelectItem><SelectItem value="receipt">Receipt</SelectItem><SelectItem value="screenshot">Screenshot</SelectItem></SelectContent></Select></div>
              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/40 p-4 text-center text-sm text-muted-foreground">
                <Upload className="mb-2 h-5 w-5" />
                {file ? file.name : 'Drag and drop or click to upload'}
                <input className="hidden" type="file" accept={acceptedTypes} onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              <div><Label>Merchant name (optional)</Label><Input value={merchantName} onChange={e => setMerchantName(e.target.value)} maxLength={120} /></div>
              <div><Label>Amount in sats (optional)</Label><Input type="number" min="0" value={amountSats} onChange={e => setAmountSats(e.target.value)} /></div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3"><Label>Was this a circular transaction?</Label><Switch checked={isCircular} onCheckedChange={setIsCircular} /></div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit proof'}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Proofs;
