import { GoogleGenAI } from "@google/genai";
import { Lead, LeadStatus } from "../types";
import { enrichLeadWithGroq } from './groqService';
import { searchWebData } from './tavilyService';
import { scrapeDeepData } from './firecrawlService';
import { checkCredits, deductCredit } from './creditService';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Sanitization to avoid "null" or "Não encontrado" strings
const sanitizeAIValue = (val: any): string | null => {
  if (!val) return null;
  const s = String(val).toLowerCase().trim();
  if (['null', 'undefined', 'n/a', 'não encontrado', 'nao encontrado', 'não identificado', 'nao identificado', 'none', ''].includes(s)) {
    return null;
  }
  return String(val).trim();
};

// Internal wrapper to handle 429 quota errors by falling back to 1.5-flash
const generateContentWithFallback = async (ai: any, config: any) => {
  console.log('Requisição enviada para: ' + config.model);
  return await ai.models.generateContent(config);
};

export const searchLeads = async (niche: string, location: string, quantity: number = 5, excludedNames: string[] = []): Promise<Lead[]> => {
  // 1. Credit Check
  const { hasCredits } = await checkCredits('search');
  if (!hasCredits) {
    throw new Error('INSUFFICIENT_CREDITS');
  }

  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const fetchCount = Math.min(20, quantity + 3);

  const prompt = `
      Atue como um especialista em prospecção de leads(SDR).
      Encontre ${fetchCount} pequenas empresas ou profissionais liberais que trabalhem como "${niche}" em "${location}".
      
      CRITÉRIO DE SELEÇÃO E EXTRAÇÃO:
1. Priorize empresas pequenas / médias locais.
  ${excludedNames.length > 0 ? `2. EVITE ABSOLUTAMENTE estas empresas: ${excludedNames.slice(0, 50).join(", ")}` : ''}
3. Extraia o nome, endereço, nota(rating) e número de avaliações diretamente do Google Maps.
      4. Busque o WEBSITE oficial e TELEFONES de forma agressiva.Se houver mais de um telefone, retorne - os separados por vírgula.
      5. REGRA DE OURO: Só retorne leads que tenham pelo menos UM telefone válido.Se não encontrar o telefone, IGNORE o lead.
      6. NÃO realize buscas profundas por redes sociais neste estágio(isso será feito depois).
      7. O campo "website" deve ser a URL REAL da empresa, não o link do Google Maps.
      8. Especialidade(specialty): Deve ser CURTA(máximo 2 - 3 palavras).Ex: "Direito Civil" em vez de uma lista enorme.
      9. RESPOSTA: Retorne APENAS o JSON puro.NÃO inclua citações formatadas como[cite:...] ou markdown explicativo.
  
      Estrutura do Objeto JSON:
[
  {
    "businessName": "Nome do Negócio",
    "address": "Endereço completo",
    "rating": 4.5,
    "reviewCount": 10,
    "phoneNumber": "Telefone ou múltiplos separados por vírgula (OBRIGATÓRIO)",
    "website": "URL oficial ou null",
    "summary": "Breve descrição (curta)",
    "specialty": "Nicho (Máximo 2-3 palavras)"
  }
]
  `;

  try {
    const response = await generateContentWithFallback(ai, {
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let jsonText = response.text || "[]";
    jsonText = jsonText
      .replace(/\[cite:[^\]]+\]/g, "")
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let rawLeads: any[] = [];
    try {
      rawLeads = JSON.parse(jsonText);
    } catch (e) {
      const start = jsonText.indexOf('[');
      const end = jsonText.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        try {
          rawLeads = JSON.parse(jsonText.substring(start, end + 1));
        } catch (e2) { }
      }
    }

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const leads: Lead[] = rawLeads
      .map((raw: any, index: number) => {
        const relevantChunk = chunks.find((c: any) =>
          c.web?.title?.toLowerCase().includes(raw.businessName?.toLowerCase()) ||
          index < chunks.length
        );

        let mapUri = undefined;
        if (relevantChunk && 'web' in relevantChunk && relevantChunk.web) {
          mapUri = relevantChunk.web.uri;
        }

        const phone = sanitizeAIValue(raw.phoneNumber) || 'Não informado';

        const lead: Lead = {
          id: generateId(),
          businessName: raw.businessName || "Nome não identificado",
          address: raw.address || "Endereço não disponível",
          rating: parseFloat(raw.rating) || 0,
          reviewCount: parseInt(raw.reviewCount) || 0,
          phoneNumber: phone,
          website: sanitizeAIValue(raw.website) || undefined,
          summary: raw.summary || "",
          category: raw.specialty || niche,
          location: location,
          status: LeadStatus.NEW,
          source: 'ai_finder',
          tags: [],
          additional_phones: [],
          googleMapsUri: mapUri,
          addedAt: Date.now(),
        };
        return lead;
      });

    // Deduct credit after successful generation
    await deductCredit('search');

    return leads;
  } catch (error) {
    console.error("Error fetching leads:", error);
    throw error;
  }
};

