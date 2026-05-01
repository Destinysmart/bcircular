const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.25.76'

const BodySchema = z.object({
  submission_id: z.string().uuid(),
  submission_type: z.enum(['merchant', 'earner', 'transaction']),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth: require valid JWT ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { submission_id, submission_type } = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Count votes for this submission
    const { data: votes } = await supabase
      .from('validation_votes')
      .select('vote')
      .eq('submission_id', submission_id)

    const approvals = votes?.filter(v => v.vote === 'approve').length || 0
    const rejections = votes?.filter(v => v.vote === 'reject').length || 0

    const THRESHOLD = 2 // 2-of-3 consensus

    let newStatus: string | null = null
    if (approvals >= THRESHOLD) {
      newStatus = 'approved'
    } else if (rejections >= THRESHOLD) {
      newStatus = 'rejected'
    }

    if (!newStatus) {
      return new Response(JSON.stringify({ 
        message: 'Threshold not yet met', 
        approvals, 
        rejections,
        needed: THRESHOLD 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update the submission status
    const tableName = submission_type === 'merchant' ? 'merchants'
      : submission_type === 'earner' ? 'earners'
      : 'transactions'

    const updateData: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'approved' && submission_type === 'merchant') {
      updateData.approved_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', submission_id)

    if (updateError) {
      throw new Error(`Failed to update ${tableName}: ${updateError.message}`)
    }

    // If approved, get community_id, promote any pending wallet key, and trigger score recalculation
    if (newStatus === 'approved') {
      const { data: submission } = await supabase
        .from(tableName)
        .select('id, community_id, pending_blink_api_key_encrypted, pending_ln_address_hash')
        .eq('id', submission_id)
        .single()

      if (submission) {
        if ((submission_type === 'merchant' || submission_type === 'earner') && submission.pending_blink_api_key_encrypted) {
          const { data: existingWallet } = await supabase
            .from('wallets')
            .select('id, blink_wallet_id')
            .eq('owner_type', submission_type)
            .eq('owner_id', submission.id)
            .maybeSingle()

          // Use owner_id as user_id to avoid colliding on the
          // (user_id, community_id, wallet_currency) unique constraint —
          // each merchant/earner needs its own wallet row.
          let walletId = existingWallet?.id
          const walletPayload = {
            community_id: submission.community_id,
            user_id: submission.id,
            blink_wallet_id: existingWallet?.blink_wallet_id || '',
            wallet_currency: 'BTC',
            balance_sats: 0,
            owner_type: submission_type,
            owner_id: submission.id,
            ln_address_hash: submission.pending_ln_address_hash || null,
            blink_api_key_encrypted: submission.pending_blink_api_key_encrypted,
            wallet_status: 'connected',
          }

          if (walletId) {
            const { error: walletUpdateError } = await supabase.from('wallets').update(walletPayload).eq('id', walletId)
            if (walletUpdateError) throw walletUpdateError
          } else {
            const { data: insertedWallet, error: walletInsertError } = await supabase
              .from('wallets')
              .insert(walletPayload)
              .select('id')
              .single()
            if (walletInsertError) throw walletInsertError
            walletId = insertedWallet.id
          }

          if (submission_type === 'merchant') {
            await supabase.from('merchants').update({
              wallet_id: walletId,
              has_wallet_pending: false,
              pending_blink_api_key_encrypted: null,
              pending_ln_address_hash: null,
            }).eq('id', submission.id)
          } else {
            const { data: earnerWallet } = await supabase.from('earner_wallets').select('id').eq('earner_id', submission.id).maybeSingle()
            if (earnerWallet) {
              await supabase.from('earner_wallets').update({ wallet_id: walletId, claimed_at: new Date().toISOString() }).eq('id', earnerWallet.id)
            } else {
              await supabase.from('earner_wallets').insert({
                earner_id: submission.id,
                community_id: submission.community_id,
                wallet_id: walletId,
                claimed_at: new Date().toISOString(),
              })
            }
            await supabase.from('earners').update({
              has_wallet_pending: false,
              pending_blink_api_key_encrypted: null,
              pending_ln_address_hash: null,
            }).eq('id', submission.id)
          }
        }

        // Trigger score recalculation
        await supabase.functions.invoke('calculate-score', {
          body: { community_id: submission.community_id },
        })
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      status: newStatus,
      submission_id,
      submission_type 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
