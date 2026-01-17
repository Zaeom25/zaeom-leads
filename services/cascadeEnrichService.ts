import { searchWebData } from './tavilyService';
import { scrapeDeepData } from './firecrawlService';
import { enrichLeadWithGroq } from './groqService';
import { supabase } from '../lib/supabase';

export const detectiveEnrichment = async (
    businessName: string,
    location: string,
    existingWebsite?: string,
    onStatusUpdate?: (status: string) => void
) => {
    try {
        if (onStatusUpdate) onStatusUpdate("Iniciando investigação híbrida (Tavily + Firecrawl + Llama 3)...");

        // Call the new Edge Function which handles Level 1, 2, and 3
        const { data, error } = await supabase.functions.invoke('enrich-lead', {
            body: {
                businessName,
                location,
                website: existingWebsite
            }
        });

        if (error) {
            console.error("Edge Function Error:", error);
            throw error;
        }

        if (onStatusUpdate) onStatusUpdate("Inteligência consolidada com sucesso.");
        console.log("Enriched Data from Edge:", data);

        return data;

    } catch (error) {
        console.error("Cascade Enrichment failed:", error);
        return null;
    }
};
