import { corsHeaders } from '@supabase/supabase-js/cors'
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

    // If approved, get community_id and trigger score recalculation
    if (newStatus === 'approved') {
      const { data: submission } = await supabase
        .from(tableName)
        .select('community_id')
        .eq('id', submission_id)
        .single()

      if (submission) {
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
