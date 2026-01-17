const TAVILY_API_KEY = (import.meta as any).env.VITE_TAVILY_API_KEY;
const TAVILY_ENDPOINT = 'https://api.tavily.com/search';

interface TavilyResult {
    title: string;
    content: string;
    url: string;
}

interface TavilyResponse {
    results: TavilyResult[];
}

export const searchWebData = async (query: string): Promise<string> => {
    if (!TAVILY_API_KEY) {
        console.warn("Tavily API Key missing, skipping web search.");
        return "";
    }

    try {
        const response = await fetch(TAVILY_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: TAVILY_API_KEY,
                query: query,
                search_depth: "basic",
                max_results: 5,
                include_domains: [],
                exclude_domains: []
            }),
        });

        if (!response.ok) {
            console.error(`Tavily API error: ${response.status} ${response.statusText}`);
            return "";
        }

        const data: TavilyResponse = await response.json();

        if (!data.results || data.results.length === 0) {
            return "Nenhum resultado encontrado na web.";
        }

        const formattedResults = data.results.map(result => `
Título: ${result.title}
URL: ${result.url}
Conteúdo: ${result.content}
-------------------
    `).join("\n");

        return formattedResults;

    } catch (error) {
        console.error("Error fetching data from Tavily:", error);
        return "";
    }
};
