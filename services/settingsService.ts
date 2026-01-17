import { supabase } from '../lib/supabase';

export interface ApiKeys {
    serper?: string;
    groq?: string;
    firecrawl?: string;
    gemini?: string;
}

let cachedKeys: ApiKeys | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getApiKeys = async (): Promise<ApiKeys> => {
    const now = Date.now();
    if (cachedKeys && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedKeys;
    }

    try {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'api_keys')
            .single();

        if (error) throw error;

        cachedKeys = (data?.value as ApiKeys) || {};
        lastFetchTime = now;
        return cachedKeys;
    } catch (error) {
        console.error('Error fetching API keys from settings:', error);
        // Fallback to env vars if DB fetch fails
        return {
            serper: (import.meta as any).env.VITE_SERPER_API_KEY,
            groq: (import.meta as any).env.VITE_GROQ_API_KEY,
            firecrawl: (import.meta as any).env.VITE_FIRECRAWL_API_KEY,
            gemini: (import.meta as any).env.VITE_GEMINI_API_KEY,
        };
    }
};

export const getSerperKey = async (): Promise<string | undefined> => {
    const keys = await getApiKeys();
    return keys.serper || (import.meta as any).env.VITE_SERPER_API_KEY;
};

export const getGroqKey = async (): Promise<string | undefined> => {
    const keys = await getApiKeys();
    return keys.groq || (import.meta as any).env.VITE_GROQ_API_KEY;
};
