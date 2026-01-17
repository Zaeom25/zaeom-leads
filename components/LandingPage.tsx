import React from 'react';
import { Icons } from './Icons';
import { motion } from 'framer-motion';

interface LandingPageProps {
    onLoginClick: () => void;
}

export function LandingPage({ onLoginClick }: LandingPageProps) {
    const scrollToPricing = () => {
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToFeatures = () => {
        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    };

    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.5 }
    };

    return (
        <div className="min-h-screen bg-background-main text-text-primary font-sans overflow-x-hidden selection:bg-primary/30">

            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-primary/5 rounded-full blur-[120px] mix-blend-screen opacity-30" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-secondary/5 rounded-full blur-[120px] mix-blend-screen opacity-30" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            {/* Navbar */}
            <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
                <div className="bg-background-card/80 backdrop-blur-xl border border-white/5 rounded-full px-6 py-3 flex items-center justify-between gap-10 shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-cta flex items-center justify-center font-bold text-primary-foreground shadow-button-glow">
                            Z
                        </div>
                        <span className="font-heading font-bold text-lg tracking-tight">Zaeom<span className="text-primary">Leads</span></span>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-text-secondary">
                        <button onClick={scrollToFeatures} className="hover:text-primary transition-colors">Funcionalidades</button>
                        <button onClick={scrollToPricing} className="hover:text-primary transition-colors">Preços</button>
                        <button onClick={onLoginClick} className="hover:text-primary transition-colors">Entrar</button>
                    </div>

                    <button
                        onClick={scrollToPricing}
                        className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-xs uppercase tracking-widest font-bold hover:brightness-110 transition-all shadow-button-glow"
                    >
                        Começar Agora
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 pt-40 pb-20 px-6">
                <div className="max-w-5xl mx-auto text-center flex flex-col items-center">

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-8 hover:border-primary/50 transition-colors cursor-default"
                    >
                        <Icons.Sparkles size={12} className="animate-pulse" />
                        <span>O Futuro das Vendas B2B</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="font-heading text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1] mb-8"
                    >
                        Qualifique Leads<br />
                        <span className="text-primary">Em Segundos.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg md:text-xl text-text-secondary max-w-2xl mb-10 leading-relaxed"
                    >
                        Esqueça as planilhas. Use a <strong className="text-text-primary font-bold">Zaeom AI</strong> para encontrar, enriquecer e fechar negócios com seus clientes ideais instantaneamente.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-16"
                    >
                        <button
                            onClick={scrollToPricing}
                            className="px-8 py-4 bg-gradient-cta rounded-full text-primary-foreground font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-button-glow hover:scale-105 active:scale-95"
                        >
                            Começar Agora
                        </button>
                        <button
                            onClick={onLoginClick}
                            className="px-8 py-4 bg-transparent border border-white/10 rounded-full text-text-primary font-bold text-sm uppercase tracking-widest hover:bg-white/5 transition-all outline-none"
                        >
                            Ver Demo
                        </button>
                    </motion.div>

                    {/* Social Proof */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-30 grayscale"
                    >
                        {/* Placeholders for logos (Generic Shapes) */}
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-6 w-24 bg-white/20 rounded" />
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Interface Mockup */}
            <section className="relative z-10 pb-32 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-6xl mx-auto relative"
                >
                    {/* Glow Behind */}
                    <div className="absolute inset-0 bg-gradient-cta blur-[100px] opacity-20" />

                    {/* Main Card */}
                    <div className="relative bg-background-main rounded-3xl border border-white/10 shadow-2xl overflow-hidden ring-1 ring-white/5">
                        {/* Header */}
                        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-background-card">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/20" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                                <div className="w-3 h-3 rounded-full bg-green-500/20" />
                            </div>
                            <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] uppercase font-bold text-text-secondary tracking-wider">
                                Zaeom CRM v2.0
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 grid grid-cols-3 gap-6 min-h-[500px] bg-background-main">
                            {/* Column 1 */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                    <span className="text-xs font-bold text-text-secondary uppercase">Novos Leads</span>
                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">12</span>
                                </div>
                                <div className="bg-background-card p-4 rounded-xl border border-white/5 shadow-lg">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-cta" />
                                        <div>
                                            <div className="w-20 h-2 bg-white/10 rounded mb-1" />
                                            <div className="w-12 h-1.5 bg-white/5 rounded" />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="px-2 py-1 rounded bg-white/5 text-[9px] text-text-secondary font-bold uppercase tracking-wider">SaaS</div>
                                        <div className="px-2 py-1 rounded bg-white/5 text-[9px] text-text-secondary font-bold uppercase tracking-wider">B2B</div>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2 */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                    <span className="text-xs font-bold text-text-secondary uppercase">Em Negociação</span>
                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">4</span>
                                </div>
                                <div className="bg-background-card p-4 rounded-xl border border-primary/30 shadow-lg relative group">
                                    <div className="absolute -right-2 -top-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold animate-bounce shadow-lg shadow-primary/20">1</div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-cta" />
                                        <div>
                                            <div className="w-24 h-2 bg-white/10 rounded mb-1" />
                                            <div className="w-16 h-1.5 bg-white/5 rounded" />
                                        </div>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-full h-1 mt-3 overflow-hidden">
                                        <div className="w-[60%] h-full bg-gradient-cta" />
                                    </div>
                                </div>
                            </div>

                            {/* Column 3 */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                    <span className="text-xs font-bold text-text-secondary uppercase">Venda Fechada</span>
                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">8</span>
                                </div>
                                <div className="bg-background-card p-4 rounded-xl border border-primary/20 shadow-lg">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                            <Icons.Check size={14} />
                                        </div>
                                        <span className="text-xs font-bold text-primary">Contrato Assinado</span>
                                    </div>
                                    <div className="text-xl font-bold text-text-primary">R$ 4.500,00</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating Notifications */}
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -right-8 top-12 bg-background-card p-4 rounded-xl border border-white/10 shadow-xl flex items-center gap-3 z-20"
                    >
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Icons.DollarSign size={20} />
                        </div>
                        <div>
                            <div className="text-[10px] text-text-secondary font-bold uppercase">Nova Receita</div>
                            <div className="text-sm font-bold text-text-primary">+ R$ 47,00</div>
                        </div>
                    </motion.div>
                </motion.div>
            </section>

            {/* Bento Grid Features */}
            <section id="features" className="py-24 px-6 bg-background-main">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="font-heading text-4xl md:text-5xl font-black mb-6">Tudo que você precisa.<br /><span className="text-primary">Em um só lugar.</span></h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <motion.div {...fadeIn} className="bg-background-card p-8 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                                <Icons.Target size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Busca de Precisão</h3>
                            <p className="text-text-secondary text-sm leading-relaxed">
                                Filtre leads qualificados por nicho, localização exata e tamanho da empresa. Acesse dados que não estão no Google.
                            </p>
                        </motion.div>

                        <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="bg-background-card p-8 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary mb-6">
                                <Icons.Zap size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Enriquecimento de Dados</h3>
                            <p className="text-text-secondary text-sm leading-relaxed">
                                Nossa IA varre a web para encontrar e-mails, telefones e tomadores de decisão em segundos.
                            </p>
                        </motion.div>

                        <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="bg-background-card p-8 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                                <Icons.PieChart size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Pipeline Visual</h3>
                            <p className="text-text-secondary text-sm leading-relaxed">
                                Gerencie suas oportunidades em um Kanban intuitivo. Arraste, solte e nunca perca um follow-up.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* How It Works (Vertical) */}
            <section className="py-24 px-6 bg-background-main">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="font-heading text-4xl font-black mb-4">Como Funciona</h2>
                        <div className="h-1 w-20 bg-gradient-cta mx-auto rounded-full" />
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                step: '01',
                                title: 'Localize',
                                desc: 'Defina seu cliente ideal (ICP) por nicho e cidade.',
                                icon: Icons.MapPin
                            },
                            {
                                step: '02',
                                title: 'Enriqueça',
                                desc: 'A Zaeom AI encontra os contatos dos tomadores de decisão.',
                                icon: Icons.Sparkles
                            },
                            {
                                step: '03',
                                title: 'Conecte-se',
                                desc: 'Exporte para CSV ou gerencie diretamente no nosso CRM.',
                                icon: Icons.MessageCircle
                            }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center gap-6 bg-background-card p-6 rounded-2xl border border-white/5"
                            >
                                <div className="text-4xl font-black text-white/5 select-none">{item.step}</div>
                                <div className="w-12 h-12 bg-background-main rounded-full flex items-center justify-center text-primary border border-white/5 shrink-0">
                                    <item.icon size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-text-primary mb-1">{item.title}</h3>
                                    <p className="text-text-secondary text-sm">{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section (Card Style) */}
            <section id="pricing" className="py-24 px-6 bg-background-main relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-background-main to-background-card/50" />

                <div className="max-w-lg mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="bg-background-card rounded-[2.5rem] p-8 md:p-12 border border-white/10 shadow-2xl relative"
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-cta px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-button-glow">
                            Oferta Limitada
                        </div>

                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-bold mb-2 text-text-primary">Zaeom Pro</h3>
                            <div className="flex justify-center items-end gap-1 mb-4">
                                <span className="text-5xl font-black text-text-primary">R$ 47</span>
                                <span className="text-text-secondary font-medium mb-1">/mês</span>
                            </div>
                            <p className="text-text-secondary text-sm">Acesso completo a todas as ferramentas de prospecção e CRM.</p>
                        </div>

                        <div className="space-y-4 mb-10">
                            {[
                                'Buscas Ilimitadas',
                                'Enriquecimento de Leads con IA',
                                'CRM Integrado (Kanban)',
                                'Exportação de Dados',
                                'Suporte Prioritário'
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-3 text-text-secondary text-sm">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <Icons.CheckCircle2 size={14} />
                                    </div>
                                    {feature}
                                </div>
                            ))}
                        </div>

                        <a
                            href="https://buy.stripe.com/test_aEU3cd8H148a0SI7ss"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center py-4 bg-gradient-cta rounded-xl text-white font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-button-glow hover:shadow-lg hover:-translate-y-1"
                        >
                            Assinar Agora
                        </a>

                        <p className="text-center text-[10px] text-text-secondary mt-6 uppercase tracking-wider">
                            7 Dias de Garantia • Cancele a qualquer momento
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative bg-primary text-primary-foreground overflow-hidden py-12">
                {/* Tape Pattern */}
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#000,#000_10px,transparent_10px,transparent_20px)] opacity-5" />

                <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 font-bold uppercase tracking-widest text-[10px]">
                    <div className="flex items-center gap-2 font-black tracking-tighter text-2xl">
                        <Icons.Activity size={24} /> ZaeomLeads
                    </div>
                    <div>
                        © 2025 Zaeom Studio. Todos os direitos reservados.
                    </div>
                </div>
            </footer>
        </div>
    );
}
