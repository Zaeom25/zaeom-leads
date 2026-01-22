
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
    partners: string[] | null;
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
                // Modified Query to specifically target CNPJ, Instagram, WhatsApp and Owner Name
                const query = `"${businessName}" ${location} CNPJ sócios "quadro societário" instagram whatsapp dono proprietário`;
                const response = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: TAVILY_API_KEY,
                        query: query,
                        search_depth: "advanced",
                        max_results: 8
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.results) {
                        const txt = data.results.map((r: any) => `Título: ${r.title}\nURL: ${r.url}\nConteúdo: ${r.content}\n---`).join('\n');
                        return `\n--- TAVILY SEARCH (Focado em Identidade/CNPJ/Social) ---\n${txt}`;
                    }
                }
            } catch (e) {
                console.error("Tavily Error:", e);
            }
            return '';
        };

        const fetchBrasilAPI = async (cnpj: string) => {
            if (!cnpj) return null;
            const cleanCnpj = cnpj.replace(/\D/g, '');
            if (cleanCnpj.length !== 14) return null;

            try {
                const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
                if (response.ok) {
                    const data = await response.json();
                    return {
                        razao_social: data.razao_social,
                        nome_fantasia: data.nome_fantasia,
                        socios: (data.qsa || []).map((s: any) => s.nome_socio),
                        situacao: data.descricao_situacao_cadastral
                    };
                }
            } catch (e) {
                console.error("BrasilAPI Error:", e);
            }
            return null;
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
        console.log(`[Enrich] Context Length before cleaning: ${combinedContext.length}`);

        combinedContext = combinedContext.replace(/política de cookies|termos de uso|todos os direitos reservados/gi, ' ');

        // 4. Optimization
        if (combinedContext.length > 15000) {
            console.log(`[Enrich] Truncating context from ${combinedContext.length} to 15000`);
            combinedContext = combinedContext.substring(0, 15000) + "\n...[TRUNCATED]";
        }

        // 4.1 Extract CNPJ and fetch BrasilAPI if found
        const cnpjRegex = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14}/;
        const cnpjMatch = combinedContext.match(cnpjRegex);
        let brasilApiContext = "";
        if (cnpjMatch) {
            const cnpjData = await fetchBrasilAPI(cnpjMatch[0]);
            if (cnpjData) {
                brasilApiContext = `\n--- DADOS OFICIAIS DO GOVERNO (BrasilAPI) ---\nRazão Social: ${cnpjData.razao_social}\nSócios Oficiais: ${cnpjData.socios.join(', ')}\nSituação: ${cnpjData.situacao}\n---`;
            }
        }

        // 5. Groq Inference - Prompt Optimized for Identity and CNPJ match
        let finalResult: EnrichedData | null = null;
        if (GROQ_API_KEY) {
            const prompt = `
    Você é um investigador OSINT de elite. Sua missão é consolidar a identidade REAL do negócio e de seus proprietários.

    Analise os dados abaixo sobre "${businessName}" em "${location}".

    DADOS:
    ${combinedContext}
    ${brasilApiContext}
    
    Site: ${website || "Ñ informado"}

    REGRAS DE INVESTIGAÇÃO:
    1. IDENTIFICAÇÃO DO DONO (CRÍTICO): 
       - Se houver dados da BrasilAPI, os nomes em 'Sócios Oficiais' são a VERDADE ABSOLUTA sobre a propriedade legal.
       - Use os nomes dos sócios para validar perfis de Instagram/LinkedIn encontrados.
    2. REDES SOCIAIS:
       - Busque o Instagram oficial da empresa.
       - Tente encontrar o Instagram ou LinkedIn PESSOAL dos sócios identificados.
    3. CONTATO: Priorize WhatsApp ou Celular. Separe fixos em 'phone2'.
    4. CNPJ: Extraia o CNPJ real (14 dígitos).

    VERIFICAÇÃO DE IDENTIDADE:
    - O sobrenome DEVE bater. Se o sócio oficial é "Ricardo Almeida", não aceite um Instagram de "Ricardo Santos".
    - Se encontrar dados conflitantes, use a BrasilAPI como desempate para nomes e o Firecrawl para contatos.

    Responda APENAS JSON:
    {
      "name": "Nome do Sócio Principal ou Administrador",
      "role": "Cargo (ex: Sócio-Administrador)",
      "phone1": "WhatsApp/Celular Pessoal",
      "phone2": "Telefone Fixo/Comercial",
      "instagram": "https://instagram.com/perfil_empresa_ou_dono",
      "linkedin": "https://linkedin.com/in/perfil_dono",
      "email": "Email de contato",
      "website": "URL oficial",
      "cnpj": "CNPJ formatado",
      "partners": ["Lista", "de", "todos", "os", "socios", "oficiais"],
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
                website: website || null, cnpj: null, partners: null, confidence: "low"
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
