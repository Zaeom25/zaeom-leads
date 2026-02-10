import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuração dos Planos (Price IDs devem ser os mesmos do PricingPage.tsx / Stripe Dashboard)
// Configuração dos Planos (Price IDs devem ser os mesmos do PricingPage.tsx / Stripe Dashboard)
// NOTA: Substitua os IDs 'price_...' pelos IDs reais gerados no Stripe.
// Configuração dos Planos (Price IDs devem ser os mesmos do PricingPage.tsx / Stripe Dashboard)
// NOTA: IDs atualizados em 10/02/2026
const PLAN_CONFIG = {
    // Plano Básico (150/150)
    'price_1SzMG6PMpeR5cfVrt8QKvx3I': { search: 150, enrich: 150, status: 'basic' }, // Mensal
    'price_1SzMGlPMpeR5cfVrBSTFrbmD': { search: 150, enrich: 150, status: 'basic' }, // Trimestral
    'price_1SzMHVPMpeR5cfVrQssImHWQ': { search: 150, enrich: 150, status: 'basic' }, // Anual

    // Plano Profissional (400/400)
    'price_1SzMIbPMpeR5cfVrIDfZM2Bl': { search: 400, enrich: 400, status: 'pro' }, // Mensal
    'price_1SzMJ5PMpeR5cfVrrR3Sshqw': { search: 400, enrich: 400, status: 'pro' }, // Trimestral
    'price_1SzMJnPMpeR5cfVrjnDl6y5Y': { search: 400, enrich: 400, status: 'pro' }, // Anual

    // Plano Enterprise (1000/1000)
    'price_1SzMNDPMpeR5cfVroAJzRdnr': { search: 1000, enrich: 1000, status: 'enterprise' }, // Mensal
    'price_1SzMNuPMpeR5cfVrYBezxNT5': { search: 1000, enrich: 1000, status: 'enterprise' }, // Trimestral
    'price_1SzMORPMpeR5cfVr65uI4xHV': { search: 1000, enrich: 1000, status: 'enterprise' }, // Anual

    // Créditos extras (Legacy ou Avulso)
    'price_extra_credits': { search: 50, enrich: 0, status: null }
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const signature = req.headers.get('Stripe-Signature')
    if (!signature) return new Response('No signature', { status: 400 })

    try {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        const body = await req.text()
        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
        let event

        try {
            if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not set')
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
        } catch (err: any) {
            console.error(`⚠️ Webhook signature verification failed: ${err.message}`)
            return new Response('Webhook Error: ' + err.message, { status: 400 })
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log(`[Webhook] Processing event: ${event.type}`)

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                const orgId = session.metadata?.organization_id

                if (!orgId) {
                    console.error('[Checkout] No organization_id in metadata')
                    break
                }

                const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
                const priceId = lineItems.data[0]?.price?.id as keyof typeof PLAN_CONFIG
                const config = PLAN_CONFIG[priceId]

                if (!config) {
                    console.warn(`[Checkout] Unknown Price ID: ${priceId}`)
                    break
                }

                if (session.mode === 'subscription') {
                    console.log(`[Checkout] Activating plan ${config.status} for org: ${orgId}`)

                    // 1. Award Credits
                    await supabaseAdmin.rpc('add_credits', {
                        org_id_p: orgId,
                        search_amount: config.search,
                        enrich_amount: config.enrich
                    })

                    // 2. Update Org Status
                    await supabaseAdmin
                        .from('organizations')
                        .update({
                            subscription_status: config.status,
                            stripe_customer_id: session.customer as string,
                            stripe_subscription_id: session.subscription as string
                        })
                        .eq('id', orgId)

                    // 3. Update Profiles in the same Org
                    await supabaseAdmin
                        .from('profiles')
                        .update({ subscription_status: config.status })
                        .eq('organization_id', orgId)

                } else if (session.mode === 'payment' && priceId === 'price_extra_credits') {
                    console.log(`[Checkout] Adding extra credits to org: ${orgId}`)
                    await supabaseAdmin.rpc('add_credits', {
                        org_id_p: orgId,
                        search_amount: config.search,
                        enrich_amount: 0
                    })
                }
                break
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object
                // Ignore 'subscription_create' because checkout.session.completed handles the first payment/setup.
                // We only want to handle renewals ('subscription_cycle') and updates ('subscription_update').
                if (!['subscription_cycle', 'subscription_update'].includes(invoice.billing_reason)) break

                const customerId = invoice.customer as string
                const subscriptionId = invoice.subscription as string
                const subscription = await stripe.subscriptions.retrieve(subscriptionId)
                const priceId = subscription.items.data[0].price.id as keyof typeof PLAN_CONFIG
                const config = PLAN_CONFIG[priceId]

                if (!config) break

                const { data: org } = await supabaseAdmin
                    .from('organizations')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .single()

                if (org && config.status) {
                    console.log(`[Invoice] Renewing credits for plan ${config.status} to org: ${org.id}`)

                    // Reset or Add credits (Usually monthly plans reset to the limit)
                    // We use update here to SET the credits to the plan's limit for the new month
                    await supabaseAdmin
                        .from('organizations')
                        .update({
                            search_credits: config.search,
                            enrich_credits: config.enrich,
                            subscription_status: config.status
                        })
                        .eq('id', org.id)

                    await supabaseAdmin
                        .from('profiles')
                        .update({ subscription_status: config.status })
                        .eq('organization_id', org.id)
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object
                const { data: org } = await supabaseAdmin
                    .from('organizations')
                    .select('id')
                    .eq('stripe_subscription_id', subscription.id)
                    .single()

                if (org) {
                    console.log(`[Subscription] Canceled. Reverting org ${org.id} to Free.`)
                    await supabaseAdmin
                        .from('organizations')
                        .update({
                            subscription_status: 'free',
                            search_credits: 0, // Reset credits on cancel
                            enrich_credits: 0
                        })
                        .eq('id', org.id)

                    await supabaseAdmin
                        .from('profiles')
                        .update({ subscription_status: 'free' })
                        .eq('organization_id', org.id)
                }
                break
            }

            case 'charge.refunded': {
                const charge = event.data.object
                const customerId = charge.customer as string

                // Find org by customer ID since charge might not have metadata
                const { data: org } = await supabaseAdmin
                    .from('organizations')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .single()

                if (org) {
                    console.log(`[Charge] Refunded. Revoking access for org ${org.id}.`)
                    await supabaseAdmin
                        .from('organizations')
                        .update({
                            subscription_status: 'free',
                            search_credits: 0,
                            enrich_credits: 0
                        })
                        .eq('id', org.id)

                    await supabaseAdmin
                        .from('profiles')
                        .update({ subscription_status: 'free' })
                        .eq('organization_id', org.id)
                }
                break
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (err: any) {
        console.error(`[Webhook] Error: ${err.message}`)
        return new Response(err.message, { status: 400 })
    }
})

