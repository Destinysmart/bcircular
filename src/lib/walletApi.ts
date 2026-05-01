import { supabase } from '@/integrations/supabase/client';

export type WalletOwnerType = 'merchant' | 'earner';

export type ConnectInput = {
  owner_type: WalletOwnerType;
  code: string;
  api_key: string;
  ln_address?: string | null;
};

async function invokeFunction(functionName: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });
  if (error) {
    let message = error.message || 'Request failed';
    const response = (error as any).context;
    if (response?.clone) {
      try {
        const payload = await response.clone().json();
        message = payload?.error || payload?.message || message;
      } catch (_) {
        // Keep the original SDK error if the response body is not JSON.
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

async function invoke(action: string, body: Record<string, unknown>) {
  return invokeFunction('sync-wallet-transactions', { action, ...body });
}

export const walletApi = {
  connect: (input: ConnectInput) => invoke('connect', input),
  sync: (owner_type: WalletOwnerType, code: string) => invoke('sync', { owner_type, code }),
  syncWallet: (community_id: string, wallet_id: string) => invoke('sync_wallet', { community_id, wallet_id }),
  dashboard: (code: string, owner_type?: WalletOwnerType) => invoke('dashboard', { code, ...(owner_type ? { owner_type } : {}) }),
  testConnection: (community_id: string, wallet_id: string) => invokeFunction('test-wallet-connection', { community_id, wallet_id }),
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

/** Auto-detect owner type from a code prefix (mer_ / ear_) and fetch the owner. */
export async function fetchOwnerByAnyCode(
  code: string,
): Promise<{ owner: OwnerSummary; owner_type: WalletOwnerType } | null> {
  if (!code) return null;
  const trimmed = code.trim();
  // Try the prefix hint first, then fall back to the other type.
  const order: WalletOwnerType[] = trimmed.startsWith('ear_')
    ? ['earner', 'merchant']
    : ['merchant', 'earner'];
  for (const t of order) {
    const owner = await fetchOwnerByCode(t, trimmed);
    if (owner) return { owner, owner_type: t };
  }
  return null;
}

export async function fetchOwnerByCode(
  owner_type: WalletOwnerType,
  code: string,
): Promise<OwnerSummary | null> {
  if (owner_type === 'merchant') {
    const { data, error } = await (supabase as any)
      .from('merchants')
      .select('id, community_id, name, status, wallet_id, has_wallet_pending, communities:community_id(name, slug, city, country)')
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
    // No wallet row yet but a pending API key was saved during submission —
    // surface as "pending" so the UI doesn't ask for the key again.
    if (!wallet && data.has_wallet_pending) {
      wallet = { id: '', wallet_status: 'pending', last_synced_at: null, balance_sats: 0, ln_address_hash: null };
    }
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
      .select('id, community_id, description, status, has_wallet_pending, communities:community_id(name, slug, city, country)')
      .eq('earner_code', code)
      .maybeSingle();
    if (error || !data) return null;
    if (data.status !== 'approved') return null;
    let { data: w } = await (supabase as any)
      .from('wallets')
      .select('id, wallet_status, last_synced_at, balance_sats, ln_address_hash')
      .eq('owner_type', 'earner')
      .eq('owner_id', data.id)
      .maybeSingle();
    if (!w && data.has_wallet_pending) {
      w = { id: '', wallet_status: 'pending', last_synced_at: null, balance_sats: 0, ln_address_hash: null };
    }
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

export async function fetchWalletTransactions(walletId: string, limit = 20, sinceIso?: string) {
  let q = (supabase as any)
    .from('blink_transactions')
    .select('id, direction, settlement_amount, is_internal, blink_created_at')
    .eq('wallet_id', walletId)
    .order('blink_created_at', { ascending: false })
    .limit(limit);
  if (sinceIso) q = q.gte('blink_created_at', sinceIso);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** Fetch all transactions in a window — used to derive stats + daily series. */
export async function fetchWalletTransactionsRange(walletId: string, sinceIso: string) {
  const { data, error } = await (supabase as any)
    .from('blink_transactions')
    .select('id, direction, settlement_amount, is_internal, blink_created_at')
    .eq('wallet_id', walletId)
    .gte('blink_created_at', sinceIso)
    .order('blink_created_at', { ascending: false })
    .limit(10000);
  if (error) throw error;
  return data || [];
}

export function computeStatsFromTx(list: any[]) {
  let received = 0, sent = 0, circular = 0;
  const activeDaysSet = new Set<string>();
  for (const t of list) {
    const amt = Number(t.settlement_amount) || 0;
    if (t.direction === 'RECEIVE') received += amt; else sent += amt;
    if (t.is_internal) circular += amt;
    activeDaysSet.add(new Date(t.blink_created_at).toDateString());
  }
  const total = received + sent;
  const rate = total > 0 ? Math.round((circular / total) * 100) : 0;
  return { received, sent, circular, rate, count: list.length, activeDays: activeDaysSet.size };
}

export function computeDailySeriesFromTx(list: any[], sinceIso: string) {
  const since = new Date(sinceIso);
  since.setHours(0, 0, 0, 0);
  const days = Math.max(1, Math.ceil((Date.now() - since.getTime()) / 86400000) + 1);
  const buckets = new Map<string, { received: number; sent: number; circular: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since); d.setDate(since.getDate() + i);
    buckets.set(d.toDateString(), { received: 0, sent: 0, circular: 0 });
  }
  for (const t of list) {
    const key = new Date(t.blink_created_at).toDateString();
    const slot = buckets.get(key);
    if (!slot) continue;
    const amt = Number(t.settlement_amount) || 0;
    if (t.direction === 'RECEIVE') slot.received += amt; else slot.sent += amt;
    if (t.is_internal) slot.circular += amt;
  }
  return Array.from(buckets.entries()).map(([k, v]) => {
    const d = new Date(k);
    return {
      date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      received: v.received,
      sent: v.sent,
      circular: v.circular,
    };
  });
}

export async function fetchWalletMonthlyStats(walletId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data, error } = await (supabase as any)
    .from('blink_transactions')
    .select('direction, settlement_amount, is_internal, blink_created_at')
    .eq('wallet_id', walletId)
    .gte('blink_created_at', since.toISOString());
  if (error) throw error;
  const list = data || [];
  let received = 0, sent = 0, circular = 0;
  const activeDaysSet = new Set<string>();
  for (const t of list) {
    const amt = Number(t.settlement_amount) || 0;
    if (t.direction === 'RECEIVE') received += amt; else sent += amt;
    if (t.is_internal) circular += amt;
    activeDaysSet.add(new Date(t.blink_created_at).toDateString());
  }
  const total = received + sent;
  const rate = total > 0 ? Math.round((circular / total) * 100) : 0;
  return { received, sent, circular, rate, count: list.length, activeDays: activeDaysSet.size };
}

/** 30-day daily series for the dashboard chart. */
export async function fetchWalletDailySeries(walletId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);
  const { data, error } = await (supabase as any)
    .from('blink_transactions')
    .select('direction, settlement_amount, is_internal, blink_created_at')
    .eq('wallet_id', walletId)
    .gte('blink_created_at', since.toISOString());
  if (error) throw error;
  const list = data || [];

  // Pre-build 30 day buckets
  const buckets = new Map<string, { received: number; sent: number; circular: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(d.toDateString(), { received: 0, sent: 0, circular: 0 });
  }
  for (const t of list) {
    const key = new Date(t.blink_created_at).toDateString();
    const slot = buckets.get(key);
    if (!slot) continue;
    const amt = Number(t.settlement_amount) || 0;
    if (t.direction === 'RECEIVE') slot.received += amt; else slot.sent += amt;
    if (t.is_internal) slot.circular += amt;
  }
  return Array.from(buckets.entries()).map(([k, v]) => {
    const d = new Date(k);
    return {
      date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      received: v.received,
      sent: v.sent,
      circular: v.circular,
    };
  });
}

/** This wallet's share of the economy's circular volume since the given date. */
export async function fetchWalletContribution(walletId: string, communityId: string, sinceIso?: string) {
  if (!sinceIso) {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    sinceIso = since.toISOString();
  }

  const [{ data: mine }, { data: economy }, { count: walletCount }] = await Promise.all([
    (supabase as any)
      .from('blink_transactions')
      .select('settlement_amount, is_internal')
      .eq('wallet_id', walletId)
      .gte('blink_created_at', sinceIso),
    (supabase as any)
      .from('blink_transactions')
      .select('settlement_amount, is_internal')
      .eq('community_id', communityId)
      .gte('blink_created_at', sinceIso),
    (supabase as any)
      .from('wallets')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .eq('wallet_status', 'connected'),
  ]);

  const myCircular = (mine || []).filter((t: any) => t.is_internal)
    .reduce((s: number, t: any) => s + Number(t.settlement_amount || 0), 0);
  const myCircularCount = (mine || []).filter((t: any) => t.is_internal).length;
  const economyCircular = (economy || []).filter((t: any) => t.is_internal)
    .reduce((s: number, t: any) => s + Number(t.settlement_amount || 0), 0);
  const economyTotal = (economy || []).reduce((s: number, t: any) => s + Number(t.settlement_amount || 0), 0);
  const economyCircularRate = economyTotal > 0 ? Math.round((economyCircular / economyTotal) * 100) : 0;
  const contributionPct = economyCircular > 0 ? Math.round((myCircular / economyCircular) * 100) : 0;

  return {
    myCircular,
    myCircularCount,
    economyCircular,
    economyCircularRate,
    contributionPct,
    connectedWalletCount: walletCount || 0,
  };
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
