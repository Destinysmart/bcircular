import { supabase } from '@/integrations/supabase/client';

export type WalletOwnerType = 'merchant' | 'earner';

export type ConnectInput = {
  owner_type: WalletOwnerType;
  code: string;
  api_key: string;
  ln_address?: string | null;
};

async function invoke(action: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('sync-wallet-transactions', {
    body: { action, ...body },
  });
  if (error) throw new Error(error.message || 'Request failed');
  if (data?.error) throw new Error(data.error);
  return data;
}

export const walletApi = {
  connect: (input: ConnectInput) => invoke('connect', input),
  sync: (owner_type: WalletOwnerType, code: string) => invoke('sync', { owner_type, code }),
  disconnect: (owner_type: WalletOwnerType, code: string) => invoke('disconnect', { owner_type, code }),
};

export type OwnerSummary = {
  id: string;
  community_id: string;
  community_name: string;
  community_slug: string;
  community_city: string;
  community_country: string;
  name: string;
  wallet: {
    id: string;
    wallet_status: string;
    last_synced_at: string | null;
    balance_sats: number;
    ln_address_hash: string | null;
  } | null;
};

export async function fetchOwnerByCode(
  owner_type: WalletOwnerType,
  code: string,
): Promise<OwnerSummary | null> {
  if (owner_type === 'merchant') {
    const { data, error } = await (supabase as any)
      .from('merchants')
      .select('id, community_id, name, status, wallet_id, communities:community_id(name, slug, city, country)')
      .eq('merchant_code', code)
      .maybeSingle();
    if (error || !data) return null;
    if (data.status !== 'approved') return null;
    let wallet: any = null;
    const { data: w } = await (supabase as any)
      .from('wallets')
      .select('id, wallet_status, last_synced_at, balance_sats, ln_address_hash')
      .eq('owner_type', 'merchant')
      .eq('owner_id', data.id)
      .maybeSingle();
    wallet = w;
    return {
      id: data.id,
      community_id: data.community_id,
      community_name: data.communities?.name ?? '',
      community_slug: data.communities?.slug ?? '',
      community_city: data.communities?.city ?? '',
      community_country: data.communities?.country ?? '',
      name: data.name,
      wallet,
    };
  } else {
    const { data, error } = await (supabase as any)
      .from('earners')
      .select('id, community_id, description, status, communities:community_id(name, slug, city, country)')
      .eq('earner_code', code)
      .maybeSingle();
    if (error || !data) return null;
    if (data.status !== 'approved') return null;
    const { data: w } = await (supabase as any)
      .from('wallets')
      .select('id, wallet_status, last_synced_at, balance_sats, ln_address_hash')
      .eq('owner_type', 'earner')
      .eq('owner_id', data.id)
      .maybeSingle();
    return {
      id: data.id,
      community_id: data.community_id,
      community_name: data.communities?.name ?? '',
      community_slug: data.communities?.slug ?? '',
      community_city: data.communities?.city ?? '',
      community_country: data.communities?.country ?? '',
      name: data.description,
      wallet: w,
    };
  }
}

export async function fetchWalletTransactions(walletId: string, limit = 20) {
  const { data, error } = await (supabase as any)
    .from('blink_transactions')
    .select('id, direction, settlement_amount, is_internal, blink_created_at')
    .eq('wallet_id', walletId)
    .order('blink_created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchWalletMonthlyStats(walletId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data, error } = await (supabase as any)
    .from('blink_transactions')
    .select('direction, settlement_amount, is_internal')
    .eq('wallet_id', walletId)
    .gte('blink_created_at', since.toISOString());
  if (error) throw error;
  const list = data || [];
  let received = 0, sent = 0, circular = 0;
  for (const t of list) {
    const amt = Number(t.settlement_amount) || 0;
    if (t.direction === 'RECEIVE') received += amt; else sent += amt;
    if (t.is_internal) circular += amt;
  }
  const total = received + sent;
  const rate = total > 0 ? Math.round((circular / total) * 100) : 0;
  return { received, sent, circular, rate, count: list.length };
}

export async function fetchEconomyWalletMetrics(communityId: string) {
  const { data, error } = await (supabase as any)
    .from('economy_wallet_metrics')
    .select('*')
    .eq('community_id', communityId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
