import { supabase } from '@/integrations/supabase/client';

export type MerchantMetrics = {
  merchant_id: string;
  public_merchant_id: string;
  community_id: string;
  name: string;
  category: string;
  wallet_linked: boolean;
  inflow_sats: number;
  outflow_sats: number;
  internal_sats: number;
  tx_count: number;
  circularity_score: number;
  last_tx_at: string | null;
};

export async function fetchMerchantMetricsByPublicId(publicId: string): Promise<MerchantMetrics | null> {
  const { data, error } = await (supabase as any)
    .from('merchant_metrics')
    .select('*')
    .eq('public_merchant_id', publicId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMerchantTransactions(merchantId: string, limit = 20) {
  // Look up wallet_id first, then transactions
  const { data: m } = await supabase
    .from('merchants')
    .select('wallet_id')
    .eq('id', merchantId)
    .maybeSingle();
  if (!m?.wallet_id) return [];
  const { data, error } = await (supabase as any)
    .from('blink_transactions')
    .select('id, direction, settlement_amount, settlement_currency, is_internal, blink_created_at')
    .eq('wallet_id', m.wallet_id)
    .order('blink_created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

const TOKEN_PREFIX = 'merchant_token_';

export function saveMerchantToken(publicId: string, token: string) {
  try {
    localStorage.setItem(TOKEN_PREFIX + publicId, token);
  } catch {}
}

export function getMerchantToken(publicId: string): string | null {
  try {
    return localStorage.getItem(TOKEN_PREFIX + publicId);
  } catch {
    return null;
  }
}

export function clearMerchantToken(publicId: string) {
  try {
    localStorage.removeItem(TOKEN_PREFIX + publicId);
  } catch {}
}
