import { LeadStatus } from '../types';
import { getGroqKey } from './settingsService';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

interface GroqResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

async function queryGroqModel(model: string, prompt: string): Promise<any> {
    const apiKey = await getGroqKey();
    if (!apiKey) {
        throw new Error('Groq API Key missing. Configure in Admin Panel.');
    }

    const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Groq API error (${model}): ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data: GroqResponse = await response.json();
    return data;
}

export const enrichLeadWithGroq = async (businessName: string, location: string, existingWebsite?: string, searchContext?: string) => {
    const apiKey = await getGroqKey();
    if (!apiKey) {
        console.error('Groq API Key missing');
        return null;
    }

    console.log('IA Provedor: Groq (Llama 3.3 Versatile) + Tavily Search');

    // Prompt Anti-Alucinação com Contexto Real
    const prompt = `
    Você é um especialista em Inteligência de Fontes Abertas (OSINT) e prospecção corporativa.
    Analise os resultados da pesquisa abaixo sobre "${businessName}" em "${location}" para encontrar o TOMADOR DE DECISÃO.

    RESULTADOS DA PESQUISA:
    ${searchContext || "Nenhum dado adicional encontrado na busca web."}
    
    Site conhecido: ${existingWebsite || "Não informado"}
    Localização: ${location}

    DIRETRIZES DE EXTRAÇÃO (OSINT):
    1. IDENTIFICAR DECISOR: Procure por nomes associados a cargos como Sócio, Proprietário, Fundador, CEO, Diretor ou Administrador.
       - Se encontrar "Giovana Afonso" no LinkedIn da empresa "Giovana.com.br", assuma que é a dona.
    2. CONTATO DIRETO: Busque números de celular/WhatsApp (começando com DDD + 9...).
       - Muitos sócios colocam o Zap na bio do Instagram ou rodapé do site. Priorize estes no 'phone1'.
    3. CHECAGEM CRUZADA: Use o contexto para validar se o perfil do LinkedIn pertence mesmo à empresa citada.
    4. INTEGRIDADE: Se não encontrar evidências claras de um nome ou telefone pessoal, retorne null. NÃO INVENTE.

    Responda APENAS com este JSON:
    {
      "name": "Nome do Sócio/Dono ou null",
      "role": "Cargo (ex: Sócio-Administrador) ou null",
      "phone1": "WhatsApp/Celular Pessoal ou null",
      "phone2": "Telefone Fixo/Comercial ou null",
      "instagram": "URL ou null",
      "linkedin": "URL do Perfil Pessoal ou null",
      "email": "Email se houver ou null",
      "website": "URL oficial ou null",
      "cnpj": "Apenas números ou null",
      "confidence": "high" | "medium" | "low"
    }
    `;

    let content = "";

    try {
        console.log("Enviando prompt com contexto para llama-3.3-70b-versatile...");
        const data = await queryGroqModel('llama-3.3-70b-versatile', prompt);
        content = data.choices[0].message.content;
    } catch (error) {
        console.error("Groq/Llama 3.3 failed:", error);
        return null;
    }

    // Safety cleanup (Regex) just in case
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Clean up markdown code blocks if present
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
        content = jsonMatch[1];
    }

    try {
        return JSON.parse(content);
    } catch (parseError) {
        console.warn('Groq JSON parse failed, returning empty structure:', parseError);
        return {
            name: null, role: null, phone1: null, phone2: null,
            instagram: null, linkedin: null, email: null,
            website: null, cnpj: null, confidence: "low"
        };
    }
};

export const translateCategoryWithGroq = async (category: string): Promise<string> => {
    const apiKey = await getGroqKey();
    if (!apiKey) return category;

    const prompt = `Traduza apenas o nome desta categoria de negócio de inglês para português do Brasil. Retorne apenas a tradução pura, sem explicações ou aspas. Exemplo: "Lawyer" -> "Advogado".
  Categoria: "${category}"`;

    try {
        const data = await queryGroqModel('llama-3.3-70b-versatile', prompt);
        return data.choices[0].message.content.trim().replace(/"/g, '');
    } catch (error) {
        return category;
    }
};
