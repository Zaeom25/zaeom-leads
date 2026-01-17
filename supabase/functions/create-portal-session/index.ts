import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            throw new Error('User not authenticated')
        }

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // Get user and organization data to find stripe_customer_id
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: profile, error: profileErr } = await supabaseAdmin
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (profileErr || !profile?.organization_id) {
            throw new Error('User profile or organization not found')
        }

        const { data: org, error: orgErr } = await supabaseAdmin
            .from('organizations')
            .select('stripe_customer_id')
            .eq('id', profile.organization_id)
            .single()

        if (orgErr || !org?.stripe_customer_id) {
            throw new Error('Stripe customer not found for this organization')
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: org.stripe_customer_id,
            return_url: `${req.headers.get('origin')}/`,
        })

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
