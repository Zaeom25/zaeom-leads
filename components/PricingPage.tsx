import React, { useState } from 'react';
import { Icons } from './Icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

interface PlanFeature {
    text: string;
    icon: React.ReactNode;
}

interface Plan {
    id: string;
    name: string;
    description: string;
    features: PlanFeature[];
    highlight: boolean;
    buttonText: string;
    price: {
        monthly: number;
        quarterly: number;
        yearly: number;
    };
    priceIds: {
        monthly: string | null;
        quarterly: string | null;
        yearly: string | null;
    };
}

const PLANS: Plan[] = [
    {
        id: 'trial',
        name: 'Plano Teste Gratuito',
        description: 'Prova de autoridade: teste o poder da nossa IA sem compromisso.',
        highlight: false,
        buttonText: 'INICIAR TESTE',
        price: { monthly: 0, quarterly: 0, yearly: 0 },
        priceIds: { monthly: null, quarterly: null, yearly: null },
        features: [
            { text: '05 Buscas de Leads', icon: <Icons.Search size={18} strokeWidth={3} /> },
            { text: '05 Enriquecimentos', icon: <Icons.Sparkles size={18} strokeWidth={3} /> },
            { text: 'Visualização completa', icon: <Icons.Eye size={18} strokeWidth={3} /> },
            { text: 'Sem exportação', icon: <Icons.XCircle size={18} strokeWidth={3} /> },
            { text: 'Duração: 7 dias', icon: <Icons.Clock size={18} strokeWidth={3} /> },
        ]
    },
    {
        id: 'basic',
        name: 'Plano Básico',
        description: 'Para autônomos premium, consultores e prestadores B2B.',
        highlight: false,
        buttonText: 'ASSINAR BÁSICO',
        price: { monthly: 297, quarterly: 807, yearly: 2748 },
        priceIds: {
            monthly: 'price_1SzMG6PMpeR5cfVrt8QKvx3I',
            quarterly: 'price_1SzMGlPMpeR5cfVrBSTFrbmD',
            yearly: 'price_1SzMHVPMpeR5cfVrQssImHWQ'
        },
        features: [
            { text: '150 Buscas de Leads / mês', icon: <Icons.Search size={18} strokeWidth={3} /> },
            { text: '150 Enriquecimentos / mês', icon: <Icons.Sparkles size={18} strokeWidth={3} /> },
            { text: 'Exportação CSV', icon: <Icons.FileDown size={18} strokeWidth={3} /> },
            { text: 'Histórico de Leads', icon: <Icons.History size={18} strokeWidth={3} /> },
            { text: 'Suporte Padrão', icon: <Icons.Heart size={18} strokeWidth={3} /> }
        ]
    },
    {
        id: 'pro',
        name: 'Plano Profissional',
        description: 'Para agências, SDRs e times comerciais que precisam de escala.',
        highlight: true,
        buttonText: 'ASSINAR PRO',
        price: { monthly: 597, quarterly: 1617, yearly: 5388 },
        priceIds: {
            monthly: 'price_1SzMIbPMpeR5cfVrIDfZM2Bl',
            quarterly: 'price_1SzMJ5PMpeR5cfVrrR3Sshqw',
            yearly: 'price_1SzMJnPMpeR5cfVrjnDl6y5Y'
        },
        features: [
            { text: '400 Buscas de Leads / mês', icon: <Icons.Search size={18} strokeWidth={3} /> },
            { text: '400 Enriquecimentos / mês', icon: <Icons.Sparkles size={18} strokeWidth={3} /> },
            { text: 'Exportação Ilimitada', icon: <Icons.FileDown size={18} strokeWidth={3} /> },
            { text: 'Tags e Organização', icon: <Icons.Tag size={18} strokeWidth={3} /> },
            { text: 'Suporte Prioritário', icon: <Icons.Heart size={18} strokeWidth={3} /> },
            { text: 'Reprocessamento de Leads', icon: <Icons.RefreshCw size={18} strokeWidth={3} /> }
        ]
    },
    {
        id: 'enterprise',
        name: 'Plano Enterprise / Scale',
        description: 'Volume, confiança, integração e status para grandes times.',
        highlight: false,
        buttonText: 'ASSINAR SCALE',
        price: { monthly: 900, quarterly: 2430, yearly: 9600 },
        priceIds: {
            monthly: 'price_1SzMNDPMpeR5cfVroAJzRdnr',
            quarterly: 'price_1SzMNuPMpeR5cfVrYBezxNT5',
            yearly: 'price_1SzMORPMpeR5cfVr65uI4xHV'
        },
        features: [
            { text: '1.000 Buscas de Leads / mês', icon: <Icons.Search size={18} strokeWidth={3} /> },
            { text: '1.000 Enriquecimentos / mês', icon: <Icons.Sparkles size={18} strokeWidth={3} /> },
            { text: 'Múltiplos Usuários', icon: <Icons.Users size={18} strokeWidth={3} /> },
            { text: 'Integrações (CRM)', icon: <Icons.Webhook size={18} strokeWidth={3} /> },
            { text: 'Relatórios Avançados', icon: <Icons.BarChart size={18} strokeWidth={3} /> },
            { text: 'Suporte Premium / Onboarding', icon: <Icons.Crown size={18} strokeWidth={3} /> }
        ]
    }
];

