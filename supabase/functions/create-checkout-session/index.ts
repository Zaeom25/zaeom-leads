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

        const { price_id } = await req.json()

        // Get user and organization data to find stripe_customer_id
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get profile and organization
        const { data: profile, error: profileErr } = await supabaseAdmin
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()

        if (profileErr || !profile?.organization_id) {
            console.error('Profile fetch error:', profileErr)
            throw new Error('User profile or organization not found')
        }

        const { data: org, error: orgErr } = await supabaseAdmin
            .from('organizations')
            .select('stripe_customer_id, name')
            .eq('id', profile.organization_id)
            .single()

        if (orgErr || !org) {
            console.error('Org fetch error:', orgErr)
            throw new Error('Organization not found')
        }

        let customerId = org.stripe_customer_id

        // 2. Ensure Stripe Customer exists
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: org.name || undefined,
                metadata: {
                    supabase_user_id: user.id,
                    organization_id: profile.organization_id
                }
            })
            customerId = customer.id
            await supabaseAdmin
                .from('organizations')
                .update({ stripe_customer_id: customerId })
                .eq('id', profile.organization_id)
        }

        // 3. Determine Checkout Mode (Subscription vs Payment)
        const price = await stripe.prices.retrieve(price_id)
        const mode = price.type === 'recurring' ? 'subscription' : 'payment'

        // 4. Create Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [{ price: price_id, quantity: 1 }],
            mode: mode,
            success_url: `${req.headers.get('origin')}/?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get('origin')}/pricing`,
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            metadata: {
                organization_id: profile.organization_id,
                user_id: user.id
            }
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
