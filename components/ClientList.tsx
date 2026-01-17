import React, { useState, useMemo } from 'react';
import { Lead } from '../types';
import { Icons } from './Icons';
import { supabase } from '../lib/supabase';

export interface ClientListProps {
    leads: Lead[];
    profilesMap?: Record<string, string>; // ID -> Name/Initials
    isAdmin?: boolean;
    onLeadUpdate?: (lead: Lead) => void;
}

export const ClientList: React.FC<ClientListProps> = ({ leads, profilesMap = {}, isAdmin = false, onLeadUpdate }) => {
    const [selectedMonth, setSelectedMonth] = useState<string>('current');
    const [selectedOwner, setSelectedOwner] = useState<string>('all');
    const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<string>('');

    // Filter leads to only show CLOSED status
    const closedLeads = useMemo(() => leads.filter(l => l.status === 'CLOSED'), [leads]);

    // Generate available months for filter dropdown
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        const date = new Date();
        const currentMonthKey = `${date.getFullYear()}-${date.getMonth()}`;
        months.add(currentMonthKey);
        closedLeads.forEach(lead => {
            if (lead.closedAt) {
                const d = new Date(lead.closedAt);
                months.add(`${d.getFullYear()}-${d.getMonth()}`);
            }
        });
        return Array.from(months).sort().reverse().map(key => {
            const [year, month] = key.split('-');
            const d = new Date(parseInt(year), parseInt(month));
            return { value: key, label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
        });
    }, [closedLeads]);

    // Generate available owners for filter dropdown
    const availableOwners = useMemo(() => {
        const ownerIds = new Set<string>();
        closedLeads.forEach(l => { if (l.user_id) ownerIds.add(l.user_id); });
        return Array.from(ownerIds).map(id => ({ value: id, label: profilesMap[id] || 'Desconhecido' }));
    }, [closedLeads, profilesMap]);

    // Apply filters
    const filteredLeads = useMemo(() => {
        let filtered = closedLeads;
        if (selectedOwner !== 'all') {
            filtered = filtered.filter(l => l.user_id === selectedOwner);
        }
        if (selectedMonth === 'all') return filtered;
        if (selectedMonth === 'current') {
            const now = new Date();
            const key = `${now.getFullYear()}-${now.getMonth()}`;
            return filtered.filter(l => l.closedAt && `${new Date(l.closedAt).getFullYear()}-${new Date(l.closedAt).getMonth()}` === key);
        }
        return filtered.filter(l => l.closedAt && `${new Date(l.closedAt).getFullYear()}-${new Date(l.closedAt).getMonth()}` === selectedMonth);
    }, [closedLeads, selectedMonth, selectedOwner]);

    const totalValue = filteredLeads.reduce((acc, cur) => acc + (cur.value || 0), 0);

    const handleValueSave = async (leadId: string) => {
        const newVal = Number(editingValue);
        if (isNaN(newVal)) {
            setEditingLeadId(null);
            return;
        }
        const { error } = await supabase.from('leads').update({ value: newVal }).eq('id', leadId);
        if (error) {
            console.error('Error updating value:', error);
        } else {
            const updatedLead = leads.find(l => l.id === leadId);
            if (updatedLead && onLeadUpdate) {
                onLeadUpdate({ ...updatedLead, value: newVal });
            }
        }
        setEditingLeadId(null);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-background-main p-6 overflow-hidden selection:bg-primary/30">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Icons.Briefcase className="text-primary" />
                        Minha Carteira
                    </h1>
                    <p className="text-text-secondary mt-1">Gerencie seus clientes ativos e vendas fechadas.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex flex-col items-end">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Total em Vendas</span>
                        <span className="text-xl font-black text-text-primary">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                        </span>
                    </div>
                    {isAdmin && (
                        <select
                            value={selectedOwner}
                            onChange={e => setSelectedOwner(e.target.value)}
                            className="bg-white/5 border border-white/10 text-text-primary text-sm rounded-xl focus:ring-primary focus:border-primary block p-2.5 shadow-sm min-w-[150px] outline-none"
                        >
                            <option value="all" className="bg-background-card">Todos Vendedores</option>
                            {availableOwners.map(owner => (
                                <option key={owner.value} value={owner.value} className="bg-background-card">{owner.label}</option>
                            ))}
                        </select>
                    )}
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="bg-white/5 border border-white/10 text-text-primary text-sm rounded-xl focus:ring-primary focus:border-primary block p-2.5 shadow-sm min-w-[180px] outline-none"
                    >
                        <option value="current" className="bg-background-card">Mês Atual</option>
                        <option value="all" className="bg-background-card">Todo o Período</option>
                        <optgroup label="Histórico" className="bg-background-card">
                            {availableMonths.map(m => (
                                <option key={m.value} value={m.value} className="bg-background-card">{m.label}</option>
                            ))}
                        </optgroup>
                    </select>
                </div>
            </div>
            <div className="bg-background-card rounded-2xl shadow-sm border border-white/10 flex-1 flex flex-col overflow-hidden">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/10 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Cliente</th>
                                {isAdmin && <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Responsável</th>}
                                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Contato</th>
                                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Data Fechamento</th>
                                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Valor</th>
                                <th className="p-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-text-secondary italic">Nenhum cliente encontrado neste período.</td>
                                </tr>
                            ) : (
                                filteredLeads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="font-bold text-text-primary">{lead.businessName}</div>
                                            <div className="text-[10px] text-text-secondary uppercase font-black tracking-widest mt-0.5">{lead.category}</div>
                                        </td>
                                        {isAdmin && (
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-text-primary border border-white/10 shadow-sm" title={lead.user_id ? profilesMap[lead.user_id] : 'Desconhecido'}>
                                                        {lead.user_id && profilesMap[lead.user_id] ? profilesMap[lead.user_id].slice(0, 2).toUpperCase() : '?'}
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                                                {lead.email && <Icons.Mail size={12} />}
                                                <span>{lead.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-text-secondary mt-1">
                                                {lead.phoneNumber && <Icons.Phone size={12} />}
                                                <span>{lead.phoneNumber}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs font-bold text-text-secondary whitespace-nowrap">
                                            {lead.closedAt ? new Date(lead.closedAt).toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-primary">
                                            {editingLeadId === lead.id ? (
                                                <input
                                                    type="number"
                                                    value={editingValue}
                                                    onChange={e => setEditingValue(e.target.value)}
                                                    onBlur={() => handleValueSave(lead.id)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleValueSave(lead.id);
                                                        if (e.key === 'Escape') setEditingLeadId(null);
                                                    }}
                                                    className="w-24 border rounded p-1 bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span
                                                    className="cursor-pointer underline decoration-emerald-300 decoration-dashed underline-offset-4 hover:text-emerald-700 dark:hover:text-emerald-300"
                                                    onClick={() => {
                                                        setEditingLeadId(lead.id);
                                                        setEditingValue(lead.value?.toString() ?? '');
                                                    }}
                                                >
                                                    {lead.value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value) : 'Definir Valor'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 shadow-sm whitespace-nowrap">
                                                <Icons.CheckCircle2 size={12} className="mr-1.5" />
                                                Cliente
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