export const findLeadOwner = async (businessName: string, location: string, existingWebsite?: string, onFallback?: () => void): Promise<{
  name: string;
  role?: string;
  phone1?: string;
  phone2?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  website?: string;
  cnpj?: string;
  confidence: string
} | null> => {
  // 0. Credit Check
  const { hasCredits } = await checkCredits('enrich');
  if (!hasCredits) {
    throw new Error('INSUFFICIENT_CREDITS');
  }

  // PRIORITY 1: GROQ / DEEPSEEK R1
  // User requested to prioritize Groq for stability.
  console.log("🚀 Iniciando enriquecimento (Estratégia Detetive)...");

  if (onFallback) onFallback();

  let searchContext = "";

  // Phase 1: Tavily (Official Data)
  try {
    console.log("Phase 1: Buscando dados oficiais (Tavily)...");
    const taxQuery = `${businessName} ${location} CNPJ quadro societário contato`;
    searchContext = await searchWebData(taxQuery);
  } catch (searchErr) {
    console.warn("Phase 1 failed:", searchErr);
  }

  // Phase 2: Firecrawl (Deep Website Dive)
  // Only if we have a website or if Tavily found one?
  // We use existingWebsite or try to extract one from Phase 1 if possible (parsing Phase 1 is hard without LLM).
  // For now, use existingWebsite if available.
  let firecrawlContent = "";
  if (existingWebsite) {
    console.log("Phase 2: Investigando site oficial (Firecrawl)...");
    const scraped = await scrapeDeepData(existingWebsite);
    if (scraped) {
      firecrawlContent = `\n\n--- DADOS DO SITE OFICIAL (${existingWebsite}) ---\n${scraped.slice(0, 8000)}`; // Limit size for context window
    }
  }

  const combinedContext = `
    ${searchContext}
    ${firecrawlContent}
  `;

  try {
    // Phase 3: Synthesis (Groq)
    const groqResult = await enrichLeadWithGroq(businessName, location, existingWebsite, combinedContext);

    if (groqResult) {
      // Deduct credit only on success
      await deductCredit('enrich');

      return {
        name: sanitizeAIValue(groqResult.name) || "Não identificado",
        role: sanitizeAIValue(groqResult.role) || undefined,
        phone1: sanitizeAIValue(groqResult.phone1) || undefined,
        phone2: sanitizeAIValue(groqResult.phone2) || undefined,
        instagram: sanitizeAIValue(groqResult.instagram) || undefined,
        facebook: sanitizeAIValue(groqResult.facebook) || undefined,
        linkedin: sanitizeAIValue(groqResult.linkedin) || undefined,
        website: sanitizeAIValue(groqResult.website) || undefined,
        cnpj: sanitizeAIValue(groqResult.cnpj) || undefined,
        confidence: groqResult.confidence || "medium"
      };
    }
  } catch (err) {
    console.error("❌ Groq Error:", err);
  }

  console.warn("⚠️ Enrichment finished without result.");
  return null;
};