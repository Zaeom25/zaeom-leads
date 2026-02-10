import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';

interface SalesPageProps {
    onLoginClick: () => void;
}

export function SalesPage({ onLoginClick }: SalesPageProps) {
    const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

    const toggleAccordion = (index: number) => {
        setActiveAccordion(activeAccordion === index ? null : index);
    };

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <div className="min-h-screen bg-background-main text-text-primary font-sans overflow-x-hidden selection:bg-primary/30">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-primary/5 rounded-full blur-[120px] mix-blend-screen opacity-20 animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-blue-500/5 rounded-full blur-[120px] mix-blend-screen opacity-20 animate-pulse" style={{ animationDuration: '10s' }} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 transition-all duration-300">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('hero')}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-cta flex items-center justify-center font-bold text-primary-foreground shadow-lg shadow-primary/20">
                            <Icons.Activity size={20} className="text-white" />
                        </div>
                        <span className="font-heading font-bold text-xl tracking-tight hidden md:block">Zaeom<span className="text-primary">Leads</span></span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 bg-background-card/50 backdrop-blur-md border border-white/5 px-8 py-3 rounded-full shadow-xl">
                        <button onClick={() => scrollToSection('features')} className="text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-primary transition-colors">Recursos</button>
                        <button onClick={() => scrollToSection('how-it-works')} className="text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-primary transition-colors">Como Funciona</button>
                        <button onClick={() => scrollToSection('pricing')} className="text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-primary transition-colors">Preços</button>
                        <button onClick={() => scrollToSection('faq')} className="text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-primary transition-colors">FAQ</button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onLoginClick}
                            className="hidden md:block text-xs font-bold uppercase tracking-widest text-text-primary hover:text-primary transition-colors"
                        >
                            Entrar
                        </button>
                        <button
                            onClick={onLoginClick}
                            className="btn-primary px-6 py-2.5 rounded-xl shadow-button-glow hover:scale-105 transition-transform"
                        >
                            Começar Grátis
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section id="hero" className="relative z-10 pt-48 pb-32 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={staggerContainer}
                        className="text-left"
                    >
                        <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-8 hover:bg-white/10 transition-colors">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            Nova Geração de Prospecção B2B
                        </motion.div>

                        <motion.h1 variants={fadeInUp} className="font-heading text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                            Encontre Clientes Ideais em <span className="text-transparent bg-clip-text bg-gradient-cta">Segundos.</span>
                        </motion.h1>

                        <motion.p variants={fadeInUp} className="text-lg text-text-secondary leading-relaxed mb-10 max-w-xl">
                            A plataforma completa para times de vendas modernos.
                            Localize, enriqueça e gerencie leads qualificados com o poder da Inteligência Artificial.
                            <br /><span className="text-primary font-bold">Sem planilhas, sem perda de tempo.</span>
                        </motion.p>

                        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={onLoginClick}
                                className="px-8 py-4 bg-gradient-cta rounded-xl text-primary-foreground font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-button-glow hover:shadow-lg hover:-translate-y-1 flex items-center justify-center gap-3"
                            >
                                <Icons.Rocket size={18} />
                                Testar Agora
                            </button>
                            <button
                                onClick={() => scrollToSection('features')}
                                className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-text-primary font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 group"
                            >
                                <Icons.PlayCircle size={18} className="text-text-secondary group-hover:text-primary transition-colors" />
                                Ver Demonstração
                            </button>
                        </motion.div>

                        <motion.div variants={fadeInUp} className="mt-12 flex items-center gap-8 text-text-secondary text-xs font-bold uppercase tracking-wider opacity-60">
                            <div className="flex items-center gap-2">
                                <Icons.Check size={14} className="text-primary" />
                                Sem cartão de crédito
                            </div>
                            <div className="flex items-center gap-2">
                                <Icons.Check size={14} className="text-primary" />
                                Setup instantâneo
                            </div>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="relative hidden lg:block"
                    >
                        <div className="absolute inset-0 bg-gradient-cta blur-[120px] opacity-20" />
                        <div className="relative bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-2 ring-1 ring-white/5 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-700">
                            {/* Abstract UI Representation */}
                            <div className="bg-background-main rounded-xl border border-white/5 h-[500px] overflow-hidden flex flex-col">
                                {/* Header */}
                                <div className="h-14 border-b border-white/5 flex items-center px-6 gap-4">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/20" />
                                    </div>
                                    <div className="flex-1 bg-white/5 h-8 rounded-lg ml-4" />
                                </div>
                                {/* Body */}
                                <div className="flex-1 p-6 flex gap-6">
                                    {/* Sidebar */}
                                    <div className="w-16 flex flex-col gap-4">
                                        {[1, 2, 3, 4].map(i => <div key={i} className="w-10 h-10 rounded-lg bg-white/5" />)}
                                    </div>
                                    {/* Content */}
                                    <div className="flex-1 space-y-4">
                                        <div className="flex gap-4">
                                            <div className="flex-1 h-32 rounded-xl bg-white/5 border border-white/5 p-4">
                                                <div className="w-8 h-8 rounded-full bg-gradient-cta mb-3" />
                                                <div className="w-20 h-2 bg-white/20 rounded mb-2" />
                                                <div className="text-2xl font-bold">1,240 <span className="text-xs font-medium text-text-secondary">Leads</span></div>
                                            </div>
                                            <div className="flex-1 h-32 rounded-xl bg-white/5 border border-white/5 p-4">
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 mb-3" />
                                                <div className="w-20 h-2 bg-white/20 rounded mb-2" />
                                                <div className="text-2xl font-bold">85% <span className="text-xs font-medium text-text-secondary">Enriquecidos</span></div>
                                            </div>
                                        </div>
                                        <div className="h-full bg-white/5 rounded-xl border border-white/5" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Badge */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -left-12 bottom-20 bg-background-card border border-white/10 p-4 rounded-xl shadow-xl flex items-center gap-4 z-20"
                        >
                            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                                <Icons.TrendingUp size={24} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase text-text-secondary">Taxa de Conversão</div>
                                <div className="text-xl font-bold text-white">+142%</div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Social Proof */}
            <section className="py-12 border-y border-white/5 bg-white/[0.02]">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-8">Empresas que escalam com Zaeom</p>
                    <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                        {['NVIDIA', 'Spotify', 'Slack', 'Intercom', 'Notion'].map((brand, i) => (
                            <span key={i} className="text-xl font-black text-white">{brand}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl font-black mb-6"
                        >
                            Ferramentas de Elite.<br /><span className="text-primary">Resultados Reais.</span>
                        </motion.h2>
                        <p className="text-text-secondary max-w-2xl mx-auto text-lg">
                            Dê adeus à prospecção manual. Nossa suíte de ferramentas automatiza 90% do seu trabalho pesado.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Icons.Globe,
                                title: "Busca Global",
                                desc: "Encontre empresas em qualquer lugar do mundo filtrando por nicho e localização com precisão cirúrgica.",
                                color: "text-blue-400"
                            },
                            {
                                icon: Icons.Sparkles,
                                title: "Enriquecimento AI",
                                desc: "Nossa IA investiga a web para encontrar e-mails verificados, telefones e decisores automaticamente.",
                                color: "text-primary"
                            },
                            {
                                icon: Icons.Layout,
                                title: "CRM Integrado",
                                desc: "Organize seus leads em um pipeline visual. Mova cards, agende follow-ups e nunca perca uma venda.",
                                color: "text-purple-400"
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.2 }}
                                className="group relative bg-background-card border border-white/5 p-8 rounded-3xl hover:border-white/20 transition-all duration-300 hover:-translate-y-2"
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center ${feature.color} mb-6 group-hover:scale-110 transition-transform`}>
                                    <feature.icon size={28} />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                                <p className="text-text-secondary leading-relaxed text-sm">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-32 px-6 bg-white/[0.02] relative">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="relative">
                            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/20 to-transparent" />

                            <div className="space-y-16">
                                {[
                                    {
                                        step: "01",
                                        title: "Defina o Alvo",
                                        desc: "Escolha o nicho (ex: Dentistas) e a localização. Nossa busca varre o Google Maps e bases de dados em tempo real."
                                    },
                                    {
                                        step: "02",
                                        title: "Ative a IA",
                                        desc: "Com um clique, o Zaeom Detective encontra contatos diretos, redes sociais e tecnologias do site."
                                    },
                                    {
                                        step: "03",
                                        title: "Feche Negócios",
                                        desc: "Envie leads prontos para o CRM, exporte para CSV ou conecte com sua ferramenta de email marketing."
                                    }
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -50 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.2 }}
                                        className="relative pl-24"
                                    >
                                        <div className="absolute left-0 top-0 w-16 h-16 rounded-full bg-background-main border-4 border-background-card flex items-center justify-center font-black text-xl text-primary z-10 shadow-xl shadow-primary/10">
                                            {item.step}
                                        </div>
                                        <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                                        <p className="text-text-secondary">{item.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="relative h-[600px] bg-background-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-cta/5" />
                            <div className="absolute inset-0 flex items-center justify-center text-text-secondary font-bold uppercase tracking-widest opacity-20 text-center">
                                Interface Demo<br />Animation Here
                            </div>
                            {/* Placeholder for a video or GIF demonstrating the flow */}
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-32 px-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black mb-6">Investimento Simples.</h2>
                    <p className="text-text-secondary mb-16">Escolha o plano ideal para o tamanho da sua operação.</p>

                    <div className="grid md:grid-cols-3 gap-8 items-center max-w-5xl mx-auto">
                        {/* Starter */}
                        <div className="p-8 bg-background-card border border-white/5 rounded-3xl hover:border-white/10 transition-colors">
                            <div className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">Starter</div>
                            <div className="text-4xl font-black mb-2">R$ 297<span className="text-sm font-medium text-text-secondary">/mês</span></div>
                            <p className="text-xs text-text-secondary mb-8">Para freelancers e iniciantes.</p>
                            <ul className="space-y-4 mb-8 text-left text-sm text-text-secondary">
                                <li className="flex items-center gap-3"><Icons.Check size={16} className="text-primary" /> 1.000 Buscas/mês</li>
                                <li className="flex items-center gap-3"><Icons.Check size={16} className="text-primary" /> 100 Enriquecimentos</li>
                                <li className="flex items-center gap-3"><Icons.Check size={16} className="text-primary" /> CRM Básico</li>
                            </ul>
                            <button onClick={onLoginClick} className="w-full py-4 rounded-xl border border-white/10 font-bold text-xs uppercase hover:bg-white/5 transition-colors">Começar</button>
                        </div>

                        {/* Pro (Featured) */}
                        <motion.div
                            initial={{ scale: 0.9 }}
                            whileInView={{ scale: 1 }}
                            className="p-10 bg-[#151515] border border-primary/50 rounded-[2.5rem] shadow-2xl shadow-primary/10 relative"
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-cta px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest text-background-main shadow-lg shadow-primary/20">Mais Popular</div>
                            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Profissional</div>
                            <div className="text-5xl font-black mb-2 text-white">R$ 597<span className="text-sm font-medium text-text-secondary">/mês</span></div>
                            <p className="text-xs text-text-secondary mb-8">Para times em crescimento.</p>
                            <ul className="space-y-4 mb-8 text-left text-sm font-medium">
                                <li className="flex items-center gap-3 text-white"><Icons.Check size={16} className="text-primary" /> 5.000 Buscas/mês</li>
                                <li className="flex items-center gap-3 text-white"><Icons.Check size={16} className="text-primary" /> 1.000 Enriquecimentos</li>
                                <li className="flex items-center gap-3 text-white"><Icons.Check size={16} className="text-primary" /> CRM Avançado</li>
                                <li className="flex items-center gap-3 text-white"><Icons.Check size={16} className="text-primary" /> Exportação CSV</li>
                            </ul>
                            <button onClick={onLoginClick} className="w-full py-4 rounded-xl bg-gradient-cta text-background-main font-bold text-xs uppercase hover:brightness-110 shadow-lg shadow-primary/20 transition-all">Assinar Agora</button>
                        </motion.div>

                        {/* Scale */}
                        <div className="p-8 bg-background-card border border-white/5 rounded-3xl hover:border-white/10 transition-colors">
                            <div className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">Scale</div>
                            <div className="text-4xl font-black mb-2">R$ 900<span className="text-sm font-medium text-text-secondary">/mês</span></div>
                            <p className="text-xs text-text-secondary mb-8">Para agências e power users.</p>
                            <ul className="space-y-4 mb-8 text-left text-sm text-text-secondary">
                                <li className="flex items-center gap-3"><Icons.Check size={16} className="text-primary" /> 15.000 Buscas/mês</li>
                                <li className="flex items-center gap-3"><Icons.Check size={16} className="text-primary" /> 3.000 Enriquecimentos</li>
                                <li className="flex items-center gap-3"><Icons.Check size={16} className="text-primary" /> API Access</li>
                            </ul>
                            <button onClick={onLoginClick} className="w-full py-4 rounded-xl border border-white/10 font-bold text-xs uppercase hover:bg-white/5 transition-colors">Falar com Consultor</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="py-24 px-6 bg-white/[0.02]">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-black mb-12 text-center">Perguntas Frequentes</h2>
                    <div className="space-y-4">
                        {[
                            { q: "Os dados são atualizados?", a: "Sim. Realizamos buscas em tempo real no Google Maps e cruzamos com dezenas de bases de dados públicas para garantir a informação mais recente." },
                            { q: "Posso cancelar quando quiser?", a: "Absolutamente. Você não tem fidelidade nenhuma e pode cancelar sua assinatura diretamente no painel com um clique." },
                            { q: "Funciona para qualquer nicho?", a: "Sim! Desde que o negócio tenha presença digital (Google Maps, Site, Redes Sociais), conseguimos encontrar e enriquecer os dados." },
                            { q: "Existe limite de usuários?", a: "No plano Profissional e Scale, você pode adicionar membros ao seu time sem custo adicional." }
                        ].map((item, i) => (
                            <div key={i} className="border border-white/5 rounded-2xl bg-background-card overflow-hidden">
                                <button
                                    onClick={() => toggleAccordion(i)}
                                    className="w-full px-6 py-5 flex items-center justify-between text-left font-bold hover:bg-white/5 transition-colors"
                                >
                                    {item.q}
                                    <Icons.ChevronDown className={`transition-transform ${activeAccordion === i ? 'rotate-180' : ''}`} size={20} />
                                </button>
                                <AnimatePresence>
                                    {activeAccordion === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-6 text-text-secondary text-sm leading-relaxed">
                                                {item.a}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-32 px-6 text-center">
                <div className="max-w-4xl mx-auto relative">
                    <div className="absolute inset-0 bg-gradient-cta blur-[150px] opacity-10" />
                    <h2 className="text-5xl md:text-7xl font-black mb-8 relative z-10">Pronto para a <br />escala?</h2>
                    <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto relative z-10">Junte-se a centenas de empresas que modernizaram seu processo de vendas com a Zaeom.</p>
                    <button
                        onClick={onLoginClick}
                        className="relative z-10 px-12 py-6 bg-white text-black rounded-full font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-2xl"
                    >
                        Criar Conta Grátis
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 text-center text-[10px] text-text-secondary font-bold uppercase tracking-widest text-[#333]">
                <div className="flex justify-center gap-6 mb-8 opacity-50">
                    <a href="#" className="hover:text-primary">Termos</a>
                    <a href="#" className="hover:text-primary">Privacidade</a>
                    <a href="#" className="hover:text-primary">Contato</a>
                </div>
                <p>© 2026 Zaeom Studio. Feito com energia.</p>
            </footer>
        </div>
    );
}
