
import { Lead, LeadStatus } from '../types';
import { translateCategoryWithGroq } from './groqService';
import { checkCredits, deductCredit } from './creditService';
import { supabase } from '../lib/supabase';
import { getSerperKey } from './settingsService';

const categoryTranslations: Record<string, string> = {
    'Lawyer': 'Advogado',
    'Law firm': 'Escritório de Advocacia',
    'Legal services': 'Serviços Jurídicos',
    'Dentist': 'Dentista',
    'Dental clinic': 'Clínica Odontológica',
    'Doctor': 'Médico',
    'Medical clinic': 'Clínica Médica',
    'Real estate agency': 'Imobiliária',
    'Restaurant': 'Restaurante',
    'Beauty salon': 'Salão de Beleza',
    'Gym': 'Academia',
    'School': 'Escola',
    'Accounting firm': 'Escritório de Contabilidade',
    'Accountant': 'Contador',
    'Architect': 'Arquiteto',
    'Engineering consultant': 'Consultoria de Engenharia',
    'Car repair and maintenance': 'Oficina Mecânica',
    'Hotel': 'Hotel',
    'Pharmacy': 'Farmácia',
    'Supermarket': 'Supermercado'
};

function translateCategory(category: string | undefined): string {
    if (!category) return 'Negócio Local';
    return categoryTranslations[category] || category;
}

export interface SerperPlace {
    title: string;
    address: string;
    category: string;
    phoneNumber?: string;
    website?: string;
    rating?: number;
    ratingCount?: number;
    cid?: string;
    placeId: string;
}

// Helper to generate a unique key for the search
const getQueryKey = (niche: string, location: string, page: number) => {
    return `${niche.trim().toLowerCase()}:${location.trim().toLowerCase()}:${page}`;
};

export const searchLeadsSerper = async (
    niche: string,
    location: string,
    page: number = 1,
    existingPlaceIds: Set<string> = new Set()
): Promise<{ leads: Lead[], nextStartPage: number, stopReason: string }> => {
    const { data: { session } } = await supabase.auth.getSession();

    // STRICT CREDIT CHECK:
    const { hasCredits } = await checkCredits('search');
    if (!hasCredits) {
        throw new Error('INSUFFICIENT_CREDITS');
    }

    try {
        const { data, error } = await supabase.functions.invoke('search-leads-serper', {
            body: {
                niche,
                location,
                page,
                existingPlaceIds: Array.from(existingPlaceIds)
            }
        });

        if (error) throw error;

        // Deduct Credit (Same logic as before)
        await deductCredit('search');

        return {
            leads: data.leads,
            nextStartPage: data.nextStartPage,
            stopReason: data.stopReason || 'limit_reached'
        };
    } catch (err: any) {
        console.error('Error calling search-leads-serper function:', err);
        throw new Error(err.message || 'Erro ao buscar leads via Edge Function');
    }
};
