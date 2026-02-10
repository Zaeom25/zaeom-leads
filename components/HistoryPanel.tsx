
import React, { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { Icons } from './Icons';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lead } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface HistoryPanelProps {
    userId: string;
    onAddToCRM: (lead: Lead) => Promise<void>;
    profilesMap: Record<string, string>;
}

const SafeDateDisplay = ({ dateStr }: { dateStr: string }) => {
    try {
        if (!dateStr) return <>Data unavailable</>;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return <>Data inválida</>;
        return <>{formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}</>;
    } catch (e) {
        return <>-</>;
    }
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ userId, onAddToCRM, profilesMap }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [results, setResults] = useState<Lead[]>([]);
    const [loadingResults, setLoadingResults] = useState(false);

    // Delete Confirmation State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // Track added/adding leads state
    const [addedLeads, setAddedLeads] = useState<Set<number>>(new Set());
    const [addingLeads, setAddingLeads] = useState<Set<number>>(new Set());

    useEffect(() => {
        fetchHistory();
    }, [userId]);

    const fetchHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('user_search_history')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectHistory = async (item: any) => {
        setSelectedItem(item);
        setLoadingResults(true);
        try {
            const { data: cachedResults, error } = await supabase
                .from('search_cache')
                .select('json_results')
                .eq('query_key', item.query_key)
                .maybeSingle();

            if (error) throw error;
            if (cachedResults?.json_results) {
                // Mark leads as saved if they are already in CRM? 
                // For now we just load them. The parent's addToCRM handles duplicate checks.
                // Ideally we would want to know which are already saved. 
                // But for simplicity/performance in history, let's just let the user try.
                setResults(cachedResults.json_results as Lead[]);
            } else {
                setResults([]);
            }
        } catch (error) {
            console.error("Error loading results:", error);
            setResults([]);
        } finally {
            setLoadingResults(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setItemToDelete(id);
        setDeleteModalOpen(true);
    };

    const { success, error: toastError } = useToast();

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        // Optimistic update
        const itemToRemove = itemToDelete;

        try {
            const { error } = await supabase
                .from('user_search_history')
                .delete()
                .eq('id', itemToRemove);

            if (error) throw error;



            success('Item removido do histórico com sucesso.');

            setHistory(prev => prev.filter(h => h.id !== itemToRemove));

            if (selectedItem?.id === itemToRemove) {
                setSelectedItem(null);
                setResults([]);
            }
        } catch (error: any) {
            console.error('Error deleting history:', error);
            toastError('Não foi possível excluir o item. Tente novamente.');
            // Refetch to sync if error
            fetchHistory();
        } finally {
            setDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Icons.Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    // --- DETAIL VIEW ---
    if (selectedItem) {
        return (
            <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="flex items-center gap-6 mb-10">
                    <button
                        onClick={() => setSelectedItem(null)}
                        className="btn-icon !p-4"
                    >
                        <Icons.ArrowLeft className="transition-transform group-hover:-translate-x-1" size={24} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-text-primary capitalize flex items-center gap-3 tracking-tight">
                            {selectedItem.niche} <span className="text-text-secondary opacity-40 font-black">/</span> {selectedItem.location}
                        </h2>
                        <div className="flex items-center gap-3 mt-2 text-text-secondary font-bold uppercase tracking-widest text-[10px]">
                            <div className="flex items-center gap-1.5 opacity-60">
                                <Icons.Calendar size={14} className="text-primary" />
                                <SafeDateDisplay dateStr={selectedItem.created_at} />
                            </div>
                            <span className="opacity-20">•</span>
                            <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                                {results.length} Leads Encontrados
                            </span>
                        </div>
                    </div>
                </div>

                {loadingResults ? (
                    <div className="flex justify-center items-center h-64">
                        <Icons.Loader2 className="animate-spin text-primary" size={40} />
                    </div>
                ) : results.length === 0 ? (
                    <div className="text-center py-24 bg-background-card rounded-[2rem] border-2 border-dashed border-white/5">
                        <Icons.Archive className="mx-auto h-16 w-16 text-white/10 mb-6" />
                        <h3 className="text-xl font-black text-text-primary uppercase tracking-tight mb-2">Cache Expirado</h3>
                        <p className="text-text-secondary max-w-md mx-auto text-sm font-medium opacity-60">Os resultados detalhados desta busca não estão mais disponíveis no cache persistente.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {results.map((lead, i) => (
                            <div key={i} className="bg-background-card p-6 rounded-3xl shadow-sm border border-white/5 hover:border-primary/30 flex flex-col hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex justify-between items-start mb-3 relative z-10">
                                    <h4 className="font-black text-text-primary truncate mb-1 flex-1 pr-2 uppercase tracking-tight text-lg" title={lead.businessName}>{lead.businessName}</h4>
                                    {lead.rating && (
                                        <span className="flex items-center gap-1.5 text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20">
                                            <Icons.Star size={12} fill="currentColor" /> {lead.rating}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-text-secondary truncate flex items-center gap-2 mb-6 font-medium opacity-70 relative z-10">
                                    <Icons.MapPin size={14} className="shrink-0 text-primary/50" /> {lead.address}
                                </p>

                                <div className="mt-auto pt-6 border-t border-white/5 flex gap-3 relative z-10">
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (addedLeads.has(i) || addingLeads.has(i)) return;

                                            setAddingLeads(prev => new Set(prev).add(i));
                                            try {
                                                await onAddToCRM(lead);
                                                setAddedLeads(prev => new Set(prev).add(i));
                                            } catch (error) {
                                                console.error('Error adding to CRM:', error);
                                            } finally {
                                                setAddingLeads(prev => {
                                                    const next = new Set(prev);
                                                    next.delete(i);
                                                    return next;
                                                });
                                            }
                                        }}
                                        disabled={addedLeads.has(i) || addingLeads.has(i)}
                                        className={`flex-1 py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-wider ${addedLeads.has(i)
                                            ? 'bg-green-500/10 text-green-500 border border-green-500/20 cursor-default'
                                            : addingLeads.has(i)
                                                ? 'bg-white/5 text-text-secondary cursor-wait border border-white/10'
                                                : 'btn-primary group/add'
                                            }`}
                                    >
                                        {addingLeads.has(i) ? (
                                            <Icons.Loader2 size={14} className="animate-spin" />
                                        ) : addedLeads.has(i) ? (
                                            <>
                                                <Icons.Check size={14} strokeWidth={3} />
                                                <span>Adicionado</span>
                                            </>
                                        ) : (
                                            <>
                                                <Icons.Plus size={14} strokeWidth={3} className="group-hover/add:rotate-90 transition-transform duration-500" />
                                                <span>Adicionar</span>
                                            </>
                                        )}
                                    </button>
                                    <a
                                        href={lead.website || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`btn-icon !w-14 !h-14 !rounded-[1.25rem] ${!lead.website && 'opacity-20 cursor-not-allowed pointer-events-none'} `}
                                    >
                                        <Icons.Globe size={18} />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- LIST REVIEW ---
    return (
        <div className="w-full max-w-5xl mx-auto p-10 animate-in fade-in duration-500">
            <div className="mb-14 text-center md:text-left relative">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-[100px] -z-10" />
                <h1 className="text-4xl md:text-5xl font-black text-text-primary uppercase tracking-tight mb-4">
                    Histórico de Busca
                </h1>
                <p className="text-text-secondary text-lg font-medium opacity-60">
                    Recupere leads e informações de inteligência de buscas anteriores.
                </p>
            </div>

            <div className="grid gap-4">
                {history.length === 0 ? (
                    <div className="text-center py-24 bg-background-card rounded-[3rem] border-2 border-dashed border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-primary/[0.02]" />
                        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10">
                            <Icons.Search className="h-10 w-10 text-primary/30" strokeWidth={1} />
                        </div>
                        <h3 className="text-xl font-black text-text-primary uppercase tracking-tight mb-2">Nenhum histórico encontrado</h3>
                        <p className="text-text-secondary font-medium opacity-50">Sua jornada de prospecção começa na aba de busca inteligente.</p>
                    </div>
                ) : (
                    history.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleSelectHistory(item)}
                            className="bg-background-card p-6 md:p-8 rounded-[2rem] border border-white/5 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 cursor-pointer transition-all duration-500 group relative flex items-center justify-between overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-8 relative z-10">
                                <div className="w-16 h-16 bg-primary/10 text-primary border border-primary/20 rounded-[1.25rem] flex items-center justify-center shadow-lg group-hover:bg-primary group-hover:text-background-main transition-all duration-500 transform group-hover:-rotate-6">
                                    <Icons.Search size={28} strokeWidth={3} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black text-2xl text-text-primary capitalize mb-2 group-hover:text-primary transition-colors tracking-tight">
                                        {item.niche} <span className="text-white/10 font-thin mx-2">/</span> {item.location}
                                    </h3>
                                    <div className="flex items-center gap-5 text-[10px] font-black uppercase tracking-[0.2em]">
                                        <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-text-secondary">
                                            <Icons.Calendar size={14} className="text-primary/50" />
                                            <SafeDateDisplay dateStr={item.created_at} />
                                        </span>
                                        <span className="flex items-center gap-2 text-primary opacity-80">
                                            <Icons.Users size={14} />
                                            {item.result_count || 0} resultados
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 relative z-10">
                                <button
                                    onClick={(e) => handleDeleteClick(e, item.id)}
                                    className="btn-icon !text-red-400 hover:!text-red-500 !p-4 !rounded-2xl opacity-0 group-hover:opacity-100"
                                    title="Excluir histórico"
                                >
                                    <Icons.Trash2 size={20} />
                                </button>
                                <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-text-secondary group-hover:bg-primary group-hover:text-background-main group-hover:border-primary transition-all duration-500 shadow-sm group-hover:scale-110 group-hover:rotate-6">
                                    <Icons.ChevronRight size={24} strokeWidth={3} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Histórico"
                message="Tem certeza que deseja remover este item do seu histórico? O cache de pesquisa continuará salvo no sistema."
                confirmText="SIM, EXCLUIR"
                cancelText="CANCELAR"
            />
        </div>
    );
};
