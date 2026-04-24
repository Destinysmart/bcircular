import { supabase } from '@/integrations/supabase/client';

export async function fetchCommunities() {
  const { data, error } = await supabase
    .from('communities')
    .select('*, logo_url, banner_url')
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return data;
}

export async function fetchCommunityBySlug(slug: string) {
  const { data, error } = await supabase
    .from('communities')
    .select('*, logo_url, banner_url')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchCommunityMerchants(communityId: string) {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('community_id', communityId)
    .eq('status', 'approved');
  if (error) throw error;
  return data;
}

export async function fetchCommunityEarners(communityId: string) {
  const { data, error } = await supabase
    .from('earners')
    .select('*')
    .eq('community_id', communityId)
    .eq('status', 'approved');
  if (error) throw error;
  return data;
}

export async function fetchCommunityTransactions(communityId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('community_id', communityId)
    .eq('status', 'approved');
  if (error) throw error;
  return data;
}

export async function fetchProofs(communityId: string, status = 'approved') {
  const { data, error } = await (supabase as any)
    .from('proofs')
    .select('*')
    .eq('community_id', communityId)
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function submitProof(proof: {
  community_id: string;
  submitted_by: string;
  title: string;
  description?: string | null;
  proof_type: 'photo' | 'video' | 'receipt' | 'screenshot';
  media_url?: string | null;
  merchant_name?: string | null;
  amount_sats?: number | null;
  is_circular: boolean;
}) {
  const { data, error } = await (supabase as any).from('proofs').insert(proof).select().single();
  if (error) throw error;
  return data;
}

export async function fetchLatestScore(communityId: string) {
  const { data, error } = await supabase
    .from('circularity_scores')
    .select('*')
    .eq('community_id', communityId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchScoreHistory(communityId: string) {
  const { data, error } = await supabase
    .from('circularity_scores')
    .select('*')
    .eq('community_id', communityId)
    .order('calculated_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchPendingSubmissions(communityId: string) {
  const [merchants, earners, transactions] = await Promise.all([
    supabase.from('merchants').select('*').eq('community_id', communityId).eq('status', 'pending'),
    supabase.from('earners').select('*').eq('community_id', communityId).eq('status', 'pending'),
    supabase.from('transactions').select('*').eq('community_id', communityId).eq('status', 'pending'),
  ]);
  return {
    merchants: merchants.data || [],
    earners: earners.data || [],
    transactions: transactions.data || [],
  };
}

export async function fetchPendingProofs(communityId: string) {
  const { data, error } = await (supabase as any)
    .from('proofs')
    .select('*')
    .eq('community_id', communityId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchValidatorCommunities(userId: string) {
  const { data, error } = await supabase
    .from('validators')
    .select('community_id, communities(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

export async function fetchVotesForSubmission(submissionId: string) {
  const { data, error } = await supabase
    .from('validation_votes')
    .select('*')
    .eq('submission_id', submissionId);
  if (error) throw error;
  return data;
}

export async function submitMerchant(communityId: string, merchant: {
  name: string;
  category: string;
  address?: string;
  lat?: number;
  lng?: number;
  payment_methods: string[];
  website?: string;
}, userId?: string) {
  const { data, error } = await supabase.from('merchants').insert({
    community_id: communityId,
    name: merchant.name,
    category: merchant.category,
    address: merchant.address,
    lat: merchant.lat,
    lng: merchant.lng,
    payment_methods: merchant.payment_methods,
    website: merchant.website,
    submitted_by: userId || null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function submitEarner(communityId: string, earner: {
  description: string;
  earning_method?: string;
  payment_method?: string;
}, userId?: string) {
  const { data, error } = await supabase.from('earners').insert({
    community_id: communityId,
    description: earner.description,
    earning_method: earner.earning_method,
    payment_method: earner.payment_method,
    submitted_by: userId || null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function submitTransaction(communityId: string, tx: {
  amount_sats: number;
  category: string;
  is_circular: boolean;
  transaction_date: string;
}, userId?: string) {
  const { data, error } = await supabase.from('transactions').insert({
    community_id: communityId,
    amount_sats: tx.amount_sats,
    category: tx.category,
    is_circular: tx.is_circular,
    transaction_date: tx.transaction_date,
    submitted_by: userId || null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function castVote(submissionId: string, submissionType: string, validatorId: string, vote: 'approve' | 'reject', note?: string) {
  const { data, error } = await supabase.from('validation_votes').insert({
    submission_id: submissionId,
    submission_type: submissionType,
    validator_id: validatorId,
    vote: vote,
    note: note || null,
  }).select().single();
  if (error) throw error;

  await supabase.functions.invoke('process-validation', {
    body: { submission_id: submissionId, submission_type: submissionType },
  });

  return data;
}

export async function updateProofStatus(proofId: string, status: 'approved' | 'rejected') {
  const { error } = await (supabase as any).from('proofs').update({ status }).eq('id', proofId);
  if (error) throw error;
}

export async function registerCommunity(community: {
  name: string;
  country: string;
  country_code: string;
  city: string;
  region: string;
  description: string;
  slug: string;
  declared_population?: number;
  economic_zone_description?: string;
  founding_year?: number;
  website?: string;
  twitter_handle?: string;
  contact_email?: string;
}, adminId: string) {
  const { data, error } = await supabase.from('communities').insert({
    ...community,
    admin_id: adminId,
    status: 'pending',
  }).select().single();
  if (error) throw error;

  // Also insert into community_admins
  const { error: adminError } = await supabase.from('community_admins').insert({
    community_id: data.id,
    user_id: adminId,
    role: 'owner',
  });
  if (adminError) console.error('Failed to insert community_admin:', adminError.message);

  return data;
}

export async function fetchAllCommunitiesWithStats() {
  const { data: communities, error } = await supabase
    .from('communities')
    .select('*, logo_url, banner_url')
    .eq('status', 'active');
  if (error) throw error;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysSoFar = now.getDate();

  const results = await Promise.all(
    (communities || []).map(async (c) => {
      const [merchantsRes, merchantSourcesRes, earnersRes, txRes, scoreRes, proofRes, monthlyTxRes, monthlyBlinkRes] = await Promise.all([
        supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('community_id', c.id).eq('status', 'approved'),
        supabase.from('merchants').select('source').eq('community_id', c.id).eq('status', 'approved'),
        supabase.from('earners').select('id', { count: 'exact', head: true }).eq('community_id', c.id).eq('status', 'approved'),
        supabase.from('transactions').select('amount_sats, is_circular').eq('community_id', c.id).eq('status', 'approved'),
        supabase.from('circularity_scores').select('*').eq('community_id', c.id).order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
        (supabase as any).from('proofs').select('id', { count: 'exact', head: true }).eq('community_id', c.id).eq('status', 'approved'),
        supabase.from('transactions').select('created_at').eq('community_id', c.id).eq('status', 'approved').gte('created_at', startOfMonth.toISOString()),
        supabase.from('blink_transactions').select('blink_created_at').eq('community_id', c.id).gte('blink_created_at', startOfMonth.toISOString()),
      ]);
      const circularSats = (txRes.data || []).filter(t => t.is_circular).reduce((s, t) => s + Number(t.amount_sats), 0);
      const totalSats = (txRes.data || []).reduce((s, t) => s + Number(t.amount_sats), 0);
      const totalApproved = (merchantsRes.count || 0) + (earnersRes.count || 0) + (txRes.data?.length || 0);
      const sources = (merchantSourcesRes.data || []).map((m: any) => m.source);
      const hasBtcmap = sources.some(s => s === 'btcmap');
      const hasSelf = sources.some(s => s !== 'btcmap');
      const dataSource: 'btcmap' | 'self_reported' | 'combined' | 'none' =
        hasBtcmap && hasSelf ? 'combined' : hasBtcmap ? 'btcmap' : hasSelf ? 'self_reported' : 'none';

      // Live monthly metrics (preferred over stored, always fresh)
      const monthlyDates = [
        ...((monthlyTxRes.data as any[]) || []).map((t: any) => t.created_at),
        ...((monthlyBlinkRes.data as any[]) || []).map((t: any) => t.blink_created_at),
      ];
      const activeDaysSet = new Set(monthlyDates.map(d => new Date(d).toDateString()));
      const activeDays = activeDaysSet.size;
      const monthlyTransactions = monthlyDates.length;
      const activityRate = daysSoFar > 0 ? Math.round((activeDays / daysSoFar) * 100) : 0;

      return {
        ...c,
        merchants: merchantsRes.count || 0,
        earners: earnersRes.count || 0,
        transactions: txRes.data?.length || 0,
        satsCircular: circularSats,
        satsTotal: totalSats,
        retentionScore: Number(scoreRes.data?.retention_score || 0),
        growthScore: Number(scoreRes.data?.growth_score || 0),
        score: scoreRes.data?.score || 0,
        weeklyChange: 0,
        totalApproved,
        proofCount: proofRes.count || 0,
        dataSource,
        monthlyTransactions,
        activeDays,
        daysSoFar,
        daysInMonth,
        activityRate,
      };
    })
  );

  return results;
}

export async function fetchComparisonDetails(communityId: string) {
  const [merchantsRes, scoreRes, proofRes] = await Promise.all([
    supabase.from('merchants').select('*').eq('community_id', communityId).eq('status', 'approved'),
    supabase.from('circularity_scores').select('*').eq('community_id', communityId).order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
    (supabase as any).from('proofs').select('id', { count: 'exact', head: true }).eq('community_id', communityId).eq('status', 'approved'),
  ]);
  if (merchantsRes.error) throw merchantsRes.error;
  if (scoreRes.error) throw scoreRes.error;
  return { merchants: merchantsRes.data || [], score: scoreRes.data, proofCount: proofRes.count || 0 };
}
