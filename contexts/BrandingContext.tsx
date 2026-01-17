import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface BrandingContextType {
    logoUrl: string | null;
    faviconUrl: string | null;
    siteName: string;
    siteDescription: string;
    refreshBranding: () => Promise<void>;
    loading: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
    const [siteName, setSiteName] = useState<string>('Zaeom Leads');
    const [siteDescription, setSiteDescription] = useState<string>('Sistema Inteligente de Gestão de Leads');
    const [loading, setLoading] = useState(true);

    const fetchBranding = async () => {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'branding')
                .maybeSingle();

            if (error) {
                console.error('Error fetching branding:', error);
            } else if (data?.value) {
                const branding = data.value as any;
                setLogoUrl(branding.logo_url || null);
                setFaviconUrl(branding.favicon_url || null);
                setSiteName(branding.site_name || 'Zaeom Leads');
                setSiteDescription(branding.site_description || 'Sistema Inteligente de Gestão de Leads');
            }
        } catch (error) {
            console.error('Error in fetchBranding:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranding();
    }, []);

    // Update document title and favicon
    useEffect(() => {
        if (siteName) {
            document.title = siteName;
        }

        // Update Meta Description
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.setAttribute('name', 'description');
            document.getElementsByTagName('head')[0].appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', siteDescription);

        if (faviconUrl) {
            let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = faviconUrl;
        }
    }, [faviconUrl, siteName, siteDescription]);

    const refreshBranding = async () => {
        await fetchBranding();
    };

    return (
        <BrandingContext.Provider value={{ logoUrl, faviconUrl, siteName, siteDescription, refreshBranding, loading }}>
            {children}
        </BrandingContext.Provider>
    );
};

export const useBranding = () => {
    const context = useContext(BrandingContext);
    if (context === undefined) {
        throw new Error('useBranding must be used within a BrandingProvider');
    }
    return context;
};
