
ALTER VIEW public.wallets_public SET (security_invoker = true);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_appoint_admin_as_validator() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_economy_activated() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Only backend can insert blink transactions" ON public.blink_transactions;
DROP POLICY IF EXISTS "Only backend can update blink transactions" ON public.blink_transactions;
DROP POLICY IF EXISTS "Only backend can insert earner wallets" ON public.earner_wallets;
DROP POLICY IF EXISTS "Only backend can update earner wallets" ON public.earner_wallets;
DROP POLICY IF EXISTS "Only backend can delete earner wallets" ON public.earner_wallets;
DROP POLICY IF EXISTS "Only backend can insert invoices" ON public.merchant_invoices;
DROP POLICY IF EXISTS "Only backend can update invoices" ON public.merchant_invoices;

-- blink_transactions: hide sensitive columns from anon
REVOKE SELECT ON public.blink_transactions FROM anon;
GRANT SELECT (
  id, community_id, direction, settlement_amount, settlement_currency,
  status, is_internal, blink_created_at, flow_type, created_at
) ON public.blink_transactions TO anon;
GRANT SELECT ON public.blink_transactions TO authenticated;

-- communities: hide contact_email from anon
REVOKE SELECT ON public.communities FROM anon;
GRANT SELECT (
  id, name, slug, country, country_code, city, region, description, admin_id,
  member_count, status, created_at, updated_at, declared_population, website,
  twitter_handle, founding_year, economic_zone_description,
  bbox_north, bbox_south, bbox_east, bbox_west, btcmap_last_synced,
  logo_url, banner_url, btcmap_area_id, btcmap_profile_url,
  monthly_transactions, active_days_this_month, activity_rate,
  metrics_updated_at, fbce_tier, fbce_tier_verified, setup_checklist
) ON public.communities TO anon;

-- community_profiles: hide contact_email from anon
REVOKE SELECT ON public.community_profiles FROM anon;
GRANT SELECT (
  id, community_id, admin_user_id, logo_url, banner_url, website,
  twitter_handle, founding_year, economic_zone_description,
  created_at, updated_at
) ON public.community_profiles TO anon;

-- merchants: hide sensitive fields from anon AND authenticated
REVOKE SELECT ON public.merchants FROM anon, authenticated;
GRANT SELECT (
  id, community_id, name, category, address, lat, lng, payment_methods,
  website, submitted_by, status, approved_at, created_at, source, btcmap_id,
  public_merchant_id, wallet_id, merchant_code, has_wallet_pending,
  btcmap_node_id, claimed_at
) ON public.merchants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.merchants TO authenticated;

-- community_admins: signed-in only
DROP POLICY IF EXISTS "Community admins are publicly readable" ON public.community_admins;
CREATE POLICY "Community admins readable to signed-in users"
  ON public.community_admins FOR SELECT TO authenticated USING (true);

-- validators: signed-in only
DROP POLICY IF EXISTS "Validators are publicly readable" ON public.validators;
CREATE POLICY "Validators readable to signed-in users"
  ON public.validators FOR SELECT TO authenticated USING (true);

-- earner_wallets: admins/validators/super admins only
DROP POLICY IF EXISTS "Earner wallets are publicly readable" ON public.earner_wallets;
CREATE POLICY "Community admins and validators can read earner wallets"
  ON public.earner_wallets FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.communities c
            WHERE c.id = earner_wallets.community_id AND c.admin_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.community_admins ca
               WHERE ca.community_id = earner_wallets.community_id AND ca.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.validators v
               WHERE v.community_id = earner_wallets.community_id AND v.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- merchant_invoices: owners/admins only
DROP POLICY IF EXISTS "Invoices are publicly readable" ON public.merchant_invoices;
CREATE POLICY "Merchant owners and community admins can read invoices"
  ON public.merchant_invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = merchant_invoices.merchant_id
        AND (
          m.submitted_by = auth.uid()
          OR EXISTS (SELECT 1 FROM public.communities c
                     WHERE c.id = m.community_id AND c.admin_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.community_admins ca
                     WHERE ca.community_id = m.community_id AND ca.user_id = auth.uid())
        )
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Storage: disable broad public listing
DROP POLICY IF EXISTS "public_read_economy_assets" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read economy-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read economy-banners" ON storage.objects;

-- Storage: economy-logos / economy-banners - verify community admin (path: {community_id}/{user_id}/...)
DROP POLICY IF EXISTS "auth_insert_economy_assets" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_economy_assets" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_economy_assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to economy-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to economy-banners" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to economy-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to economy-banners" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete economy-logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete economy-banners" ON storage.objects;

CREATE POLICY "Community admins insert economy assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('economy-logos', 'economy-banners')
    AND EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (
          c.admin_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.community_admins ca
                     WHERE ca.community_id = c.id AND ca.user_id = auth.uid())
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

CREATE POLICY "Community admins update economy assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('economy-logos', 'economy-banners')
    AND EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (
          c.admin_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.community_admins ca
                     WHERE ca.community_id = c.id AND ca.user_id = auth.uid())
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

CREATE POLICY "Community admins delete economy assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('economy-logos', 'economy-banners')
    AND EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (
          c.admin_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.community_admins ca
                     WHERE ca.community_id = c.id AND ca.user_id = auth.uid())
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

-- Storage: proof-media (path: {community_id}/{user_id}/...)
CREATE POLICY "Users insert own proof media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'proof-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users update own proof media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'proof-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users delete own proof media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'proof-media'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
