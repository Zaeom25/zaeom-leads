export interface Partner {
    nome_socio: string;
    qualificacao_socio: string;
}

export interface ReceitaData {
    razao_social: string;
    cnpj: string;
    qsa: Partner[];
}

export const fetchPartners = async (cnpj: string): Promise<string[]> => {
    try {
        const cleanCnpj = cnpj.replace(/\D/g, '');
        const response = await fetch(`https://minhareceita.org/${cleanCnpj}`);

        if (!response.ok) return [];

        const data: ReceitaData = await response.json();
        if (data && data.qsa) {
            return data.qsa.map(p => p.nome_socio);
        }

        return [];
    } catch (error) {
        console.error('Erro ao buscar sócios:', error);
        return [];
    }
};
