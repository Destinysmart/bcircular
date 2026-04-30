import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import ScoreBar from '@/components/ScoreBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchCommunityBySlug, fetchLatestScore, fetchPendingSubmissions, fetchCommunityMerchants, fetchCommunityEarners, fetchCommunityTransactions } from '@/lib/api';
import { AlertTriangle, CheckCircle, XCircle, Trash2, RefreshCw, Download, Printer, ExternalLink } from 'lucide-react';
import BlinkWalletSettings from '@/components/BlinkWalletSettings';
import MerchantClaimManager from '@/components/MerchantClaimManager';
import ConnectedWalletsManager from '@/components/ConnectedWalletsManager';
import EconomyLogo from '@/components/EconomyLogo';
import UploadZone from '@/components/UploadZone';
import { QRCodeCanvas } from 'qrcode.react';
import { TierBadge, TIER_CHECKLIST, getTierMeta, type FbceTier } from '@/components/TierBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SetupChecklist from '@/components/SetupChecklist';
import EconomyAlerts from '@/components/EconomyAlerts';

const EconomyAdminDashboard = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch community by ID
  const { data: community } = useQuery({
    queryKey: ['community-by-id', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('communities').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Check super admin status
  const { data: isSuperAdmin } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from('profiles').select('is_super_admin').eq('user_id', user.id).maybeSingle();
      return !!data?.is_super_admin;
    },
    enabled: !!user,
  });

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
    if (community && user && community.admin_id !== user.id && isSuperAdmin === false) {
      toast({ title: 'Access denied', description: 'You are not the admin of this economy.', variant: 'destructive' });
      navigate('/');
    }
  }, [community, user, authLoading, isSuperAdmin]);

  const communityId = community?.id;

  const { data: latestScore } = useQuery({
    queryKey: ['score', communityId],
    queryFn: () => fetchLatestScore(communityId!),
    enabled: !!communityId,
  });

  const { data: pending } = useQuery({
    queryKey: ['pending', communityId],
    queryFn: () => fetchPendingSubmissions(communityId!),
    enabled: !!communityId,
  });

  const { data: merchants } = useQuery({
    queryKey: ['merchants', communityId],
    queryFn: () => fetchCommunityMerchants(communityId!),
    enabled: !!communityId,
  });

  const { data: earners } = useQuery({
    queryKey: ['earners', communityId],
    queryFn: () => fetchCommunityEarners(communityId!),
    enabled: !!communityId,
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions', communityId],
    queryFn: () => fetchCommunityTransactions(communityId!),
    enabled: !!communityId,
  });

  const { data: validators } = useQuery({
    queryKey: ['validators', communityId],
    queryFn: async () => {
      const { data, error } = await supabase.from('validators').select('*, profiles(display_name, email)').eq('community_id', communityId!);
      if (error) throw error;
      return data;
    },
    enabled: !!communityId,
  });

  const { data: profile } = useQuery({
    queryKey: ['community-profile', communityId],
    queryFn: async () => {
      const { data } = await supabase.from('community_profiles').select('*').eq('community_id', communityId!).maybeSingle();
      return data;
    },
    enabled: !!communityId,
  });

  // Profile form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [declaredPop, setDeclaredPop] = useState('');
  const [foundingYear, setFoundingYear] = useState('');
  const [ecoZoneDesc, setEcoZoneDesc] = useState('');
  const [validatorEmail, setValidatorEmail] = useState('');
  const [fbceTier, setFbceTier] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [syncingBtcmap, setSyncingBtcmap] = useState(false);
  const [btcmapAreaId, setBtcmapAreaId] = useState('');
  const [btcmapSyncResult, setBtcmapSyncResult] = useState<any>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const uploadBrandingImage = async (file: File, type: 'logo' | 'banner') => {
    if (!communityId || !community) return;
    const isLogo = type === 'logo';
    const maxSize = isLogo ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    const allowedTypes = isLogo ? ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'] : ['image/jpeg', 'image/png', 'image/webp'];
    if (file.size > maxSize) {
      toast({ title: isLogo ? 'Logo must be under 2MB' : 'Banner must be under 5MB', variant: 'destructive' });
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Unsupported file type', description: isLogo ? 'Use JPG, PNG, SVG, or WebP.' : 'Use JPG, PNG, or WebP.', variant: 'destructive' });
      return;
    }
    const setUploading = isLogo ? setUploadingLogo : setUploadingBanner;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${community.id}/${type}-${Date.now()}.${fileExt}`;
      const bucket = isLogo ? 'economy-logos' : 'economy-banners';
      const column = isLogo ? 'logo_url' : 'banner_url';
      const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      await supabase.from('communities').update({ [column]: publicUrl } as any).eq('id', community.id);
      queryClient.invalidateQueries({ queryKey: ['community-by-id', id] });
      toast({ title: isLogo ? 'Logo updated ✓' : 'Banner updated ✓' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const removeBrandingImage = async (type: 'logo' | 'banner') => {
    if (!communityId || !community) return;
    const column = type === 'logo' ? 'logo_url' : 'banner_url';
    await supabase.from('communities').update({ [column]: null } as any).eq('id', community.id);
    queryClient.invalidateQueries({ queryKey: ['community-by-id', id] });
    toast({ title: type === 'logo' ? 'Logo removed' : 'Banner removed' });
  };

  const normalizeBtcmapId = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.includes('btcmap.org/community/')) {
      return trimmed.split('btcmap.org/community/').pop()?.split('/')[0] || trimmed;
    }
    if (trimmed.includes('btcmap.org/map/')) {
      return trimmed.split('btcmap.org/map/').pop()?.split('/')[0] || trimmed;
    }
    return trimmed;
  };

  const handleBtcmapIdChange = (value: string) => {
    setBtcmapAreaId(normalizeBtcmapId(value));
  };

  const handleSyncBtcmap = async () => {
    if (!communityId || !btcmapAreaId.trim()) {
      toast({ title: 'BTCMap Community ID required', description: 'Paste the last part of your BTCMap community URL.', variant: 'destructive' });
      return;
    }
    setSyncingBtcmap(true);
    setBtcmapSyncResult(null);
    try {
      const normalizedAreaId = normalizeBtcmapId(btcmapAreaId);
      await supabase.from('communities').update({ btcmap_area_id: normalizedAreaId } as any).eq('id', communityId);
      const { data, error } = await supabase.functions.invoke('sync-btcmap', {
        body: { community_id: communityId },
      });
      if (error) throw error;
      setBtcmapAreaId(normalizedAreaId);
      // Re-query DB for ground truth count after sync (not the value returned by the function)
      const { count: actualCount } = await supabase
        .from('merchants')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', communityId)
        .eq('source', 'btcmap')
        .eq('status', 'approved');
      setBtcmapSyncResult({ type: (actualCount ?? 0) === 0 ? 'empty' : 'success', ...data, synced: actualCount ?? 0 });
      queryClient.invalidateQueries({ queryKey: ['community-by-id', id] });
      queryClient.invalidateQueries({ queryKey: ['merchants', communityId] });
      queryClient.invalidateQueries({ queryKey: ['score', communityId] });
      toast({ title: 'BTCMap sync complete', description: `${actualCount ?? 0} merchants synced from BTCMap.` });
    } catch (err: any) {
      const message = err?.message || 'BTCMap sync failed';
      setBtcmapSyncResult({ type: 'error', error: message, areaId: btcmapAreaId.trim() });
      toast({ title: 'BTCMap sync failed', description: message, variant: 'destructive' });
    } finally {
      setSyncingBtcmap(false);
    }
  };

  useEffect(() => {
    if (community) {
      setName(community.name || '');
      setDescription(community.description || '');
      setWebsite(community.website || '');
      setTwitter(community.twitter_handle || '');
      setContactEmail(community.contact_email || '');
      setDeclaredPop(String(community.declared_population || ''));
      setFoundingYear(String(community.founding_year || ''));
      setEcoZoneDesc(community.economic_zone_description || '');
      setBtcmapAreaId((community as any).btcmap_area_id || '');
      setFbceTier((community as any).fbce_tier ? String((community as any).fbce_tier) : '');
    }
  }, [community]);

  const handleSaveProfile = async () => {
    if (!communityId || !user) return;
    setSaving(true);
    try {
      await supabase.from('communities').update({
        name, description, website, twitter_handle: twitter,
        contact_email: contactEmail,
        declared_population: parseInt(declaredPop) || 100,
        founding_year: parseInt(foundingYear) || null,
        economic_zone_description: ecoZoneDesc,
        fbce_tier: fbceTier ? parseInt(fbceTier) : null,
      } as any).eq('id', communityId);

      // Upsert community_profiles
      const { data: existing } = await supabase.from('community_profiles').select('id').eq('community_id', communityId).maybeSingle();
      if (existing) {
        await supabase.from('community_profiles').update({
          website, twitter_handle: twitter, contact_email: contactEmail,
          founding_year: parseInt(foundingYear) || null,
          economic_zone_description: ecoZoneDesc,
        }).eq('community_id', communityId);
      } else {
        await supabase.from('community_profiles').insert({
          community_id: communityId, admin_user_id: user.id,
          website, twitter_handle: twitter, contact_email: contactEmail,
          founding_year: parseInt(foundingYear) || null,
          economic_zone_description: ecoZoneDesc,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['community-by-id', id] });
      toast({ title: 'Profile saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAppointValidator = async () => {
    if (!validatorEmail || !communityId) return;
    try {
      const { data: profile } = await supabase.from('profiles').select('user_id').eq('email', validatorEmail).single();
      if (!profile) { toast({ title: 'User not found', description: 'That email is not registered.', variant: 'destructive' }); return; }
      await supabase.from('validators').insert({ community_id: communityId, user_id: profile.user_id });
      setValidatorEmail('');
      queryClient.invalidateQueries({ queryKey: ['validators', communityId] });
      toast({ title: 'Validator appointed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemoveValidator = async (validatorId: string) => {
    await supabase.from('validators').delete().eq('id', validatorId);
    queryClient.invalidateQueries({ queryKey: ['validators', communityId] });
    toast({ title: 'Validator removed' });
  };

  const handleQuickAction = async (submissionId: string, type: string, action: 'approved' | 'rejected') => {
    try {
      await supabase.from(type === 'merchant' ? 'merchants' : type === 'earner' ? 'earners' : 'transactions')
        .update({ status: action }).eq('id', submissionId);
      queryClient.invalidateQueries({ queryKey: ['pending', communityId] });
      toast({ title: `Submission ${action}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleRecalculate = async () => {
    if (!communityId) return;
    setRecalculating(true);
    try {
      await supabase.functions.invoke('calculate-score', { body: { community_id: communityId } });
      queryClient.invalidateQueries({ queryKey: ['score', communityId] });
      toast({ title: 'Score recalculated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRecalculating(false);
    }
  };

  const quickSubmitUrl = community ? `${window.location.origin}/quick-submit?economy=${community.slug}` : '';

  const handleDownloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas || !community) return;
    const link = document.createElement('a');
    link.download = `${community.slug}-quick-submit-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePrintQr = () => window.print();

  if (authLoading || !community) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="container py-16 text-center text-muted-foreground">Loading...</div></div>;
  }

  const pendingCount = (pending?.merchants?.length || 0) + (pending?.earners?.length || 0) + (pending?.transactions?.length || 0);
  const approvedCount = (merchants?.length || 0) + (earners?.length || 0) + (transactions?.length || 0);

  const pillars = [
    { label: 'Merchant saturation', value: latestScore?.merchant_density_score ?? 0 },
    { label: 'Retention', value: latestScore?.retention_score ?? 0 },
    { label: 'Earner penetration', value: latestScore?.earner_rate_score ?? 0 },
    { label: 'Velocity', value: latestScore?.velocity_score ?? 0 },
    { label: 'Growth', value: latestScore?.growth_score ?? 0 },
  ];

  const zeroPillar = pillars.find(p => Math.round(p.value) === 0);
  const zeroPillarGuidance = zeroPillar?.label === 'Merchant saturation'
    ? 'Add merchants via BTCMap sync or manual submission to improve this score.'
    : 'Add earners to your economy to improve your circularity score.';
  const zeroPillarAction = zeroPillar?.label === 'Merchant saturation' ? 'Add merchants →' : 'Add earners →';

  const allPending = [
    ...(pending?.merchants || []).map(m => ({ id: m.id, type: 'merchant' as const, title: m.name, detail: m.category })),
    ...(pending?.earners || []).map(e => ({ id: e.id, type: 'earner' as const, title: e.description, detail: e.earning_method || '' })),
    ...(pending?.transactions || []).map(t => ({ id: t.id, type: 'transaction' as const, title: `${t.amount_sats} sats`, detail: t.category })),
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">Economy Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-8">{community.name}</p>

        <EconomyAlerts communityId={communityId!} />
        <SetupChecklist communityId={communityId!} community={community} />
        {zeroPillar && (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-score-amber/40 bg-score-amber/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-sm">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-score-amber" />
              <span><span className="font-semibold text-score-amber">Your {zeroPillar.label} score is 0.</span> {zeroPillarGuidance}</span>
            </div>
            <Button size="sm" className="bg-score-amber text-background hover:bg-score-amber/90" onClick={() => navigate(`/c/${community.slug}/submit`)}>{zeroPillarAction}</Button>
          </div>
        )}

        {/* Branding Section */}
        <section className="rounded-lg border border-border bg-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Branding</h2>
          <div className="space-y-6">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Banner image</div>
              {(community as any).banner_url ? (
                <div className="space-y-2">
                  <img src={(community as any).banner_url} alt={`${community.name} banner`} className="h-[200px] w-full rounded-xl object-cover" />
                  <button className="text-xs text-destructive hover:underline" onClick={() => removeBrandingImage('banner')}>Remove</button>
                </div>
              ) : (
                <UploadZone
                  id="upload-banner"
                  label={uploadingBanner ? 'Uploading banner…' : 'Drag & drop or click to upload'}
                  hint="Recommended: 1200×300px · Max 5MB · JPG, PNG, WebP supported"
                  accept="image/jpeg,image/png,image/webp"
                  onFile={(file) => uploadBrandingImage(file, 'banner')}
                  previewClassName="h-[160px] w-full"
                />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-[120px_1fr] sm:items-center">
              <div>
                {(community as any).logo_url ? (
                  <div className="space-y-2 text-center sm:text-left">
                    <EconomyLogo economy={{ name: community.name, logo_url: (community as any).logo_url }} size="lg" />
                    <button className="text-xs text-destructive hover:underline" onClick={() => removeBrandingImage('logo')}>Remove</button>
                  </div>
                ) : (
                  <UploadZone
                    id="upload-logo"
                    label={uploadingLogo ? 'Uploading logo…' : 'Logo'}
                    hint="Click or drop"
                    accept="image/jpeg,image/png,image/svg+xml,image/webp"
                    onFile={(file) => uploadBrandingImage(file, 'logo')}
                    className="aspect-square p-4"
                    previewClassName="h-20 w-20 rounded-full"
                  />
                )}
              </div>
              <div>
                <div className="font-medium">Upload your economy logo</div>
                <p className="text-sm text-muted-foreground">Recommended: 400×400px. Will appear as a circle. Max 2MB · JPG, PNG, SVG, WebP.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Profile Section */}
        <section className="rounded-lg border border-border bg-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Economy Profile</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><Label>Economy name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label>Declared population</Label><Input type="number" value={declaredPop} onChange={e => setDeclaredPop(e.target.value)} /></div>
            <div><Label>Website</Label><Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" /></div>
            <div><Label>Twitter handle</Label><Input value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="@handle" /></div>
            <div><Label>Contact email</Label><Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
            <div><Label>Founding year</Label><Input type="number" value={foundingYear} onChange={e => setFoundingYear(e.target.value)} placeholder="e.g. 2019" /></div>
          </div>
          <div className="mb-4"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
          <div className="mb-4"><Label>Economic zone description</Label><Textarea value={ecoZoneDesc} onChange={e => setEcoZoneDesc(e.target.value)} rows={2} placeholder="Describe the geographic area this economy covers" /></div>
          <div className="mb-4"><Label>Economic zone description</Label><Textarea value={ecoZoneDesc} onChange={e => setEcoZoneDesc(e.target.value)} rows={2} placeholder="Describe the geographic area this economy covers" /></div>

          {/* FBCE Classification (Optional) */}
          <div className="mt-6 mb-4 rounded-lg border border-border bg-background/40 p-4">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold">FBCE Classification (Optional)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Self-classify your economy on the FBCE 5-tier framework.</p>
              </div>
              {fbceTier && <TierBadge tier={parseInt(fbceTier)} verified={(community as any)?.fbce_tier_verified} showSelfReported={false} />}
            </div>
            <Label className="text-xs">Select your tier (1-5)</Label>
            <Select value={fbceTier || 'none'} onValueChange={(v) => setFbceTier(v === 'none' ? '' : v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Not classified" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not classified</SelectItem>
                <SelectItem value="1">1 — Emerging (getting started)</SelectItem>
                <SelectItem value="2">2 — Emerging (growing presence)</SelectItem>
                <SelectItem value="3">3 — Advanced (organization established)</SelectItem>
                <SelectItem value="4">4 — Advanced (staff + BTC unit of account)</SelectItem>
                <SelectItem value="5">5 — Advanced (fully realized economy)</SelectItem>
              </SelectContent>
            </Select>
            {fbceTier && getTierMeta(parseInt(fbceTier)) && (
              <div className="mt-3 text-xs text-muted-foreground">
                <div className="text-foreground mb-1">{getTierMeta(parseInt(fbceTier))!.description}</div>
                <ul className="space-y-1 mt-2">
                  {TIER_CHECKLIST[parseInt(fbceTier) as FbceTier].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-0.5 inline-block h-3 w-3 rounded-sm border border-border" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 text-[11px] text-muted-foreground">
              Tier framework by FBCE · <a href="https://fbce.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">fbce.io</a>
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
        </section>

        {/* Quick Submit QR Code */}
        <section className="rounded-lg border border-border bg-card p-6 mb-6 print:shadow-none" ref={qrRef}>
          <h2 className="text-lg font-semibold mb-2">Quick Submit QR Code</h2>
          <p className="text-sm text-muted-foreground mb-4">Print this and display it at merchant locations. Customers scan it to instantly submit a merchant or transaction.</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-fit rounded-lg border border-border bg-background p-4">
              <QRCodeCanvas value={quickSubmitUrl} size={180} includeMargin />
              <p className="mt-2 text-center text-sm font-medium">{community.name}</p>
            </div>
            <div className="space-y-2">
              <p className="break-all font-mono text-xs text-muted-foreground">{quickSubmitUrl}</p>
              <div className="flex flex-wrap gap-2 print:hidden">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadQr}><Download className="h-3.5 w-3.5" /> Download QR</Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrintQr}><Printer className="h-3.5 w-3.5" /> Print QR</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Validators Section */}
        <section className="rounded-lg border border-border bg-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Validators ({validators?.length || 0})</h2>
          {(validators?.length || 0) < 2 && (
            <p className="text-xs text-amber-400 mb-3">⚠ You need at least 2 validators to unlock "active" status.</p>
          )}
          <div className="space-y-2 mb-4">
            {validators?.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <div>
                  <span className="font-medium">{v.profiles?.display_name || v.profiles?.email || v.user_id}</span>
                  <span className="text-muted-foreground text-xs ml-2">Appointed {new Date(v.appointed_at).toLocaleDateString()}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRemoveValidator(v.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Validator's email address" value={validatorEmail} onChange={e => setValidatorEmail(e.target.value)} className="max-w-xs" />
            <Button variant="outline" size="sm" onClick={handleAppointValidator}>Appoint validator</Button>
          </div>
        </section>

        {/* Submissions Section */}
        <section className="rounded-lg border border-border bg-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Submissions</h2>
          <div className="flex gap-4 text-sm text-muted-foreground mb-4">
            <span>{pendingCount} pending</span>
            <span>{approvedCount} approved</span>
          </div>
          {allPending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending submissions.</p>
          ) : (
            <div className="space-y-2">
              {allPending.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                    <span className="font-medium">{item.title}</span>
                    <span className="text-muted-foreground text-xs">{item.detail}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleQuickAction(item.id, item.type, 'approved')}>
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleQuickAction(item.id, item.type, 'rejected')}>
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* BTCMap Integration */}
        <section className="rounded-lg border border-border bg-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">BTCMap Integration</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="btcmap-area-id">BTCMap Community ID</Label>
              <Input
                id="btcmap-area-id"
                value={btcmapAreaId}
                onChange={(event) => handleBtcmapIdChange(event.target.value)}
                placeholder="afribit-kibera or paste the full btcmap.org URL"
                className="font-mono text-sm"
              />
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Find your ID at <a href="https://btcmap.org/communities" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">btcmap.org/communities</a></p>
                <p>You can paste the full URL — we&apos;ll extract the ID automatically</p>
                <p>e.g. btcmap.org/community/bitcoin-beach → bitcoin-beach</p>
                {btcmapAreaId.trim() && <p className="font-medium text-foreground">Will sync using ID: <span className="font-mono">{normalizeBtcmapId(btcmapAreaId)}</span></p>}
                <a href="https://btcmap.org/communities" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  Don&apos;t have a BTCMap community page yet? → Create one at btcmap.org/communities
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleSyncBtcmap} disabled={syncingBtcmap || !btcmapAreaId.trim()} size="sm" className="gap-1.5 bg-score-amber text-background hover:bg-score-amber/90">
                <RefreshCw className={`h-3.5 w-3.5 ${syncingBtcmap ? 'animate-spin' : ''}`} /> Sync from BTCMap
              </Button>
              <span className="text-xs text-muted-foreground">
                Last synced: {community?.btcmap_last_synced ? new Date(community.btcmap_last_synced).toLocaleString() : 'Never'}
              </span>
              <span className="text-xs text-muted-foreground">Merchants synced: {merchants?.filter((merchant: any) => merchant.source === 'btcmap').length ?? 0}</span>
            </div>

            {btcmapSyncResult && (
              <div className="rounded-md border border-border bg-background p-4 text-sm">
                {btcmapSyncResult.type === 'error' ? (
                  <div className="space-y-2">
                    <div className="font-semibold text-destructive">✗ Community not found</div>
                    <p className="text-muted-foreground">&quot;{btcmapSyncResult.areaId}&quot; doesn&apos;t exist on BTCMap.</p>
                    <a href="https://btcmap.org/communities" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Check your ID at btcmap.org/communities</a>
                  </div>
                ) : btcmapSyncResult.type === 'empty' ? (
                  <div className="space-y-2">
                    <div className="font-semibold text-score-amber">⚠ 0 merchants found</div>
                    <p className="text-muted-foreground">Your BTCMap community exists but has no Bitcoin-accepting merchants listed yet.</p>
                    <a href="https://btcmap.org" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Add merchants at btcmap.org <ExternalLink className="h-3 w-3" /></a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="font-semibold text-primary">✓ Synced successfully</div>
                    <div className="grid gap-1 border-y border-border py-3 text-muted-foreground">
                      <div><span className="text-foreground">Community:</span> {btcmapSyncResult.community_name}</div>
                      <div><span className="text-foreground">Merchants:</span> {btcmapSyncResult.synced} synced from BTCMap</div>
                      <div><span className="text-foreground">Profile:</span> <a href={btcmapSyncResult.btcmap_profile_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{btcmapSyncResult.btcmap_profile_url?.replace('https://', '')} →</a></div>
                      <div><span className="text-foreground">Score:</span> Recalculating...</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleSyncBtcmap} disabled={syncingBtcmap} variant="outline" size="sm">Sync again</Button>
                      <Button asChild variant="outline" size="sm"><a href={btcmapSyncResult.btcmap_profile_url} target="_blank" rel="noopener noreferrer">View on BTCMap →</a></Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Blink Wallet Integration */}
        <section className="mb-6">
          <BlinkWalletSettings communityId={communityId!} isAdmin={true} />
        </section>

        {/* Merchant claim links */}
        <section className="mb-6">
          <MerchantClaimManager communityId={communityId!} />
        </section>

        {/* Connected Blink wallets (merchants + earners) */}
        <section className="mb-6">
          <ConnectedWalletsManager communityId={communityId!} />
        </section>

        {/* Score Section */}
        <section className="rounded-lg border border-border bg-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Circularity Score: {latestScore?.score ?? '—'}</h2>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRecalculate} disabled={recalculating}>
              <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? 'animate-spin' : ''}`} /> Recalculate
            </Button>
          </div>
          {latestScore && (
            <p className="text-xs text-muted-foreground mb-4">Last calculated: {new Date(latestScore.calculated_at).toLocaleString()}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {pillars.map(p => <ScoreBar key={p.label} label={p.label} value={Math.round(p.value)} />)}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-3">Request permanent deletion of this economy and all its data.</p>
          <Button variant="destructive" size="sm" onClick={() => toast({ title: 'Deletion requested', description: 'A super-admin will review your request.' })}>
            Request economy deletion
          </Button>
        </section>
      </div>
    </div>
  );
};

export default EconomyAdminDashboard;
