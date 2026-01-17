import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is missing');
            throw new Error('Server configuration error: Missing Secret Key');
        }

        const { email, name, organizationId } = await req.json();
        if (!email) throw new Error('Email is required');

        const { data, error } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
            data: {
                full_name: name,
                organization_id: organizationId
            }
        });

        if (error) throw error

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
