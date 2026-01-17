
import { supabase } from '../lib/supabase';

export const checkCredits = async (type: 'search' | 'enrich'): Promise<{ hasCredits: boolean, credits: number, organizationId?: string }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { hasCredits: false, credits: 0 };

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) return { hasCredits: false, credits: 0 };

        const column = type === 'search' ? 'search_credits' : 'enrich_credits';

        const { data: org, error } = await supabase
            .from('organizations')
            .select(column)
            .eq('id', profile.organization_id)
            .single();

        if (error || !org) {
            console.error('Error checking credits:', error);
            return { hasCredits: false, credits: 0 };
        }

        const credits = (org as any)[column] as number;
        return { hasCredits: credits > 0, credits, organizationId: profile.organization_id };

    } catch (error) {
        console.error('Credit check failed:', error);
        return { hasCredits: false, credits: 0 };
    }
};

export const getCredits = async (): Promise<{ search: number, enrich: number, status: string, monthly_goal: number, organizationId?: string }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { search: 0, enrich: 0, status: 'free', monthly_goal: 50000 };

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, subscription_status')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) return { search: 0, enrich: 0, status: 'free', monthly_goal: 50000 };

        const { data: org, error } = await supabase
            .from('organizations')
            .select('search_credits, enrich_credits, subscription_status, monthly_goal')
            .eq('id', profile.organization_id)
            .single();

        if (error || !org) {
            return { search: 0, enrich: 0, status: profile.subscription_status || 'free', monthly_goal: 50000, organizationId: profile.organization_id };
        }

        return {
            search: org.search_credits,
            enrich: org.enrich_credits,
            status: org.subscription_status || 'free',
            monthly_goal: org.monthly_goal || 50000,
            organizationId: profile.organization_id
        };

    } catch (error) {
        console.error('Get credits failed:', error);
        return { search: 0, enrich: 0, status: 'free', monthly_goal: 50000 };
    }
};

export const deductCredit = async (type: 'search' | 'enrich'): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        // Use RPC for atomic deduction and verification
        const { data: success, error } = await supabase.rpc('deduct_credit', {
            user_id_p: user.id,
            amount_p: 1,
            type_p: type
        });

        if (error) {
            console.error(`Error deducting ${type} credit:`, error);
            return false;
        }

        return !!success;
    } catch (error) {
        console.error('Deduct credit failed:', error);
        return false;
    }
};
