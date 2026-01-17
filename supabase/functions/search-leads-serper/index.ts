
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) throw new Error('Missing Authorization header');

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        // Get Dynamic API Keys from settings table
        const { data: settingsData } = await supabaseAdmin
            .from('settings')
            .select('value')
            .eq('key', 'api_keys')
            .single();

        const apiKeys = settingsData?.value || {};
        const serperKey = apiKeys.serper || Deno.env.get('SERPER_API_KEY');
        const groqKey = apiKeys.groq || Deno.env.get('GROQ_API_KEY');

        if (!serperKey) throw new Error('Serper API Key not configured');

        // Parse Input
        const { niche, location, page = 1, existingPlaceIds = [] } = await req.json();

        // 1. Fetch from Serper
        const response = await fetch('https://google.serper.dev/places', {
            method: 'POST',
            headers: {
                'X-API-KEY': serperKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: `${niche} em ${location}`,
                location: location,
                page: page,
                num: 10,
                hl: 'pt-br',
                gl: 'br'
            }),
        });

        if (!response.ok) {
            throw new Error(`Serper API error: ${response.status}`);
        }

        const data = await response.json();
        const places = data.places || [];

        // 2. Transform and translate using Groq (if needed)
        const leads = await Promise.all(places.map(async (place: any) => {
            let category = place.category || 'Negócio Local';

            // Basic translation fallback or Groq translation
            if (groqKey && /^[a-zA-Z\s]+$/.test(category)) {
                try {
                    const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${groqKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'llama-3.3-70b-versatile',
                            messages: [{
                                role: 'user',
                                content: `Traduza para português do Brasil: "${category}". Retorne apenas a tradução.`
                            }],
                            temperature: 0.1
                        })
                    });
                    if (groqResp.ok) {
                        const groqData = await groqResp.json();
                        category = groqData.choices[0].message.content.trim().replace(/"/g, '');
                    }
                } catch (e) {
                    console.error("Groq translation error:", e);
                }
            }

            return {
                id: Math.random().toString(36).substr(2, 9),
                businessName: place.title,
                address: place.address,
                category: category,
                location: location,
                phoneNumber: place.phoneNumber || 'Não informado',
                website: place.website,
                rating: place.rating,
                reviewCount: place.ratingCount,
                googleMapsUri: place.cid ? `https://maps.google.com/?cid=${place.cid}` : undefined,
                place_id: place.placeId,
                status: 'NEW',
                source: 'ai_finder',
                addedAt: Date.now(),
                isSaved: existingPlaceIds.includes(place.placeId)
            };
        }));

        return new Response(JSON.stringify({ leads, nextStartPage: page + 1 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
