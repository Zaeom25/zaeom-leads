import citiesData from '@/src/data/cities.json';

// Type mapping for the minified JSON
interface CityData {
    n: string; // nome
    s: string; // sigla (UF)
}

// Cast to typed array
const cities: CityData[] = citiesData as CityData[];

// Helper to remove accents
const normalizeStr = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const fetchMunicipios = async (query: string): Promise<string[]> => {
    if (query.length < 3) return [];

    const normalizedQuery = normalizeStr(query);

    // Filter local data (SUPER FAST)
    // Limit to 10 results for UI performance
    const results = cities
        .filter(c => normalizeStr(c.n).includes(normalizedQuery))
        .slice(0, 10);

    return results.map(c => `${c.n} - ${c.s}`);
};
