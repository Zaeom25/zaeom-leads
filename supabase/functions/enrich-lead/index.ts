
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // 0. CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            console.error('[Enrich] Missing Authorization Header');
            return new Response(JSON.stringify({ error: 'Missing Auth Header' }), { status: 401, headers: corsHeaders });
        }

        // Initialize Admin Client
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

        // Try to identify user but don't hard-fail if it's a localhost session issue
        const supabaseUserClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();

        if (authError || !user) {
            console.warn('[Enrich] Auth Warning: Could not identify user via token, but proceeding in debug mode.', authError?.message);
        }

        // Get Dynamic API Keys from settings table
        const { data: settingsData } = await supabaseAdmin
            .from('settings')
            .select('value')
            .eq('key', 'api_keys')
            .single();

        const apiKeys = settingsData?.value || {};
        const GROQ_API_KEY = apiKeys.groq || Deno.env.get('GROQ_API_KEY');
        const TAVILY_API_KEY = apiKeys.tavily || Deno.env.get('TAVILY_API_KEY');
        const FIRECRAWL_API_KEY = apiKeys.firecrawl || Deno.env.get('FIRECRAWL_API_KEY');

        if (!GROQ_API_KEY) throw new Error('Groq API Key missing in Settings');

        // 2. Parse Input
        const { businessName, location, website } = await req.json();
        if (!businessName || !location) {
            throw new Error('businessName and location are required');
        }

        console.log(`[Enrich] Starting enrichment for: ${businessName} in ${location}`);

        // --- ENRICHMENT LOGIC ---

        // 1. Tavily Search
        let tavilyContext = '';
        if (TAVILY_API_KEY) {
            try {
                const query = `"${businessName}" ${location} CNPJ sócios "quadro societário" instagram whatsapp dono proprietário`;
                const tResp = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: TAVILY_API_KEY,
                        query: query,
                        search_depth: "advanced",
                        max_results: 8
                    })
                });
                if (tResp.ok) {
                    const tData = await tResp.json();
                    tavilyContext = tData.results?.map((r: any) => `Título: ${r.title}\nURL: ${r.url}\nConteúdo: ${r.content}\n---`).join('\n') || '';
                }
            } catch (e) {
                console.error("Tavily Error:", e);
            }
        }

        // 2. Firecrawl Scrape
        let firecrawlContext = '';
        if (website && FIRECRAWL_API_KEY) {
            try {
                const fResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` },
                    body: JSON.stringify({ url: website, formats: ['markdown'], onlyMainContent: true })
                });
                if (fResp.ok) {
                    const fData = await fResp.json();
                    firecrawlContext = fData.data?.markdown || '';
                }
            } catch (e) {
                console.error("Firecrawl Error:", e);
            }
        }

        // 3. BrasilAPI (CNPJ)
        const combined = (tavilyContext + firecrawlContext).substring(0, 15000);
        const cnpjMatch = combined.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14}/);
        let brasilApiContext = '';
        if (cnpjMatch) {
            try {
                const cleanCnpj = cnpjMatch[0].replace(/\D/g, '');
                const bResp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
                if (bResp.ok) {
                    const bData = await bResp.json();
                    brasilApiContext = `\n--- DADOS OFICIAIS (BrasilAPI) ---\nRazão Social: ${bData.razao_social}\nSócios: ${(bData.qsa || []).map((s: any) => s.nome_socio).join(', ')}\nSituação: ${bData.descricao_situacao_cadastral}\n---`;
                }
            } catch (e) {
                console.error("BrasilAPI Error:", e);
            }
        }

        // 4. LLM Synthesis with Groq
        const prompt = `
            Você é um investigador OSINT de elite. Consolidar os dados reais de "${businessName}" em "${location}".
            
            DADOS WEB:
            ${combined}
            
            DADOS OFICIAIS:
            ${brasilApiContext}
            
            Retorne um JSON rigoroso com:
            - name: Nome do proprietário/sócio principal
            - role: Cargo
            - phone1: WhatsApp (preferencial)
            - phone2: Outro telefone
            - instagram: Link perfil
            - linkedin: Link perfil
            - email: Email contato
            - website: ${website || 'Extraído'}
            - cnpj: CNPJ formatado
            - partners: Array de sócios
            - confidence: "high", "medium" ou "low"
        `;

        const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        const groqData = await groqResp.json();
        const result = JSON.parse(groqData.choices[0].message.content);

        // 5. Credit Deduction (if user identified)
        if (user?.id) {
            try {
                await supabaseAdmin.rpc('deduct_credit', { user_id_p: user.id, amount_p: 1, type_p: 'enrich' });
            } catch (e) {
                console.error("Credit deduction failed:", e);
            }
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (err: any) {
        console.error('[Enrich Error]', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});
