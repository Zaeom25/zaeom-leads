import React, { useState } from 'react';
import { Icons } from './Icons';
import { formatPhone } from '../utils/phoneUtils';
import { Lead, LeadStatus } from '../types';
import { supabase } from '../lib/supabase';
import { fetchMunicipios } from '../services/locationService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useScrollLock } from '../hooks/useScrollLock';

interface NewLeadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onLeadAdded: (lead: Lead) => void;
    leadToEdit?: Lead | null;
    availableCategories?: string[];
}

export const NewLeadDialog: React.FC<NewLeadDialogProps> = ({ isOpen, onClose, onLeadAdded, leadToEdit, availableCategories = [] }) => {
    useScrollLock(isOpen);
    const { user, profile, role } = useAuth();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        businessName: '',
        category: '',
        phoneNumber: '',
        website: '',
        address: '',
        location: '',
        googleMapsUri: '',
        potentialOwner: '',
        source: 'manual' as const
    });

    const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
    const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    React.useEffect(() => {
        if (isOpen && leadToEdit) {
            setFormData({
                businessName: leadToEdit.businessName,
                category: leadToEdit.category,
                phoneNumber: leadToEdit.phoneNumber || '',
                website: leadToEdit.website || '',
                address: leadToEdit.address,
                location: leadToEdit.location || '',
                googleMapsUri: leadToEdit.googleMapsUri || '',
                potentialOwner: leadToEdit.potentialOwner || '',
                source: leadToEdit.source
            });
        } else if (isOpen && !leadToEdit) {
            // Reset for new lead
            setFormData({
                businessName: '',
                category: '',
                phoneNumber: '',
                website: '',
                address: '',
                location: '',
                googleMapsUri: '',
                potentialOwner: '',
                source: 'manual'
            });
        }
        setSuggestions([]);
        setShowSuggestions(false);
        setCategorySuggestions([]);
        setShowCategorySuggestions(false);
    }, [isOpen, leadToEdit]);

    if (!isOpen) return null;

    const handleLocationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData({ ...formData, location: value });

        if (value.length >= 3) {
            const cities = await fetchMunicipios(value);
            setSuggestions(cities);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const selectCity = (city: string) => {
        setFormData({ ...formData, location: city });
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData({ ...formData, category: value });

        if (value.length >= 1 && availableCategories) {
            const filtered = availableCategories.filter(c =>
                c.toLowerCase().includes(value.toLowerCase()) &&
                c.toLowerCase() !== value.toLowerCase()
            ).slice(0, 5);
            setCategorySuggestions(filtered);
            setShowCategorySuggestions(true);
        } else {
            setCategorySuggestions([]);
            setShowCategorySuggestions(false);
        }
    };

    const selectCategory = (cat: string) => {
        setFormData({ ...formData, category: cat });
        setCategorySuggestions([]);
        setShowCategorySuggestions(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const leadData = {
            businessName: formData.businessName,
            category: formData.category,
            phoneNumber: formData.phoneNumber,
            website: formData.website,
            address: formData.address,
            location: formData.location,
            googleMapsUri: formData.googleMapsUri.trim() || null,
            potentialOwner: formData.potentialOwner,
            source: formData.source,
        };

        try {
            if (leadToEdit) {
                const improvedLead = { ...leadToEdit, ...leadData };
                const { error } = await supabase
                    .from('leads')
                    .update(improvedLead)
                    .eq('id', leadToEdit.id);

                if (error) throw error;
                onLeadAdded(improvedLead);
                addToast('Lead atualizado com sucesso!', 'success');
            } else {
                if (!user) {
                    addToast('Erro: Usuário não autenticado', 'error');
                    return;
                }
                const newLead: Lead = {
                    id: crypto.randomUUID(),
                    ...leadData,
                    status: LeadStatus.NEW,
                    addedAt: Date.now(),
                    tags: [],
                    location: leadData.location || 'Manual Entry',
                    user_id: user.id,
                    organization_id: profile?.organization_id
                };

                const { error } = await supabase.from('leads').insert([newLead]);
                if (error) throw error;
                onLeadAdded(newLead);
                addToast('Lead criado com sucesso!', 'success');
            }

            onClose();
            setFormData({
                businessName: '',
                category: '',
                phoneNumber: '',
                website: '',
                address: '',
                location: '',
                googleMapsUri: '',
                potentialOwner: '',
                source: 'manual'
            });
        } catch (error: any) {
            console.error('Error saving lead:', error);
            addToast('Erro ao salvar lead. ' + (error.message || ''), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-main/80 backdrop-blur-md animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-background-card rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/10 flex flex-col relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-cta rounded-full opacity-50" />
                <div className="max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 sticky top-0 backdrop-blur-md z-10">
                        <h3 className="font-bold text-text-primary flex items-center gap-3 uppercase tracking-wider text-xs">
                            <span className="bg-gradient-cta text-background-main p-2 rounded-xl shadow-lg shadow-primary/20">
                                {leadToEdit ? <Icons.Edit size={16} /> : <Icons.Plus size={16} />}
                            </span>
                            {leadToEdit ? 'Editar Lead' : 'Novo Lead Manual'}
                        </h3>
                        <button onClick={onClose} className="btn-icon !w-10 !h-10">
                            <Icons.X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="group/input">
                            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Nome do Negócio *</label>
                            <input
                                required
                                type="text"
                                placeholder="Ex: Padaria do João"
                                className="w-full px-5 py-3 rounded-[1.25rem] border-2 border-white/5 bg-white/5 text-text-primary focus:border-primary/50 focus:bg-white/10 outline-none transition-all text-sm font-bold placeholder:text-text-secondary/30 shadow-inner"
                                value={formData.businessName}
                                onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                            />
                        </div>

                        <div className="relative group/input">
                            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Categoria / Nicho *</label>
                            <input
                                required
                                type="text"
                                placeholder="Ex: Padaria"
                                className="w-full px-5 py-3 rounded-[1.25rem] border-2 border-white/5 bg-white/5 text-text-primary focus:border-primary/50 focus:bg-white/10 outline-none transition-all text-sm font-bold placeholder:text-text-secondary/30 shadow-inner"
                                value={formData.category}
                                onChange={handleCategoryChange}
                                onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                                onFocus={() => formData.category && availableCategories.length > 0 && setShowCategorySuggestions(true)}
                            />
                            {showCategorySuggestions && categorySuggestions.length > 0 && (
                                <div className="absolute top-[calc(100%+0.5rem)] left-0 w-full bg-background-card border-2 border-white/10 rounded-2xl shadow-2xl z-20 max-h-48 overflow-y-auto custom-scrollbar backdrop-blur-md">
                                    {categorySuggestions.map((cat, index) => (
                                        <div
                                            key={index}
                                            className="px-5 py-3 hover:bg-primary/10 hover:text-primary text-text-primary cursor-pointer text-sm font-bold transition-all border-b border-white/5 last:border-0"
                                            onClick={() => selectCategory(cat)}
                                        >
                                            {cat}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Groups Location and Address */}
                        <div className="space-y-5 bg-white/5 p-5 rounded-[1.5rem] border-2 border-white/5 shadow-inner">
                            <div className="relative group/input">
                                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Cidade / Localização *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Digite para buscar..."
                                    className="w-full px-5 py-3 rounded-2xl border-2 border-white/5 bg-background-card/50 text-text-primary focus:border-primary/50 focus:bg-background-card outline-none transition-all text-sm font-bold placeholder:text-text-secondary/30 shadow-sm"
                                    value={formData.location}
                                    onChange={handleLocationChange}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    onFocus={() => formData.location && formData.location.length >= 3 && setShowSuggestions(true)}
                                />
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute top-[calc(100%+0.5rem)] left-0 w-full bg-background-card border-2 border-white/10 rounded-2xl shadow-2xl z-20 max-h-48 overflow-y-auto custom-scrollbar backdrop-blur-md">
                                        {suggestions.map((city, index) => (
                                            <div
                                                key={index}
                                                className="px-5 py-3 hover:bg-primary/10 hover:text-primary text-text-primary cursor-pointer text-sm font-bold transition-all border-b border-white/5 last:border-0"
                                                onClick={() => selectCity(city)}
                                            >
                                                {city}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="group/input">
                                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Endereço</label>
                                <input
                                    type="text"
                                    placeholder="Rua Exemplo, 123"
                                    className="w-full px-5 py-3 rounded-2xl border-2 border-white/5 bg-background-card/50 text-text-primary focus:border-primary/50 focus:bg-background-card outline-none transition-all text-sm font-bold placeholder:text-text-secondary/30 shadow-sm"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="group/input">
                            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Website</label>
                            <input
                                type="url"
                                placeholder="https://exemplo.com.br"
                                className="w-full px-5 py-3 rounded-[1.25rem] border-2 border-white/5 bg-white/5 text-text-primary focus:border-primary/50 focus:bg-white/10 outline-none transition-all text-sm font-bold placeholder:text-text-secondary/30 shadow-inner"
                                value={formData.website}
                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                            />
                        </div>

                        <div className="group/input">
                            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Link do Google Maps (GMB)</label>
                            <input
                                type="url"
                                placeholder="https://maps.google.com/..."
                                className="w-full px-5 py-3 rounded-[1.25rem] border-2 border-white/5 bg-white/5 text-text-primary focus:border-primary/50 focus:bg-white/10 outline-none transition-all text-sm font-bold placeholder:text-text-secondary/30 shadow-inner"
                                value={formData.googleMapsUri}
                                onChange={e => setFormData({ ...formData, googleMapsUri: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="group/input">
                                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Telefone</label>
                                <input
                                    type="text"
                                    placeholder="(00) 00000-0000"
                                    className="w-full px-5 py-3 rounded-[1.25rem] border-2 border-white/5 bg-white/5 text-text-primary focus:border-primary/50 focus:bg-white/10 outline-none transition-all text-sm font-bold placeholder:text-text-secondary/30 shadow-inner"
                                    value={formData.phoneNumber}
                                    onChange={e => setFormData({ ...formData, phoneNumber: formatPhone(e.target.value) })}
                                />
                            </div>
                            {role === 'admin' && (
                                <div className="group/input">
                                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1 opacity-70">Responsável</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: João Silva"
                                        className="w-full px-5 py-3 rounded-[1.25rem] border-2 border-white/5 bg-white/5 text-text-primary focus:border-primary/50 focus:bg-white/10 outline-none transition-all text-sm font-bold placeholder:text-text-secondary/30 shadow-inner"
                                        value={formData.potentialOwner}
                                        onChange={e => setFormData({ ...formData, potentialOwner: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="pt-8 flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 btn-secondary py-3 rounded-xl"
                            >
                                CANCELAR
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-[1.5] btn-primary py-3 rounded-xl group/save"
                            >
                                {isLoading ? <Icons.Loader2 className="animate-spin" size={18} strokeWidth={3} /> : (
                                    <>
                                        <span className="text-xs uppercase tracking-widest">{leadToEdit ? 'SALVAR ALTERAÇÕES' : 'ADICIONAR LEAD'}</span>
                                        <Icons.Plus size={16} strokeWidth={3} className="group-hover/save:rotate-90 transition-transform duration-500" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
