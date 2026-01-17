import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';
import { supabase } from '../lib/supabase';
import { useScrollLock } from '../hooks/useScrollLock';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void;
    type: 'search' | 'enrich';
    reason?: 'depleted' | 'user_action';
    currentPlan?: 'free' | 'starter' | 'pro';
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, type, reason = 'depleted', currentPlan = 'free' }) => {
    useScrollLock(isOpen);
    const [loading, setLoading] = React.useState(false);

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            let priceId = 'price_1SgtDe00ZRYkYo4m0nxddke1'; // Default Starter (R$ 47)
            if (currentPlan === 'starter' && reason === 'depleted') {
                priceId = 'price_1SjBr600ZRYkYo4mDXq74El3';
            }

            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: { price_id: priceId },
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (error: any) {
            console.error('Upgrade error:', error);
            alert('Erro ao iniciar upgrade: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-portal-session');
            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (error: any) {
            console.error('Portal error:', error);
            alert('Erro ao abrir portal: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getContent = () => {
        if (currentPlan === 'starter' && reason === 'depleted') {
            return {
                title: 'Créditos Esgotados',
                description: 'Você atingiu seu limite mensal do Plano Starter.',
                offer: 'Adicione +50 créditos agora por apenas R$ 20',
                buttonText: 'Comprar 50 Créditos',
                icon: <Icons.Zap size={32} className="text-primary" />
            };
        }

        if (reason === 'user_action') {
            return {
                title: 'Potencialize seus Resultados',
                description: 'Desbloqueie todo o poder da inteligência artificial.',
                offer: 'Assine o Plano Starter por R$ 47 e libere 50/50 créditos mensais.',
                buttonText: 'Fazer Upgrade para Starter',
                icon: <Icons.Rocket size={32} className="text-primary" />
            };
        }

        return {
            title: `Seus créditos de ${type === 'search' ? 'Busca' : 'IA'} acabaram!`,
            description: 'Você atingiu o limite do seu plano atual.',
            offer: 'Assine o Plano Starter por R$ 47 para liberar 50/50 créditos mensais.',
            buttonText: 'Liberar Créditos Agora',
            icon: <Icons.Lock size={32} className="text-primary" />
        };
    };

    const content = getContent();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background-main/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-background-card rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden"
                    >
                        {/* Header Design */}
                        <div className="h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #39F265 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-cta rounded-full opacity-50" />
                        </div>

                        <div className="max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <div className="px-8 pb-10 -mt-10 relative">
                                {/* Icon Circle */}
                                <div className="w-24 h-24 bg-background-card rounded-[2rem] shadow-2xl flex items-center justify-center mb-8 mx-auto border-2 border-white/10 ring-8 ring-white/5 relative group-hover:scale-110 transition-transform duration-500">
                                    <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-xl opacity-50" />
                                    <div className="relative z-10 transition-transform duration-500 hover:rotate-12">
                                        {content.icon}
                                    </div>
                                </div>

                                <div className="text-center max-w-sm mx-auto">
                                    <h3 className="text-3xl font-black text-text-primary mb-4 tracking-tight leading-tight">
                                        {content.title}
                                    </h3>
                                    <p className="text-text-secondary mb-10 leading-relaxed font-medium">
                                        {content.description}
                                        <span className="block mt-4 font-black text-primary p-3 bg-primary/10 rounded-2xl border-2 border-primary/10 uppercase text-xs tracking-[0.1em]">
                                            {content.offer}
                                        </span>
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={loading}
                                        className="w-full btn-primary py-5 rounded-2xl group"
                                    >
                                        {loading ? (
                                            <Icons.Loader2 className="animate-spin" />
                                        ) : (
                                            <>
                                                <span>Subir de Plano</span>
                                                <Icons.ArrowRight size={18} className="transition-transform group-hover:translate-x-1" strokeWidth={3} />
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-full btn-secondary py-4 rounded-xl"
                                    >
                                        Agora não
                                    </button>
                                    <button
                                        onClick={handleManageSubscription}
                                        className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-primary transition-all flex items-center justify-center gap-2 opacity-50 hover:opacity-100 hover:scale-105"
                                    >
                                        <span>Já é assinante? Gerencie sua conta</span> <Icons.ExternalLink size={12} strokeWidth={2.5} />
                                    </button>
                                </div>

                                <div className="mt-10 flex items-center justify-center gap-6 opacity-20">
                                    <div className="h-px flex-1 bg-white/10" />
                                    <div className="flex gap-4">
                                        <Icons.ShieldCheck size={18} />
                                        <Icons.Lock size={18} />
                                    </div>
                                    <div className="h-px flex-1 bg-white/10" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

