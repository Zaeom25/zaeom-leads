export const DEFAULT_TAGS = [
    'Quente', 'Morno', 'Frio',
    'Urgente', 'Retorno Agendado',
    'WhatsApp', 'Instagram', 'Indicação',
    'Cliente Antigo', 'Potencial',
    'Sem Interesse', 'Caixa Postal'
];

export const TAG_COLORS = [
    { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
    { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
    { bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/20' },
    { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
    { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
    { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
    { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20' },
    { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
    { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
];

export const getColorForString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % TAG_COLORS.length;
    return TAG_COLORS[index];
};
