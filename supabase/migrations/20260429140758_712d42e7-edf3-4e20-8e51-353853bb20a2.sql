
ALTER FUNCTION public.generate_merchant_public_id() SECURITY INVOKER;
ALTER FUNCTION public.assign_merchant_public_id() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.generate_merchant_public_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_merchant_public_id() FROM PUBLIC, anon, authenticated;
