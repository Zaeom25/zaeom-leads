import React from 'react';
import { Icons } from './Icons';
import { supabase } from '../lib/supabase';

export function PricingPage() {
    const [loading, setLoading] = React.useState<string | null>(null);
    const [userStatus, setUserStatus] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('subscription_status')
                    .eq('id', user.id)
                    .single();
                setUserStatus(data?.subscription_status || 'free');
            }
        };
        fetchStatus();
    }, []);

    const isSubscribed = userStatus && userStatus !== 'free';

    const handleCheckout = async (priceId: string) => {
        setLoading(priceId);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                window.location.href = '/login';
                return;
            }

            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: { price_id: priceId },
            });

            if (error) throw error;

            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error('URL de checkout não recebida');
            }
        } catch (error: any) {
            console.error('Error:', error);
            alert('Erro ao iniciar checkout: ' + (error.message || 'Tente novamente mais tarde.'));
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

            <div className="max-w-4xl w-full text-center mb-20 relative z-10">
                <h1 className="text-4xl md:text-6xl font-black text-text-primary mb-8 uppercase tracking-[-0.02em] leading-tight">
                    Aumente sua <span className="text-primary glow-text-primary">Escala de Vendas</span>
                </h1>
                <p className="text-[14px] font-black text-text-secondary max-w-2xl mx-auto uppercase tracking-[0.2em] opacity-40">
                    Escolha o plano ideal para o seu momento ou adicione créditos sob demanda.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">
                {/* Starter Plan */}
                <div className="bg-background-card rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 relative flex flex-col backdrop-blur-xl group">
                    <div className="absolute top-0 right-0 p-8">
                        <span className="bg-primary text-background-main text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                            Recomendado
                        </span>
                    </div>

                    <div className="p-12 pb-8">
                        <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-6 opacity-40">
                            ZaeomLeads Starter
                        </h3>
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-6xl font-black text-text-primary tracking-tighter">R$ 47</span>
                            <span className="text-text-secondary font-black uppercase tracking-widest text-xs opacity-40">/mês</span>
                        </div>
                        <p className="text-text-secondary text-[13px] font-bold leading-relaxed opacity-70">
                            Ideal para quem busca prospecção profissional constante e organização total.
                        </p>
                    </div>

                    <div className="px-12 py-8 flex-1">
                        <ul className="space-y-5">
                            {[
                                { text: '50 Busca de Leads / mês', icon: <Icons.Search size={18} strokeWidth={3} /> },
                                { text: '50 Enriquecimentos de IA / mês', icon: <Icons.Sparkles size={18} strokeWidth={3} /> },
                                { text: 'CRM Kanban Ilimitado', icon: <Icons.Layout size={18} strokeWidth={3} /> },
                                { text: 'Exportação p/ Planilha', icon: <Icons.FileDown size={18} strokeWidth={3} /> },
                                { text: 'Suporte Prioritário', icon: <Icons.Heart size={18} strokeWidth={3} /> }
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-4 text-text-primary">
                                    <span className="text-primary">{item.icon}</span>
                                    <span className="text-[11px] font-black uppercase tracking-[0.1em]">{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-12 pt-8">
                        <button
                            onClick={() => handleCheckout('price_1SgtDe00ZRYkYo4m0nxddke1')}
                            disabled={!!loading}
                            className="w-full bg-gradient-cta text-background-main font-black uppercase tracking-[0.2em] text-[11px] py-6 rounded-[1.5rem] shadow-[0_15px_40px_rgba(57,242,101,0.2)] hover:shadow-primary/40 transform transition-all duration-300 hover:-translate-y-1 active:scale-95 disabled:opacity-30 disabled:translate-y-0 flex items-center justify-center gap-3 group"
                        >
                            {loading === 'price_1SgtDe00ZRYkYo4m0nxddke1' ? (
                                <Icons.Loader2 className="animate-spin" size={20} strokeWidth={3} />
                            ) : (
                                <>ASSINAR AGORA <Icons.ArrowRight size={18} strokeWidth={3} className="transition-transform group-hover:translate-x-2" /></>
                            )}
                        </button>
                    </div>
                </div>

                {/* Add-on Credits */}
                <div className="bg-white/5 rounded-[3rem] shadow-[0_10px_30px_rgba(0,0,0,0.1)] overflow-hidden border border-white/10 flex flex-col hover:bg-white/[0.08] transition-all duration-500 backdrop-blur-sm group">
                    <div className="p-12 pb-8">
                        <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-6 opacity-40">
                            Créditos Extra
                        </h3>
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-6xl font-black text-white tracking-tighter">R$ 20</span>
                            <span className="text-text-secondary font-black uppercase tracking-widest text-xs opacity-40">/único</span>
                        </div>
                        <p className="text-text-secondary text-[13px] font-bold leading-relaxed opacity-60">
                            Acabaram seus créditos? Adicione mais agora e continue sua prospecção.
                        </p>
                    </div>

                    <div className="px-12 py-8 flex-1">
                        <ul className="space-y-5">
                            {[
                                { text: '+50 Busca de Leads', icon: <Icons.Zap size={18} strokeWidth={3} /> },
                                { text: 'Sem expiração mensal', icon: <Icons.Clock size={18} strokeWidth={3} /> },
                                { text: 'Uso imediato', icon: <Icons.CheckCircle2 size={18} strokeWidth={3} /> },
                                { text: 'Acumulativo', icon: <Icons.PlusCircle size={18} strokeWidth={3} /> }
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-4 text-text-secondary">
                                    <span className="text-primary group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                                    <span className="text-[11px] font-black uppercase tracking-[0.1em]">{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-12 pt-8">
                        <button
                            onClick={() => handleCheckout('price_1SjBr600ZRYkYo4mDXq74El3')}
                            disabled={!!loading}
                            className="w-full bg-white/5 text-text-primary border-2 border-white/5 font-black uppercase tracking-[0.2em] text-[11px] py-6 rounded-[1.5rem] hover:bg-white/10 transform transition-all duration-300 hover:-translate-y-1 active:scale-95 disabled:opacity-30 disabled:translate-y-0 flex items-center justify-center gap-3 group"
                        >
                            {loading === 'price_1SjBr600ZRYkYo4mDXq74El3' ? (
                                <Icons.Loader2 className="animate-spin" size={20} strokeWidth={3} />
                            ) : (
                                <>COMPRAR CRÉDITOS <Icons.Zap size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Manage Section - Only show for subscribers/refunded */}
            <div className="mt-16 w-full flex flex-col items-center">
                <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/10 max-w-md mx-auto">
                    <Icons.ShieldCheck size={20} className="text-primary shrink-0" />
                    <p className="text-sm text-text-secondary text-left leading-tight">
                        {isSubscribed
                            ? "Pagamento seguro processado pelo Stripe. Seus dados estão protegidos."
                            : "Seus dados e pagamentos são protegidos com segurança de nível bancário pelo Stripe."
                        }
                    </p>
                </div>

                {isSubscribed && (
                    <button
                        onClick={handleManageSubscription}
                        disabled={!!loading}
                        className="mt-6 text-sm font-bold text-text-secondary hover:text-primary transition-colors flex items-center gap-2 mx-auto"
                    >
                        {loading === 'portal' ? (
                            <Icons.Loader2 className="animate-spin" />
                        ) : (
                            <>Já é assinante? Gerencie sua conta aqui <Icons.ExternalLink size={14} /></>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
