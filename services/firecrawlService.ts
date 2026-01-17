
interface FirecrawlScrapeResponse {
    success: boolean;
    data?: {
        content: string;
        metadata?: any;
    };
    error?: string;
}

const FIRECRAWL_API_KEY = (import.meta as any).env.VITE_FIRECRAWL_API_KEY;

export const scrapeDeepData = async (url: string): Promise<string | null> => {
    if (!FIRECRAWL_API_KEY) {
        console.warn('Firecrawl API Key not configured');
        return null;
    }

    // Helper to scrape a single URL
    const scrapeUrl = async (targetUrl: string): Promise<string> => {
        try {
            const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
                },
                body: JSON.stringify({
                    url: targetUrl,
                    formats: ['markdown'],
                    onlyMainContent: true
                })
            });

            if (!response.ok) {
                return '';
            }

            const json = await response.json();
            return json.data?.markdown || '';
        } catch (error) {
            console.error(`Error scraping ${targetUrl}:`, error);
            return '';
        }
    };

    try {
        // 1. Scrape Main Page
        console.log(`🔥 Firecrawl: Scraping Main Page ${url}...`);
        let mainContent = await scrapeUrl(url);

        // 2. Simple Heuristic to find "About" or "Team" links logic could be here, 
        // but for now we speculatively try common paths if the main content doesn't seem to have contacts.
        // Or we just aggressively scrape /quem-somos, /sobre, /equipe.

        // Normalize URL to remove trailing slash
        const baseUrl = url.replace(/\/$/, '');

        const subPaths = ['/quem-somos', '/sobre', '/equipe', '/contato'];
        let subContent = '';

        // Run parallel scrapes for subpaths (limit concurrency if needed, but 3-4 is fine)
        const subScrapes = await Promise.all(
            subPaths.map(path => scrapeUrl(`${baseUrl}${path}`))
        );

        subContent = subScrapes.join('\n\n -- SUBPAGE -- \n\n');

        return (mainContent + '\n\n' + subContent).trim();

    } catch (error) {
        console.error('Firecrawl Deep Scrape failed:', error);
        return null;
    }
};
