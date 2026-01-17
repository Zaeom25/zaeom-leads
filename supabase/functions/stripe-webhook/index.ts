import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const signature = req.headers.get('Stripe-Signature')

    if (!signature) {
        console.error('No Stripe-Signature header')
        return new Response('No signature', { status: 400 })
    }

    try {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        const body = await req.text()
        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
        let event

        try {
            if (!webhookSecret) {
                console.error('STRIPE_WEBHOOK_SECRET is not set')
                throw new Error('STRIPE_WEBHOOK_SECRET is not set')
            }
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
        } catch (err: any) {
            console.error(`⚠️ Webhook signature verification failed: ${err.message}`)
            return new Response('Webhook Error: ' + err.message, { status: 400 })
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log(`[Webhook] Processing event type: ${event.type}`)

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                const orgId = session.metadata?.organization_id
                console.log(`[Checkout] Session ID: ${session.id}, Org ID: ${orgId}, Mode: ${session.mode}`)

                if (!orgId) {
                    console.error('[Checkout] No organization_id in session metadata')
                    break
                }

                if (session.mode === 'subscription') {
                    console.log(`[Checkout] Awarding credits and setting PRO for org: ${orgId}`)
                    // Award 50/50 credits for new subscription
                    const { error: rpcError } = await supabaseAdmin.rpc('add_credits', {
                        org_id_p: orgId,
                        search_amount: 50,
                        enrich_amount: 50
                    })
                    if (rpcError) console.error(`[Checkout] RPC add_credits error: ${rpcError.message}`)

                    const { error: orgError } = await supabaseAdmin
                        .from('organizations')
                        .update({
                            subscription_status: 'pro',
                            stripe_customer_id: session.customer as string,
                            stripe_subscription_id: session.subscription as string
                        })
                        .eq('id', orgId)
                    if (orgError) console.error(`[Checkout] Org update error: ${orgError.message}`)

                    const { error: profError } = await supabaseAdmin
                        .from('profiles')
                        .update({ subscription_status: 'pro' })
                        .eq('organization_id', orgId)
                    if (profError) console.error(`[Checkout] Profile update error: ${profError.message}`)
                }
                else if (session.mode === 'payment') {
                    console.log(`[Checkout] Payment mode, checking price ID...`)
                    const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
                    const priceId = lineItems.data[0]?.price?.id
                    console.log(`[Checkout] Price ID: ${priceId}`)

                    if (priceId === 'price_1SjBr600ZRYkYo4mDXq74El3') {
                        console.log(`[Checkout] Awarding 50 search credits for org: ${orgId}`)
                        const { error: rpcError } = await supabaseAdmin.rpc('add_credits', {
                            org_id_p: orgId,
                            search_amount: 50,
                            enrich_amount: 0
                        })
                        if (rpcError) console.error(`[Checkout] RPC add_credits error: ${rpcError.message}`)
                    }
                }
                break
            }

            case 'charge.refunded': {
                const charge = event.data.object
                const customerId = charge.customer as string
                console.log(`[Refund] Charge ID: ${charge.id}, Customer: ${customerId}`)

                const { data: org } = await supabaseAdmin
                    .from('organizations')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .single()

                if (org) {
                    console.log(`[Refund] Updating org ${org.id} to REFUNDED status`)
                    await supabaseAdmin
                        .from('organizations')
                        .update({
                            search_credits: 0,
                            enrich_credits: 0,
                            subscription_status: 'refunded'
                        })
                        .eq('id', org.id)

                    await supabaseAdmin
                        .from('profiles')
                        .update({ subscription_status: 'refunded' })
                        .eq('organization_id', org.id)
                } else {
                    console.warn(`[Refund] No organization found for customer ${customerId}`)
                }
                break
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object
                console.log(`[Invoice] Reason: ${invoice.billing_reason}, Customer: ${invoice.customer}`)

                // Handle both renewals, creations, and updates
                if (['subscription_cycle', 'subscription_create', 'subscription_update'].includes(invoice.billing_reason)) {
                    const customerId = invoice.customer as string
                    const { data: org } = await supabaseAdmin
                        .from('organizations')
                        .select('id')
                        .eq('stripe_customer_id', customerId)
                        .single()

                    if (org) {
                        console.log(`[Invoice] Ensuring PRO status and refreshing credits for org: ${org.id}`)
                        await supabaseAdmin
                            .from('organizations')
                            .update({
                                search_credits: 50,
                                enrich_credits: 50,
                                subscription_status: 'pro'
                            })
                            .eq('id', org.id)

                        await supabaseAdmin
                            .from('profiles')
                            .update({ subscription_status: 'pro' })
                            .eq('organization_id', org.id)
                    } else {
                        console.warn(`[Invoice] No organization found for customer ${customerId}`)
                    }
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object
                console.log(`[Subscription] DELETED: ${subscription.id}`)
                const { data: org } = await supabaseAdmin
                    .from('organizations')
                    .select('id')
                    .eq('stripe_subscription_id', subscription.id)
                    .single()

                if (org) {
                    console.log(`[Subscription] Setting org ${org.id} to FREE status`)
                    await supabaseAdmin
                        .from('organizations')
                        .update({ subscription_status: 'free' })
                        .eq('id', org.id)

                    await supabaseAdmin
                        .from('profiles')
                        .update({ subscription_status: 'free' })
                        .eq('organization_id', org.id)
                }
                break
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object
                const isPaid = ['active', 'trialing'].includes(subscription.status)
                const status = isPaid ? 'pro' : 'free'
                console.log(`[Subscription] UPDATED: ${subscription.id}, Status: ${subscription.status} -> DB Status: ${status}`)

                const { data: org } = await supabaseAdmin
                    .from('organizations')
                    .select('id')
                    .eq('stripe_customer_id', subscription.customer as string)
                    .single()

                if (org) {
                    await supabaseAdmin
                        .from('organizations')
                        .update({
                            subscription_status: status,
                            stripe_subscription_id: subscription.id
                        })
                        .eq('id', org.id)

                    await supabaseAdmin
                        .from('profiles')
                        .update({ subscription_status: status })
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
        console.error(`[Webhook] CRITICAL ERROR: ${err.message}`)
        return new Response(err.message, { status: 400 })
    }
})

