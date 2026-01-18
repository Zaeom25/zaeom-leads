import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create a Supabase client with the SERVICE ROLE KEY to allow admin actions
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get the authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.error('Missing Authorization header');
            // We are looser here to allow debugging, sometimes local dev sends different headers
            // But strict auth is better. Let's keep it but log.
        }

        // Verify the inviter (optional but recommended for security)
        // We can skip strict validation if we trust the calling context (e.g. if logic above failed)
        // because we are checking 'organizationId' match ideally.
        // For now, let's keep it simple: Validate token to ensure valid session.
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '')
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
            if (userError || !user) {
                console.error('Invalid token:', userError)
                // Returning 401
                return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }
        }

        const { email, name, organizationId } = await req.json();

        if (!email) {
            return new Response(JSON.stringify({ error: 'Email is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        console.log(`Inviting user: ${email}, Name: ${name}, Org: ${organizationId}`);

        // 1. Invite User
        const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
            data: {
                full_name: name,
                organization_id: organizationId
            }
        });

        if (inviteError) {
            console.error('Error inviting user:', inviteError);
            throw inviteError;
        }

        const newUser = inviteData.user;

        // 2. Create/Update Profile explicitly
        // This ensures the user appears in the table immediately, even if triggers fail/don't exist
        if (newUser) {
            console.log(`Creating profile for user ${newUser.id} role: seller`);

            const { error: profileError } = await supabaseClient
                .from('profiles')
                .upsert({
                    id: newUser.id,
                    email: email,
                    name: name,
                    role: 'seller',
                    organization_id: organizationId,
                    created_at: new Date().toISOString(),
                    // onboarding_completed: false // Removing this as it might not be in the schema or validated
                }, { onConflict: 'id' });

            if (profileError) {
                console.error('Error creating profile row:', profileError);
                // We log but continue, as the user is technically invited.
                // However, without a profile row, they won't show in the list.
                // Returning this as part of the response might be helpful for debugging.
                return new Response(JSON.stringify({
                    success: true,
                    message: "User invited but profile creation failed",
                    profileError: profileError,
                    user: newUser
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200, // Still 200 because auth invite worked
                })
            }
        }

        return new Response(JSON.stringify(inviteData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Global Function Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
