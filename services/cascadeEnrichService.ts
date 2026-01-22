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
            console.error("❌ Edge Function Error Details:", error);
            // Check if it's a known error from the function response
            if (error.message) throw new Error(error.message);
            throw error;
        }

        if (onStatusUpdate) onStatusUpdate("Inteligência consolidada com sucesso.");
        console.log("✅ Enriched Data from Edge:", data);

        return data;

    } catch (error: any) {
        console.error("🛑 Cascade Enrichment failed:", error);
        // Toast will handle the display, but we log the full error here
        throw error;
    }
};