export function PricingPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const { session, profile, user } = useAuth();
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

    const userStatus = profile?.subscription_status;
    const isSubscribed = userStatus && userStatus !== 'free' && userStatus !== 'trial';

    const isCurrentPlan = (planId: string) => {
        if (!userStatus && planId === 'trial') return true; // Default to trial/free
        if (planId === 'trial' && userStatus === 'free') return true;
        return userStatus === planId;
    };

    const getDisplayPrice = (plan: Plan) => {
        if (plan.id === 'trial') return 'R$ 0';
        const total = plan.price[billingCycle];
        if (billingCycle === 'monthly') return `R$ ${total}`;
        const monthlyEquivalent = Math.round(total / (billingCycle === 'quarterly' ? 3 : 12));
        return `R$ ${monthlyEquivalent}`;
    };

    const getDisplayPeriod = () => {
        return '/mês';
    };

    const getBilledText = (plan: Plan) => {
        if (plan.id === 'trial') return '7 dias grátis';
        if (billingCycle === 'monthly') return 'Cobrado mensalmente';
        if (billingCycle === 'quarterly') return `Cobrado R$ ${plan.price.quarterly} a cada 3 meses`;
        if (billingCycle === 'yearly') return `Cobrado R$ ${plan.price.yearly} anualmente`;
        return '';
    };

    const handleCheckout = async (plan: Plan) => {
        try {
            if (!user) {
                window.location.href = '/register';
                return;
            }

            if (plan.id === 'trial') {
                window.location.href = '/register';
                return;
            }

            const priceId = plan.priceIds[billingCycle];

            if (!priceId) {
                alert('Ciclo de faturamento indisponível para este plano.');
                return;
            }

            setLoading(plan.id);

            // Removing the forced portal redirect to allow Upgrade/Downgrade/Cycle Switch via Checkout
            // Existing subscriptions will be handled by the webhook (canceling old ones)

            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: { price_id: priceId },
                headers: {
                    Authorization: `Bearer ${session?.access_token}`
                }
            });

            if (error) {
                console.error('Erro na requisição:', error);
                throw error;
            }

            // Tratamento de erro retornado pela função (mesmo com status 200)
            if (data?.error) {
                throw new Error(data.error);
            }

            if (!data?.url) {
                throw new Error('URL de checkout não retornada pela função.');
            }

            window.location.href = data.url;
        } catch (error: any) {
            console.error('Erro no checkout:', error);
            const msg = error.message || 'Erro desconhecido';
            const status = error.status ? ` (Status: ${error.status})` : '';
            // Evita alertar o erro genérico se temos um específico
            alert(`Erro: ${msg}${status}`);
        } finally {
            setLoading(null);
        }
    };

    const handleManageSubscription = async () => {
        setLoading('portal');
        try {
            const { data, error } = await supabase.functions.invoke('create-portal-session');
            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (error: any) {
            console.error('Error opening portal:', error);
            alert("Erro ao abrir portal de gerenciamento. Verifique se você já possui uma assinatura ativa.");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-background-main flex flex-col items-center py-20 px-4 animate-fade-in relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="max-w-4xl w-full text-center mb-12 relative z-10">
                <h1 className="text-4xl md:text-6xl font-black text-text-primary mb-8 uppercase tracking-[-0.02em] leading-tight">
                    Escolha sua <span className="text-primary glow-text-primary">Escala de Vendas</span>
                </h1>
                <p className="text-[14px] font-black text-text-secondary max-w-2xl mx-auto uppercase tracking-[0.2em] opacity-40 mb-8">
                    Planos flexíveis para cada estágio do seu negócio.
                </p>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center gap-2 p-1 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 w-fit mx-auto">
                    {(['monthly', 'quarterly', 'yearly'] as const).map((cycle) => (
                        <button
                            key={cycle}
                            onClick={() => setBillingCycle(cycle)}
                            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${billingCycle === cycle
                                ? 'bg-primary text-background-main shadow-lg shadow-primary/20'
                                : 'text-text-secondary hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {cycle === 'monthly' ? 'Mensal' : cycle === 'quarterly' ? 'Trimestral' : 'Anual'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1400px] w-full mb-20">
                {PLANS.map((plan) => (
                    <div
                        key={plan.id}
                        className={`bg-background-card rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border ${plan.highlight ? 'border-primary/50 ring-2 ring-primary/20' : 'border-white/10'} relative flex flex-col backdrop-blur-xl group transition-all duration-300 hover:scale-[1.02]`}
                    >
                        {plan.highlight && (
                            <div className="absolute top-0 right-0 p-6">
                                <span className="bg-primary text-background-main text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                                    RECOMENDADO
                                </span>
                            </div>
                        )}

                        <div className="p-8 pb-6">
                            <h3 className={`text-[10px] font-black ${plan.highlight ? 'text-primary' : 'text-text-secondary'} uppercase tracking-[0.2em] mb-4 opacity-60`}>
                                {plan.name}
                            </h3>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-3xl font-black text-text-primary tracking-tighter">
                                    {getDisplayPrice(plan)}
                                </span>
                                <span className="text-text-secondary font-black uppercase tracking-widest text-[10px] opacity-40">
                                    {getDisplayPeriod()}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-text-secondary opacity-40 uppercase tracking-wider mb-4">
                                {getBilledText(plan)}
                            </p>
                            <p className="text-text-secondary text-[12px] font-bold leading-relaxed opacity-70 min-h-[3rem]">
                                {plan.description}
                            </p>
                        </div>

                        <div className="px-8 py-4 flex-1">
                            <ul className="space-y-4">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-text-primary">
                                        <span className={plan.highlight ? 'text-primary' : 'text-primary/70'}>{feature.icon}</span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">{feature.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="p-8 pt-4">
                            <button
                                onClick={() => handleCheckout(plan)}
                                disabled={!!loading}
                                className={`w-full ${plan.highlight ? 'bg-gradient-cta shadow-[0_15px_40px_rgba(57,242,101,0.2)] hover:shadow-primary/40' : isCurrentPlan(plan.id) ? 'bg-white/10 opacity-80 hover:bg-white/20' : 'bg-white/5 border border-white/10 hover:bg-white/10'} text-background-main font-black uppercase tracking-[0.15em] text-[10px] py-5 rounded-[1.2rem] transform transition-all duration-300 ${!isCurrentPlan(plan.id) ? 'hover:-translate-y-1 active:scale-95' : ''} disabled:opacity-30 flex items-center justify-center gap-3 group`}
                            >
                                {loading === plan.id ? (
                                    <Icons.Loader2 className="animate-spin" size={18} strokeWidth={3} />
                                ) : (
                                    <span className={plan.highlight ? 'text-background-main' : 'text-text-primary'}>
                                        {isCurrentPlan(plan.id) ? 'MUDAR CICLO / RENOVAR' : plan.buttonText}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-16 w-full flex flex-col items-center">
                <div className="flex items-center gap-3 bg-white/5 px-8 py-4 rounded-2xl border border-white/10 max-w-md mx-auto">
                    <Icons.ShieldCheck size={20} className="text-primary shrink-0" />
                    <p className="text-[11px] font-bold text-text-secondary text-left leading-tight uppercase tracking-wider opacity-60">
                        Pagamentos processados com segurança criptografada pelo Stripe.
                    </p>
                </div>

                {isSubscribed && (
                    <button
                        onClick={handleManageSubscription}
                        disabled={!!loading}
                        className="mt-8 text-[11px] font-black text-text-secondary hover:text-primary transition-colors flex items-center gap-2 mx-auto uppercase tracking-widest opacity-40 hover:opacity-100"
                    >
                        {loading === 'portal' ? (
                            <Icons.Loader2 className="animate-spin" />
                        ) : (
                            <>Gerenciar Assinatura Atual <Icons.ExternalLink size={14} /></>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
