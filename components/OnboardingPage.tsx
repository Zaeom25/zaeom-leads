import React, { useState } from 'react';
import { Icons } from './Icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export function OnboardingPage() {
    const { user, refreshProfile } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState<'free' | 'pro' | null>(null);

    const handleFreePlan = async () => {
        setLoading('free');
        try {
            if (!user) return;

            // Update profile
            const { error } = await supabase
                .from('profiles')
                .update({ onboarding_completed: true })
                .eq('id', user.id);

            if (error) throw error;

            await refreshProfile();
            // App.tsx will automatically redirect to dashboard due to state change
        } catch (error) {
            console.error('Error selecting free plan:', error);
            addToast('Erro ao selecionar plano.', 'error');
        } finally {
            setLoading(null);
        }
    };

    const handleProPlan = async () => {
        setLoading('pro');
        try {
            if (!user) return;

            // Create Checkout Session via Edge Function
            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    price_id: 'price_1SgtDe00ZRYkYo4m0nxddke1'
                },
            });

            if (error) throw error;

            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (error: any) {
            console.error('Error initiating checkout:', error);
            addToast('Erro ao iniciar assinatura: ' + error.message, 'error');
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-background-main flex flex-col items-center justify-center p-4 selection:bg-primary/30 selection:text-primary relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="max-w-4xl w-full text-center mb-16 animate-fade-in-up relative z-10">
                <div className="inline-flex items-center gap-3 mb-8 bg-white/5 p-2 pr-6 rounded-2xl border border-white/10 backdrop-blur-md">
                    <div className="w-10 h-10 bg-gradient-cta rounded-xl flex items-center justify-center text-background-main font-black shadow-lg shadow-primary/20">
                        <Icons.Sparkles size={18} strokeWidth={3} />
                    </div>
                    <span className="text-[14px] font-black text-text-primary uppercase tracking-[0.2em]">ZaeomLeads</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-text-primary mb-6 tracking-tight uppercase">
                    Escolha como entrar <br />no <span className="text-primary glow-text-primary">Próximo Nível</span>
                </h1>
                <p className="text-[12px] font-black text-text-secondary max-w-2xl mx-auto uppercase tracking-[0.2em] opacity-40">
                    Selecione o plano ideal para acelerar suas vendas. Você pode fazer upgrade ou cancelar a qualquer momento.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full">
                {/* PLANO GRATUITO */}
                <div className="bg-background-card rounded-[2.5rem] p-10 border border-white/5 flex flex-col hover:border-white/10 transition-all duration-500 animate-fade-in-right delay-75 backdrop-blur-xl group">
                    <div className="mb-8">
                        <span className="bg-white/5 text-text-secondary text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border border-white/10">
                            FREE START
                        </span>
                    </div>
                    <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-4 opacity-40">Plano Gratuito</h3>
                    <div className="flex items-baseline gap-2 mb-8">
                        <span className="text-5xl font-black text-text-primary tracking-tight">R$ 0</span>
                        <span className="text-text-secondary text-[10px] font-black uppercase tracking-widest opacity-30">/pra sempre</span>
                    </div>

                    <ul className="space-y-5 mb-10 flex-1">
                        {[
                            '5 Buscas mensais',
                            '3 Enriquecimentos com IA',
                            'CRM Kanban Básico',
                            'Acesso imediato'
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-4 text-text-secondary group-hover:text-text-primary transition-colors">
                                <Icons.CheckCircle2 size={18} strokeWidth={3} className="text-white/10 group-hover:text-primary/30 transition-colors" />
                                <span className="text-[11px] font-black uppercase tracking-[0.1em]">{item}</span>
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={handleFreePlan}
                        disabled={loading !== null}
                        className="w-full bg-white/5 hover:bg-white/10 text-text-primary font-black uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl transition-all border-2 border-transparent hover:border-white/10 disabled:opacity-30 disabled:pointer-events-none"
                    >
                        {loading === 'free' ? <Icons.Loader2 className="animate-spin mx-auto" size={18} strokeWidth={3} /> : 'COMEÇAR GRÁTIS'}
                    </button>
                </div>

                {/* PLANO PRO */}
                <div className="relative bg-background-card rounded-[2.5rem] p-10 border-2 border-primary/20 flex flex-col shadow-[0_20px_50px_rgba(57,242,101,0.15)] animate-fade-in-right delay-150 overflow-hidden backdrop-blur-xl group">
                    <div className="absolute top-0 right-0 bg-gradient-cta text-background-main text-[9px] font-black px-6 py-2 rounded-bl-[1.5rem] uppercase tracking-[0.2em] shadow-lg">
                        POPULAR
                    </div>

                    <div className="mb-8">
                        <span className="bg-primary/10 text-primary text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border border-primary/20 shadow-[0_0_15px_rgba(57,242,101,0.1)]">
                            PROFESSIONAL
                        </span>
                    </div>

                    <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-4 opacity-40">ZaeomLeads Starter</h3>
                    <div className="flex items-baseline gap-2 mb-8">
                        <span className="text-5xl font-black text-text-primary tracking-tight">R$ 47</span>
                        <span className="text-text-secondary text-[10px] font-black uppercase tracking-widest opacity-30">/mês</span>
                    </div>

                    <ul className="space-y-5 mb-10 flex-1">
                        {[
                            '50 Buscas mensais',
                            '50 Enriquecimentos Detetive (IA)',
                            'Prioridade no Suporte',
                            'Todas as features futuras'
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-4 text-text-primary font-bold">
                                <Icons.CheckCircle2 size={18} strokeWidth={3} className="text-primary shadow-[0_0_10px_rgba(57,242,101,0.5)]" />
                                <span className="text-[11px] font-black uppercase tracking-[0.1em]">{item}</span>
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={handleProPlan}
                        disabled={loading !== null}
                        className="w-full bg-gradient-cta text-background-main font-black uppercase tracking-[0.2em] text-[10px] py-5 rounded-2xl shadow-[0_15px_30px_rgba(57,242,101,0.2)] hover:shadow-primary/40 transform transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-30 disabled:translate-y-0"
                    >
                        {loading === 'pro' ? <Icons.Loader2 className="animate-spin mx-auto" size={18} strokeWidth={3} /> : 'ASSINAR AGORA'}
                    </button>

                    <p className="text-center text-[9px] text-text-secondary mt-6 uppercase tracking-[0.3em] font-black opacity-30 flex items-center justify-center gap-2">
                        <Icons.ShieldCheck size={12} /> 7 DIAS DE GARANTIA
                    </p>
                </div>
            </div>
        </div>
    );
}
