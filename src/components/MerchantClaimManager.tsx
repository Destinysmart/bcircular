import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Link as LinkIcon, Copy, Unlink, ExternalLink, Users } from 'lucide-react';

interface Props {
  communityId: string;
}

const MerchantClaimManager = ({ communityId }: Props) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState<string | null>(null);
  const [linkModal, setLinkModal] = useState<{ url: string; publicId: string } | null>(null);

  const { data: merchants, isLoading } = useQuery({
    queryKey: ['admin-merchants-claim', communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('id, name, category, public_merchant_id, wallet_id, claimed_at, status')
        .eq('community_id', communityId)
        .eq('status', 'approved')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const handleGenerate = async (merchantId: string) => {
    setGenerating(merchantId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-merchant-token', {
        body: { merchant_id: merchantId },
      });
      if (error) throw error;
      const payload = data as any;
      if (payload?.error) throw new Error(payload.error);
      const url = `${window.location.origin}/merchant/claim/${payload.public_merchant_id}?token=${payload.claim_token}`;
      setLinkModal({ url, publicId: payload.public_merchant_id });
      qc.invalidateQueries({ queryKey: ['admin-merchants-claim', communityId] });
    } catch (err: any) {
      toast({ title: 'Could not generate link', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  const handleUnlink = async (merchantId: string) => {
    const { error } = await supabase
      .from('merchants')
      .update({ wallet_id: null, claimed_at: null })
      .eq('id', merchantId);
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin-merchants-claim', communityId] });
    toast({ title: 'Wallet unlinked' });
  };

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold">Merchant wallets</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Generate a one-time claim link so an approved merchant can privately link their Blink wallet — no identity required.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !merchants || merchants.length === 0 ? (
        <p className="text-sm text-muted-foreground">No approved merchants yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {merchants.map((m: any) => (
            <div key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{m.name}</span>
                  <Badge variant="outline" className="text-xs capitalize">{m.category}</Badge>
                  {m.public_merchant_id && (
                    <span className="font-mono text-xs text-muted-foreground">{m.public_merchant_id}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  {m.wallet_id ? (
                    <><Wallet className="h-3 w-3 text-score-green" /> Wallet linked {m.claimed_at && `· ${new Date(m.claimed_at).toLocaleDateString()}`}</>
                  ) : (
                    <><Wallet className="h-3 w-3" /> Not linked</>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.public_merchant_id && (
                  <Button asChild variant="ghost" size="sm" className="gap-1.5">
                    <a href={`/m/${m.public_merchant_id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </a>
                  </Button>
                )}
                {m.wallet_id ? (
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => handleUnlink(m.id)}>
                    <Unlink className="h-3.5 w-3.5 text-destructive" /> Unlink
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleGenerate(m.id)}
                    disabled={generating === m.id}
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    {generating === m.id ? 'Generating…' : 'Claim link'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!linkModal} onOpenChange={(o) => !o && setLinkModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>One-time claim link</DialogTitle>
            <DialogDescription>
              Share this link privately with the merchant. It's shown only once and can only be used to link a wallet to <span className="font-mono text-foreground">{linkModal?.publicId}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={linkModal?.url || ''} className="font-mono text-xs" />
            <Button onClick={() => linkModal && copy(linkModal.url)} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkModal(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default MerchantClaimManager;
