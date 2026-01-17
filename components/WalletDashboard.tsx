
import React, { useState, useMemo, useEffect } from 'react';
import { Lead, TagDefinition } from '../types';
import { Icons } from './Icons';
import { supabase } from '../lib/supabase';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { motion } from 'framer-motion';

export interface WalletDashboardProps {
    leads: Lead[];
    profilesMap?: Record<string, string>;
    isAdmin?: boolean;
    onLeadUpdate?: (lead: Lead) => void;
    tagDefinitions?: TagDefinition[];
    monthlyGoal?: number;
    onGoalUpdate?: (newGoal: number) => void;
}

export const WalletDashboard: React.FC<WalletDashboardProps> = ({
    leads,
    profilesMap = {},
    isAdmin = false,
    onLeadUpdate,
    tagDefinitions = [],
    monthlyGoal = 50000,
    onGoalUpdate
}) => {
    const [selectedMonth, setSelectedMonth] = useState<string>('current');
    const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<string>('');
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState(monthlyGoal.toString());

    // Sync tempGoal when monthlyGoal changes from props
    useEffect(() => {
        setTempGoal(monthlyGoal.toString());
    }, [monthlyGoal]);

    // 1. Filter: Only CLOSED leads are "Clients"
    const closedLeads = useMemo(() => leads.filter(l => l.status === 'CLOSED'), [leads]);

    // 2. Data for Charts
    // Group by Month for Area Chart
    const monthlyData = useMemo(() => {
        const data: Record<string, { name: string; value: number; count: number }> = {};

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const name = d.toLocaleDateString('pt-BR', { month: 'short' });
            data[key] = { name, value: 0, count: 0 };
        }

        closedLeads.forEach(lead => {
            if (lead.closedAt) {
                const d = new Date(lead.closedAt);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (data[key]) {
                    data[key].value += (lead.value || 0);
                    data[key].count += 1;
                }
            }
        });

        return Object.values(data);
    }, [closedLeads]);

    // Total Value
    const totalValue = useMemo(() => closedLeads.reduce((acc, cur) => acc + (cur.value || 0), 0), [closedLeads]);
    const averageTicket = closedLeads.length > 0 ? totalValue / closedLeads.length : 0;

    // Filter List Logic (Same as ClientList for consistency)
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

    const filteredLeads = useMemo(() => {
        let filtered = closedLeads;
        if (selectedMonth === 'all') return filtered;
        if (selectedMonth === 'current') {
            const now = new Date();
            const key = `${now.getFullYear()}-${now.getMonth()}`;
            return filtered.filter(l => l.closedAt && `${new Date(l.closedAt).getFullYear()}-${new Date(l.closedAt).getMonth()}` === key);
        }
        return filtered.filter(l => l.closedAt && `${new Date(l.closedAt).getFullYear()}-${new Date(l.closedAt).getMonth()}` === selectedMonth);
    }, [closedLeads, selectedMonth]);


    // Handlers
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

    const handleGoalSave = () => {
        const newVal = Number(tempGoal);
        if (!isNaN(newVal) && newVal > 0) {
            if (onGoalUpdate) onGoalUpdate(newVal);
        }
        setIsEditingGoal(false);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-background-main p-6 overflow-y-auto overflow-x-hidden selection:bg-primary/30">

            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl font-black text-text-primary flex items-center gap-3 uppercase tracking-[0.2em]">
                    <Icons.Briefcase className="text-primary" size={28} />
                    Minha Carteira
                </h1>
                <p className="text-[11px] font-black text-text-secondary mt-2 uppercase tracking-[0.2em] opacity-40">Dashboard financeiro e gestão de clientes.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Sales */}
                <div className="bg-background-card p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 flex flex-col relative overflow-hidden group backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Icons.BadgeCent size={72} className="text-primary" strokeWidth={1} />
                    </div>
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-3 opacity-50">Receita Total</span>
                    <span className="text-4xl font-black text-text-primary tracking-tight">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                    </span>
                    <div className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] text-primary bg-primary/5 w-fit px-3 py-1.5 rounded-xl border border-primary/20 shadow-lg shadow-primary/5">
                        <Icons.TrendingUp size={14} strokeWidth={3} /> +{closedLeads.length} Vendas
                    </div>
                </div>

                {/* Average Ticket */}
                <div className="bg-background-card p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 flex flex-col relative overflow-hidden group backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Icons.BarChart3 size={72} className="text-primary" strokeWidth={1} />
                    </div>
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-3 opacity-50">Ticket Médio</span>
                    <span className="text-4xl font-black text-text-primary tracking-tight">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(averageTicket)}
                    </span>
                    <div className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] text-primary bg-primary/5 w-fit px-3 py-1.5 rounded-xl border border-primary/20 shadow-lg shadow-primary/5">
                        <Icons.Activity size={14} strokeWidth={3} /> Performance
                    </div>
                </div>

                {/* Active Clients */}
                <div className="bg-background-card p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 flex flex-col relative overflow-hidden group backdrop-blur-xl">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Icons.Users size={72} className="text-primary" strokeWidth={1} />
                    </div>
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-3 opacity-50">Clientes Ativos</span>
                    <span className="text-4xl font-black text-text-primary tracking-tight">
                        {closedLeads.length}
                    </span>
                    <div className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] text-primary bg-primary/5 w-fit px-3 py-1.5 rounded-xl border border-primary/20 shadow-lg shadow-primary/5">
                        <Icons.Briefcase size={14} strokeWidth={3} /> Carteira
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 h-auto lg:h-80">
                <div className="lg:col-span-2 bg-background-card p-6 rounded-2xl shadow-sm border border-white/5">
                    <h3 className="text-sm font-bold text-text-primary mb-6 flex items-center gap-2">
                        <Icons.TrendingUp size={16} className="text-primary" />
                        Desempenho de Vendas (Últimos 6 Meses)
                    </h3>
                    <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#39F265" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#39F265" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff" opacity={0.05} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A1A1A1' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A1A1A1' }} tickFormatter={(value) => `R$ ${value / 1000}k`} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1A1A1A',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)'
                                    }}
                                    itemStyle={{ color: '#39F265' }}
                                    formatter={(value: number) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), 'Vendas']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#39F265" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-gradient-cta rounded-[2rem] p-8 text-background-main shadow-[0_20px_50px_rgba(57,242,101,0.2)] flex flex-col justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Icons.Zap size={120} strokeWidth={3} />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-2">Dica ZaeomLeads</h3>
                        <p className="opacity-80 text-xs font-bold leading-relaxed max-w-[200px]">Mantenha o valor dos seus contratos sempre atualizado para ter métricas precisas.</p>
                    </div>
                    <div className="bg-background-main/20 backdrop-blur-md rounded-3xl p-6 border border-white/20 relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-background-main/20 flex items-center justify-center border border-white/10">
                                <Icons.Target size={20} className="text-background-main" strokeWidth={3} />
                            </div>
                            <div className="cursor-pointer group/goal" onClick={() => setIsEditingGoal(true)}>
                                <span className="block text-[9px] font-black text-background-main/60 uppercase tracking-[0.2em] flex items-center gap-1 mb-1">
                                    Meta Mensal <Icons.Edit size={10} className="opacity-0 group-hover/goal:opacity-100 transition-opacity" strokeWidth={3} />
                                </span>
                                {isEditingGoal ? (
                                    <input
                                        type="number"
                                        value={tempGoal}
                                        onChange={e => setTempGoal(e.target.value)}
                                        onBlur={handleGoalSave}
                                        onKeyDown={e => e.key === 'Enter' && handleGoalSave()}
                                        className="bg-transparent border-b-2 border-background-main outline-none w-28 font-black text-background-main placeholder:text-background-main/30 text-lg"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="font-black text-lg tracking-tight">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyGoal)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="w-full bg-background-main/20 rounded-full h-2 overflow-hidden mb-3">
                            <div className="bg-background-main h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.3)]" style={{ width: `${Math.min((totalValue / monthlyGoal) * 100, 100)}%` }} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.1em] text-background-main">
                            <span>{Math.round((totalValue / monthlyGoal) * 100)}% Atingido</span>
                            <span className="opacity-60">{Math.round((totalValue / monthlyGoal) * 100) >= 100 ? 'CONCLUÍDO!' : 'EM ANDAMENTO'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Client List Table */}
            <div className="bg-background-card rounded-2xl shadow-sm border border-white/5 flex-1 flex flex-col overflow-hidden min-h-[400px]">
                {/* Table Filters Header */}
                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-text-primary flex items-center gap-2">
                        <Icons.List size={18} />
                        Lista de Clientes
                    </h3>
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="bg-white/5 border border-white/10 text-text-primary text-sm rounded-lg focus:ring-primary focus:border-primary block p-2 shadow-sm outline-none"
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

                <div className="overflow-auto flex-1">
                    {/* Desktop Table View */}
                    <table className="w-full text-left hidden md:table">
                        <thead className="bg-white/5 border-b border-white/10 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 text-xs font-bold text-text-secondary uppercase whitespace-nowrap">Cliente</th>
                                {isAdmin && <th className="p-4 text-xs font-bold text-text-secondary uppercase whitespace-nowrap">Responsável</th>}
                                <th className="p-4 text-xs font-bold text-text-secondary uppercase whitespace-nowrap">Contato</th>
                                <th className="p-4 text-xs font-bold text-text-secondary uppercase whitespace-nowrap hidden md:table-cell">Data Fechamento</th>
                                <th className="p-4 text-xs font-bold text-text-secondary uppercase whitespace-nowrap">Valor</th>
                                <th className="p-4 text-xs font-bold text-text-secondary uppercase whitespace-nowrap hidden md:table-cell">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-text-secondary">Nenhum cliente encontrado neste período.</td>
                                </tr>
                            ) : (
                                filteredLeads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-5 whitespace-nowrap">
                                            <div className="font-black text-text-primary uppercase tracking-wider text-[11px] mb-1">{lead.businessName}</div>
                                            <div className="text-[9px] text-text-secondary font-black uppercase tracking-[0.1em] opacity-40">{lead.category}</div>
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
                                        <td className="p-4 text-xs font-bold text-text-secondary hidden md:table-cell whitespace-nowrap">
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
                                                    className="w-24 border rounded p-1 bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600 shadow-sm focus:ring-2 focus:ring-emerald-500"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span
                                                    className="cursor-pointer hover:bg-white/5 px-3 py-1.5 rounded-xl transition-all font-black text-[13px] border border-transparent hover:border-primary/20"
                                                    onClick={() => {
                                                        setEditingLeadId(lead.id);
                                                        setEditingValue(lead.value?.toString() ?? '');
                                                    }}
                                                >
                                                    {lead.value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value) : 'R$ --'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
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

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-white/5">
                        {filteredLeads.length === 0 ? (
                            <div className="p-8 text-center text-text-secondary italic">Nenhum cliente encontrado neste período.</div>
                        ) : (
                            filteredLeads.map(lead => (
                                <div key={lead.id} className="p-4 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0 pr-4">
                                            <div className="font-bold text-text-primary truncate">{lead.businessName}</div>
                                            <div className="text-[10px] text-text-secondary uppercase font-black tracking-widest mt-0.5">{lead.category}</div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-sm font-bold text-primary">
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
                                                        className="w-20 border border-white/10 rounded-lg p-1 bg-white/5 text-xs text-text-primary outline-none focus:border-primary/50 shadow-sm"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span onClick={() => {
                                                        setEditingLeadId(lead.id);
                                                        setEditingValue(lead.value?.toString() ?? '');
                                                    }}>
                                                        {lead.value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value) : 'R$ --'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-text-secondary font-bold mt-1.5 px-2 py-0.5 bg-white/5 rounded-md border border-white/5 inline-block">
                                                {lead.closedAt ? new Date(lead.closedAt).toLocaleDateString('pt-BR') : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 text-xs font-bold text-text-secondary">
                                        {lead.email && (
                                            <div className="flex items-center gap-2 truncate p-2 bg-white/5 rounded-lg border border-white/5">
                                                <Icons.Mail size={12} className="text-text-secondary/50" />
                                                <span className="truncate">{lead.email}</span>
                                            </div>
                                        )}
                                        {lead.phoneNumber && (
                                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                                                <Icons.Phone size={12} className="text-text-secondary/50" />
                                                <span>{lead.phoneNumber}</span>
                                            </div>
                                        )}
                                    </div>

                                    {isAdmin && (
                                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[8px] font-black text-text-primary border border-white/10">
                                                    {lead.user_id && profilesMap[lead.user_id] ? profilesMap[lead.user_id].slice(0, 2).toUpperCase() : '?'}
                                                </div>
                                                <span className="text-[10px] font-black text-text-secondary uppercase tracking-tighter">Responsável</span>
                                            </div>
                                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 shadow-sm">
                                                Cliente
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
