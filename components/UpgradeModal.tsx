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
    currentPlan?: 'free' | 'start' | 'starter' | 'pro' | 'enterprise';
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, type, reason = 'depleted', currentPlan = 'free' }) => {
    useScrollLock(isOpen);
    const [loading, setLoading] = React.useState(false);

    const handleUpgrade = async () => {
        // Always redirect to pricing tab for upgrades
        onUpgrade();
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
        if ((currentPlan === 'basic' || currentPlan === 'trial') && reason === 'depleted') {
            return {
                title: 'Limite Atingido',
                description: 'Você usou todos os créditos do seu plano.',
                offer: 'Faça o upgrade para o Plano Profissional e tenha mais poder.',
                buttonText: 'Ver Plano Profissional',
                icon: <Icons.TrendingUp size={40} className="text-primary" strokeWidth={2.5} />
            };
        }

        if (reason === 'user_action') {
            return {
                title: 'Potencialize seus Resultados',
                description: 'Desbloqueie todo o poder da inteligência artificial.',
                offer: 'Assine o Plano Básico por R$ 297 e libere 150 créditos mensais.',
                buttonText: 'Fazer Upgrade para Básico',
                icon: <Icons.Rocket size={40} className="text-primary" strokeWidth={2.5} />
            };
        }

        return {
            title: `Seus créditos de ${type === 'search' ? 'Busca' : 'IA'} acabaram!`,
            description: 'Você atingiu o limite do seu plano atual.',
            offer: 'Assine o Plano Básico por R$ 297 para liberar 150 créditos mensais.',
            buttonText: 'Liberar Créditos Agora',
            icon: <Icons.Lock size={40} className="text-primary" strokeWidth={2.5} />
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
                                <div className="w-24 h-24 bg-background-card rounded-[2rem] shadow-2xl flex items-center justify-center mb-8 mx-auto border-2 border-white/10 ring-8 ring-white/5 relative group transition-all duration-500 hover:scale-110">
                                    <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-xl opacity-50 transition-opacity group-hover:opacity-100" />
                                    <div className="relative z-10 transition-transform duration-500 group-hover:rotate-12 flex items-center justify-center">
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

