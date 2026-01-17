
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichedData {
    name: string | null;
    role: string | null;
    phone1: string | null;
    phone2: string | null;
    instagram: string | null;
    linkedin: string | null;
    email: string | null;
    website: string | null;
    cnpj: string | null;
    confidence: "high" | "medium" | "low";
}

serve(async (req: Request) => {
    // 0. CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Auth & Credit Check (Security Gate)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        const supabaseUserClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        // Get Dynamic API Keys from settings table
        const { data: settingsData } = await supabaseAdmin
            .from('settings')
            .select('value')
            .eq('key', 'api_keys')
            .single();

        const apiKeys = settingsData?.value || {};

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            throw new Error('User has no organization');
        }

        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('enrich_credits, subscription_status')
            .eq('id', profile.organization_id)
            .single();

        if (!org || org.enrich_credits <= 0) {
            return new Response(JSON.stringify({ error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' }), {
                status: 402,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Parse Input
        const { businessName, location, website } = await req.json();
        if (!businessName || !location) {
            throw new Error('businessName and location are required');
        }

        // 3. Parallel Enrichment (Promise.all)
        const TAVILY_API_KEY = apiKeys.tavily || Deno.env.get('TAVILY_API_KEY');
        const FIRECRAWL_API_KEY = apiKeys.firecrawl || Deno.env.get('FIRECRAWL_API_KEY');
        const GROQ_API_KEY = apiKeys.groq || Deno.env.get('GROQ_API_KEY');

        const fetchTavily = async () => {
            if (!TAVILY_API_KEY) return '';
            try {
                // Modified Query to specifically target Instagram, WhatsApp and Owner Name
                const query = `"${businessName}" ${location} instagram whatsapp dono proprietário celular contato`;
                const response = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: TAVILY_API_KEY,
                        query: query,
                        search_depth: "basic",
                        max_results: 7
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.results) {
                        const txt = data.results.map((r: any) => `Título: ${r.title}\nURL: ${r.url}\nConteúdo: ${r.content}\n---`).join('\n');
                        return `\n--- TAVILY SEARCH (Focado em Social/Contato) ---\n${txt}`;
                    }
                }
            } catch (e) {
                console.error("Tavily Error:", e);
            }
            return '';
        };

        const fetchFirecrawl = async () => {
            if (!website || !FIRECRAWL_API_KEY) return '';

            const SOCIAL_DOMAINS = ['wa.me', 'whatsapp.com', 'instagram.com', 'facebook.com', 'linkedin.com', 'twitter.com', 'x.com', 'youtube.com', 'tiktok.com'];
            const isSocialUrl = (url: string) => SOCIAL_DOMAINS.some(d => url.toLowerCase().includes(d));

            if (isSocialUrl(website)) {
                console.log(`[Firecrawl] Skipped Social URL: ${website}`);
                return '';
            }

            try {
                const scrapeUrl = async (target: string) => {
                    const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
                        },
                        body: JSON.stringify({ url: target, formats: ['markdown'], onlyMainContent: true })
                    });
                    if (!resp.ok) return '';
                    const json = await resp.json();
                    return json.data?.markdown || '';
                };

                console.log(`[Firecrawl] Scraping Main Page: ${website}`);
                const mainContent = await scrapeUrl(website);

                const baseUrl = website.replace(/\/$/, '');
                const targetSub = `${baseUrl}/sobre`;

                console.log(`[Firecrawl] Scraping Sub Page: ${targetSub}`);
                const subContent = await scrapeUrl(targetSub);

                let combined = `\n\n--- FIRECRAWL MAIN --- \n${mainContent}`;
                if (subContent) {
                    combined += `\n\n--- FIRECRAWL SUBPAGE (/sobre) ---\n${subContent}`;
                }
                return combined;

            } catch (e) {
                console.error("Firecrawl Error:", e);
                return '';
            }
        };

        // EXECUTE PARALLEL REQUESTS
        const [tavilyContext, firecrawlContext] = await Promise.all([
            fetchTavily(),
            fetchFirecrawl()
        ]);

        let combinedContext = tavilyContext + firecrawlContext;

        // 4. Optimization
        if (combinedContext.length > 15000) {
            combinedContext = combinedContext.substring(0, 15000) + "\n...[TRUNCATED]";
        }

        combinedContext = combinedContext.replace(/política de cookies|termos de uso|todos os direitos reservados/gi, ' ');

        // 5. Groq Inference - Prompt Optimized for Instagram match
        let finalResult: EnrichedData | null = null;
        if (GROQ_API_KEY) {
            const prompt = `
    Você é um especialista em OSINT. Sua prioridade NÚMERO UM é encontrar o INSTAGRAM e o WHATSAPP/CELULAR do negócio.

    Analise os dados abaixo sobre "${businessName}" em "${location}".

    DADOS:
    ${combinedContext || "Nenhum dado adicional encontrado."}
    
    Site: ${website || "Ñ informado"}

    REGRAS DE EXTRAÇÃO:
    1. INSTAGRAM (CRÍTICO): Procure por links "instagram.com/usuario" ou menções "@usuario". 
       - O Instagram muitas vezes aparece no rodapé ou cabeçalho do conteúdo raspado.
       - Se encontrar múltiplos, o mais provável é o oficial da empresa.
    2. CELULAR/WHATSAPP (CRÍTICO): Procure por padrões (XX) 9XXXX-XXXX. 
       - Ignore telefones fixos (XX) 3XXX-XXXX para o campo 'phone1' (use para 'phone2').
       - Se encontrar "WhatsApp: ..." capture imediatamente.
    3. DONO: Procure nomes associados a Sócio/Fundador. 

    VERIFICAÇÃO DE IDENTIDADE (MUITO IMPORTANTE):
    - O "${businessName}" é a SUA ÚNICA REFERÊNCIA DE IDENTIDADE.
    - Se "${businessName}" parecer o NOME DE UMA PESSOA (ex: Dra. Joana Silva), a pessoa encontrada DEVE ser exatamente ela.
    - Se encontrar uma pessoa com o MESMO PRIMEIRO NOME mas SOBRENOME DIFERENTE (ex: encontrou Dra. Joana Souza), ignore-a completamente. É um 'Erro de Identidade'. 
    - EXTREMO CUIDADO: Não confunda "Jéssica Montbello" com "Jéssica Zanoni" ou qualquer outra Jéssica. Os sobrenomes DEVEM bater.
    - Compare o nome no "${businessName}" com o nome no perfil de Instagram/LinkedIn. Se os sobrenomes não baterem, retorne null para instagram/linkedin/name.
    - NÃO associe perfis de concorrentes ou outras pessoas da mesma região apenas por terem nomes similares.
    - Se tiver dúvida mútua ou os dados parecerem de outra pessoa, retorne null e confidence "low".

    Responda APENAS JSON:
    {
      "name": "Nome do Sócio ou null",
      "role": "Cargo ou null",
      "phone1": "WhatsApp/Celular Pessoal (Prioridade) ou null",
      "phone2": "Telefone Fixo ou null",
      "instagram": "Link COMPLETO do Instagram (https://instagram.com/...) ou null",
      "linkedin": "URL ou null",
      "email": "Email ou null",
      "website": "URL ou null",
      "cnpj": "CNPJ ou null",
      "confidence": "high" | "medium" | "low"
    }
    `;

            try {
                const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.1
                    })
                });

                if (resp.ok) {
                    const data = await resp.json();
                    let content = data.choices[0].message.content;
                    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
                    if (jsonMatch) content = jsonMatch[1];
                    try {
                        finalResult = JSON.parse(content);
                    } catch (e) {
                        console.error("JSON Parse Error:", e);
                    }
                }
            } catch (e) {
                console.error("Groq Error:", e);
            }
        }

        if (!finalResult) {
            finalResult = {
                name: null, role: null, phone1: null, phone2: null,
                instagram: null, linkedin: null, email: null,
                website: website || null, cnpj: null, confidence: "low"
            };
        }

        // 6. Deduct Credit
        await supabaseAdmin.rpc('deduct_credit', {
            user_id_p: user.id,
            amount_p: 1,
            type_p: 'enrich'
        });

        return new Response(JSON.stringify(finalResult), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400, // or 500 depending on error, but 400 is safer for now
        });
    }
});
